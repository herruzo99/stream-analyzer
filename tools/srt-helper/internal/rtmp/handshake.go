package rtmp

// Handshake (§5.2): C0/C1/C2 and S0/S1/S2. The 1536-byte bodies carry the
// time fields that give the one-shot latency estimate RTMP allows — recorded
// as rtmp.handshakeRttMs on the telemetry sample.

import (
	"crypto/rand"
	"encoding/binary"
	"errors"
	"io"
	"net"
	"time"
)

// HandshakeError reports the stage where the exchange failed.
type HandshakeError struct {
	Stage string
	Err   error
}

func (e *HandshakeError) Error() string { return "rtmp handshake (" + e.Stage + "): " + e.Err.Error() }
func (e *HandshakeError) Unwrap() error { return e.Err }

func fail(stage string, err error) error { return &HandshakeError{Stage: stage, Err: err} }

// RandomBody produces a 1528-byte random payload plus the time/zero prefix.
func RandomBody() ([]byte, error) {
	body := make([]byte, HandshakeLength)
	binary.BigEndian.PutUint32(body[0:4], uint32(time.Now().UnixMilli())) // time
	// body[4:8] MUST be zero.
	if _, err := rand.Read(body[8:]); err != nil {
		return nil, err
	}
	return body, nil
}

// Handshake performs the client side of the RTMP handshake and returns the
// one-shot latency estimate in milliseconds (0 if the peer answered before
// the local clock ticked).
//
// Sequence: C0+C1, wait S0+S1, C2 (echoing S1), S2 expected but RTMP clients
// commonly continue without waiting for it — the caller decides via waitS2.
func Handshake(conn net.Conn, waitS2 bool) (rttMs float64, err error) {
	start := time.Now()

	if err := conn.SetDeadline(start.Add(10 * time.Second)); err != nil {
		return 0, fail("deadline", err)
	}

	// C0 + C1.
	body, err := RandomBody()
	if err != nil {
		return 0, fail("random", err)
	}
	c0 := []byte{HandshakeVersion}
	if err := writeFull(conn, c0); err != nil {
		return 0, fail("send C0", err)
	}
	if err := writeFull(conn, body); err != nil {
		return 0, fail("send C1", err)
	}

	// S0 + S1.
	s0 := make([]byte, 1)
	if _, err := io.ReadFull(conn, s0); err != nil {
		return 0, fail("read S0", err)
	}
	if s0[0] != HandshakeVersion {
		return 0, fail("read S0", errors.New("unsupported version "+itoa(int(s0[0]))))
	}
	s1 := make([]byte, HandshakeLength)
	if _, err := io.ReadFull(conn, s1); err != nil {
		return 0, fail("read S1", err)
	}
	if binary.BigEndian.Uint32(s1[4:8]) != 0 {
		return 0, fail("read S1", errors.New("zero field is not zero"))
	}

	// C2 echoes S1 with our read time; the peer computes our RTT from it.
	c2 := make([]byte, HandshakeLength)
	copy(c2, s1)
	readAt := time.Now()
	binary.BigEndian.PutUint32(c2[4:8], uint32(readAt.UnixMilli()))
	if err := writeFull(conn, c2); err != nil {
		return 0, fail("send C2", err)
	}

	if waitS2 {
		s2 := make([]byte, HandshakeLength)
		if _, err := io.ReadFull(conn, s2); err != nil {
			return 0, fail("read S2", err)
		}
		// The server echoes our C1 time in the first field.
		serverReadAt := int64(binary.BigEndian.Uint32(s2[4:8])) // when it read our C1
		c1At := int64(binary.BigEndian.Uint32(s2[0:4]))         // when we sent C1
		_ = c1At
		// C1->C2-observed is not a true RTT; use the interval between our
		// write of C1 and the server's reported read of it.
		if serverReadAt > 0 {
			rttMs = float64(serverReadAt - start.UnixMilli())
			if rttMs < 0 {
				rttMs = 0
			}
		}
	} else {
		// Best effort: how long the server took to answer C1 with S1.
		rttMs = float64(readAt.Sub(start).Microseconds()) / 1000.0
	}
	_ = conn.SetDeadline(time.Time{})
	return rttMs, nil
}

func writeFull(conn net.Conn, b []byte) error {
	for len(b) > 0 {
		n, err := conn.Write(b)
		if err != nil {
			return err
		}
		b = b[n:]
	}
	return nil
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	return string(buf[i:])
}
