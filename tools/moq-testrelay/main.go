// Command moq-testrelay is a purpose-built MOQT (draft-ietf-moq-transport-22)
// test relay for live verification of the browser client in
// src/infrastructure/moq/session.js. It speaks just enough of the wire
// protocol to exercise the full client path: SETUP exchange, SUBSCRIBE →
// SUBSCRIBE_OK, OBJECT_DATAGRAM delivery, and SUBGROUP stream delivery.
//
// The wire bytes are written literally here (an independent implementation
// from the JS codec) so a successful live test is genuine interop.
//
// Usage: moq-testrelay -addr :4443   (prints the TLS cert hash to embed)
package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/quic-go/quic-go"
	"github.com/quic-go/quic-go/http3"
	"github.com/quic-go/webtransport-go"
)

const catalogPayload = `{"version":"1.0","generatedAt":"2026-10-14T09:00:00Z","isComplete":true,"tracks":[{"namespace":"anon","name":"video.high","packaging":"loc","role":"video","isLive":true,"targetLatency":2000,"bitrate":5000000,"mimeType":"video/mp4","width":1920,"height":1080,"codec":"avc1.640028"},{"name":"audio.en","packaging":"loc","role":"audio","isLive":true,"targetLatency":2000,"bitrate":128000,"mimeType":"audio/mp4","samplerate":48000,"channels":2}]}`

// varint encodes per draft §8.1.
func varint(v uint64) []byte {
	switch {
	case v < 1<<7:
		return []byte{byte(v)}
	case v < 1<<14:
		return []byte{byte(0x80 | v>>8), byte(v)}
	case v < 1<<21:
		return []byte{byte(0xC0 | v>>16), byte(v >> 8), byte(v)}
	default:
		return []byte{byte(0xE0 | v>>24), byte(v >> 16), byte(v >> 8), byte(v)}
	}
}

// frame builds a length-prefixed control message.
func frame(msgType uint64, payload []byte) []byte {
	out := append(varint(msgType), 0, 0)
	binary.BigEndian.PutUint16(out[len(out)-2:], uint16(len(payload)))
	return append(out, payload...)
}

// readVarint reads one varint from a reader.
func readVarint(r io.Reader) (uint64, error) {
	first := []byte{0}
	if _, err := io.ReadFull(r, first); err != nil {
		return 0, err
	}
	size := 1
	if first[0] != 0 {
		mask := byte(0x80)
		for first[0]&mask != 0 && size < 9 {
			size++
			mask >>= 1
		}
	}
	rest := make([]byte, size-1)
	if _, err := io.ReadFull(r, rest); err != nil {
		return 0, err
	}
	firstBits := 8 - size
	if firstBits <= 0 {
		firstBits = 0
	}
	value := uint64(first[0] & ((1 << firstBits) - 1))
	for _, b := range rest {
		value = value<<8 | uint64(b)
	}
	return value, nil
}

func readBytes(r io.Reader, n int) ([]byte, error) {
	buf := make([]byte, n)
	_, err := io.ReadFull(r, buf)
	return buf, err
}

func logJSON(event string, fields map[string]any) {
	fields["event"] = event
	enc := json.NewEncoder(os.Stdout)
	_ = enc.Encode(fields)
}

func main() {
	addr := flag.String("addr", ":4443", "WebTransport/HTTP-3 listen address")
	spkiPath := flag.String("spki-out", "", "write the base64 SPKI hash of the server certificate to this file")
	flag.Parse()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		log.Fatalf("key: %v", err)
	}
	now := time.Now().UTC()
	tmpl := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "localhost"},
		NotBefore:    now.Add(-time.Hour),
		NotAfter:     now.Add(13 * 24 * time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		DNSNames:     []string{"localhost"},
		IPAddresses:  []net.IP{net.IPv4(127, 0, 0, 1), net.ParseIP("::1")},
	}
	der, err := x509.CreateCertificate(rand.Reader, &tmpl, &tmpl, &key.PublicKey, key)
	if err != nil {
		log.Fatalf("cert: %v", err)
	}
	sum := sha256.Sum256(der)
	fmt.Printf("CERT_HASH %s\n", base64.RawStdEncoding.EncodeToString(sum[:]))
	// SubjectPublicKeyInfo hash: the value Chrome's
	// --ignore-certificate-errors-spki-list expects.
	spki, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	if err != nil {
		log.Fatalf("spki: %v", err)
	}
	spkiSum := sha256.Sum256(spki)
	spkiHash := base64.StdEncoding.EncodeToString(spkiSum[:])
	if *spkiPath != "" {
		if err := os.WriteFile(*spkiPath, []byte(spkiHash), 0o644); err != nil {
			log.Fatalf("spki-out: %v", err)
		}
	}
	os.Stdout.Sync()

	tlsConf := &tls.Config{
		Certificates: []tls.Certificate{{Certificate: [][]byte{der}, PrivateKey: key}},
	}
	h3 := &http3.Server{
		Addr:      *addr,
		TLSConfig: http3.ConfigureTLSConfig(tlsConf),
		QUICConfig: &quic.Config{
			EnableDatagrams: true,
		},
	}
	webtransport.ConfigureHTTP3Server(h3)
	mux := http.NewServeMux()
	h3.Handler = mux

	s := webtransport.Server{H3: h3, CheckOrigin: func(*http.Request) bool { return true }}

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		sess, err := s.Upgrade(w, r)
		if err != nil {
			logJSON("upgrade-failed", map[string]any{"error": err.Error()})
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		logJSON("session", map[string]any{"protocol": sess.SessionState().ApplicationProtocol})
		go handleSession(sess)
	})

	logJSON("listening", map[string]any{"addr": *addr})
	if err := s.ListenAndServe(); err != nil {
		log.Fatalf("serve: %v", err)
	}
}

func handleSession(sess *webtransport.Session) {
	// Consume the client's control stream (SETUP).
	go func() {
		for {
			str, err := sess.AcceptUniStream(sess.Context())
			if err != nil {
				return
			}
			t, err := readVarint(str)
			if err != nil {
				continue
			}
			logJSON("client-stream", map[string]any{"firstVarint": t})
			if t != 0x2F00 {
				continue
			}
			lenb, err := readBytes(str, 2)
			if err != nil {
				continue
			}
			payload, err := readBytes(str, int(binary.BigEndian.Uint16(lenb)))
			if err != nil {
				continue
			}
			logJSON("peer-setup", map[string]any{"payloadBytes": len(payload)})
			// Answer with our own control stream: SETUP + zero options.
			out, err := sess.OpenUniStream()
			if err != nil {
				return
			}
			if _, err := out.Write(frame(0x2F00, nil)); err != nil {
				logJSON("setup-write-failed", map[string]any{"error": err.Error()})
			}
		}
	}()

	// Consume request (bidirectional) streams.
	for {
		str, err := sess.AcceptStream(sess.Context())
		if err != nil {
			return
		}
		go func() {
			t, err := readVarint(str)
			if err != nil {
				return
			}
			lenb, err := readBytes(str, 2)
			if err != nil {
				return
			}
			payload, err := readBytes(str, int(binary.BigEndian.Uint16(lenb)))
			if err != nil {
				return
			}
			logJSON("request", map[string]any{"type": t, "payloadBytes": len(payload)})
			if t != 0x03 { // SUBSCRIBE
				return
			}
			// SUBSCRIBE_OK: track alias 42, no params, no properties.
			ok := frame(0x04, append(varint(42), 0x00, 0x00))
			if _, err := str.Write(ok); err != nil {
				logJSON("subscribe-ok-failed", map[string]any{"error": err.Error()})
				return
			}
			logJSON("subscribe-ok", map[string]any{"trackAlias": 42})

			// Object in a QUIC datagram: 0x40 datagram | 0x04 ZERO_OBJECT_ID | 0x08 DEFAULT_PRIORITY.
			// Group 8 keeps this catalog object distinct from the subgroup's
			// group 7 objects (a location must not carry two payloads).
			dg := append([]byte{0x4C}, varint(42)...)
			dg = append(dg, varint(8)...)
			dg = append(dg, []byte(catalogPayload)...)
			if err := sess.SendDatagram(dg); err != nil {
				logJSON("datagram-failed", map[string]any{"error": err.Error()})
			} else {
				logJSON("datagram-sent", map[string]any{"bytes": len(dg)})
			}

			// Object stream: SUBGROUP_HEADER 0x10 | mode 0b10 (0x04) | END_OF_GROUP 0x08 | DEFAULT_PRIORITY 0x20.
			sub, err := sess.OpenUniStream()
			if err != nil {
				return
			}
			hdr := append([]byte{0x3C}, varint(42)...)
			hdr = append(hdr, varint(7)...)
			hdr = append(hdr, varint(0)...)
			if _, err := sub.Write(hdr); err != nil {
				logJSON("subgroup-header-failed", map[string]any{"error": err.Error()})
				return
			}
			for _, payload := range []string{"hello-", "moq-22"} {
				obj := append(varint(0), varint(uint64(len(payload)))...)
				obj = append(obj, []byte(payload)...)
				if _, err := sub.Write(obj); err != nil {
					logJSON("subgroup-object-failed", map[string]any{"error": err.Error()})
					return
				}
			}
			if err := sub.Close(); err != nil {
				logJSON("subgroup-close-failed", map[string]any{"error": err.Error()})
			} else {
				logJSON("subgroup-sent", map[string]any{"objects": 2})
			}
		}()
	}
}
