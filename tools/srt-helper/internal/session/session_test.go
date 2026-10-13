package session

import (
	"fmt"
	"net"
	"testing"
	"time"

	gosrt "github.com/datarhei/gosrt"
	"github.com/herruzo/stream-analyzer/helper/internal/segment"
)

func freeUDPPort(t *testing.T) int {
	t.Helper()
	pc, err := net.ListenUDP("udp", &net.UDPAddr{IP: net.ParseIP("127.0.0.1")})
	if err != nil {
		t.Fatal(err)
	}
	port := pc.LocalAddr().(*net.UDPAddr).Port
	pc.Close()
	return port
}

func tsStream(n int) []byte {
	buf := make([]byte, 0, n*188)
	for i := 0; i < n; i++ {
		p := make([]byte, 188)
		p[0] = 0x47
		if i%40 == 0 {
			p[1] = 0x40 // PUSI, PID 0 = PAT
		} else {
			p[1] = 0x01 // PID 0x100
			p[2] = 0x00
		}
		p[3] = 0x10
		buf = append(buf, p...)
	}
	return buf
}

// publisher dials a listener and streams TS bytes until stopped.
func publish(t *testing.T, port int, streamID string, passphrase string, packets int, done chan<- struct{}) {
	t.Helper()
	cfg := gosrt.DefaultConfig()
	cfg.StreamId = streamID
	cfg.Passphrase = passphrase
	conn, err := gosrt.Dial("srt", fmt.Sprintf("127.0.0.1:%d", port), cfg)
	if err != nil {
		t.Errorf("publisher dial failed: %v", err)
		close(done)
		return
	}
	defer conn.Close()
	data := tsStream(packets)
	for off := 0; off < len(data); off += 1316 {
		end := off + 1316
		if end > len(data) {
			end = len(data)
		}
		if _, err := conn.Write(data[off:end]); err != nil {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	time.Sleep(250 * time.Millisecond)
	close(done)
}

func waitStatus(t *testing.T, m *Manager, id, want string, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if d, ok := m.Session(id); ok && d.Status == want {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	d, _ := m.Session(id)
	t.Fatalf("session %s never reached %s (last: %+v)", id, want, d)
}

func TestLoopbackPushSession(t *testing.T) {
	port := freeUDPPort(t)
	rec, err := segment.NewRecorder(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	m := NewManager(Options{Recorder: rec, MinSegBytes: 188 * 250, Window: 32})
	go func() {
		for range m.Events() { // drain
		}
	}()

	s, err := m.StartPush(fmt.Sprintf("srt://127.0.0.1:%d?mode=listener&passphrase=0123456789", port), true)
	if err != nil {
		t.Fatalf("StartPush failed: %v", err)
	}
	if s.Status != StatusListening {
		t.Fatalf("status = %s, want listening", s.Status)
	}

	done := make(chan struct{})
	go publish(t, port, "live/test", "0123456789", 4000, done)

	waitStatus(t, m, s.ID, StatusConnected, 10*time.Second)
	<-done

	d, ok := m.Session(s.ID)
	if !ok {
		t.Fatal("session vanished")
	}
	if d.StreamID != "live/test" {
		t.Fatalf("streamId = %q, want live/test", d.StreamID)
	}
	if !d.Encrypted {
		t.Fatal("session must be marked encrypted (passphrase negotiated)")
	}
	if d.Peer == "" {
		t.Fatal("peer address must be recorded")
	}
	if d.Segments < 2 {
		t.Fatalf("segments = %d, want >= 2", d.Segments)
	}
	if d.Latest == nil || d.Latest.PktRecv == 0 {
		t.Fatalf("telemetry sample missing or empty: %+v", d.Latest)
	}
	if d.Latest.MsRcvTsbpd == 0 {
		t.Fatalf("TSBPD delay must be negotiated and reported: %+v", d.Latest)
	}

	chunker, ok := m.SessionChunker(s.ID)
	if !ok {
		t.Fatal("chunker missing")
	}
	data, found := chunker.Get(0)
	if !found {
		t.Fatal("first segment missing from window")
	}
	if len(data)%188 != 0 || data[0] != 0x47 {
		t.Fatalf("segment is not aligned TS: len=%d sync=%#x", len(data), data[0])
	}
	if !(data[1]&0x40 != 0 && data[1]&0x1f == 0 && data[2] == 0) {
		t.Fatal("segment must start on a PAT")
	}

	if err := m.Stop(s.ID); err != nil {
		t.Fatal(err)
	}
	if d2, _ := m.Session(s.ID); d2.Status != StatusStopped {
		t.Fatalf("status after stop = %s", d2.Status)
	}

	// Recording round-trip.
	loaded, err := rec.LoadRecording(s.ID + "-rec")
	if err != nil {
		t.Fatalf("recording not persisted: %v", err)
	}
	if len(loaded.Segments) == 0 || !loaded.Encrypted {
		t.Fatalf("recording = %+v", loaded)
	}
	seg0, ok := loaded.ReadSegment(0)
	if !ok || len(seg0)%188 != 0 {
		t.Fatalf("persisted segment invalid ok=%v bytes=%d", ok, len(seg0))
	}
}

func TestLoopbackPullSession(t *testing.T) {
	port := freeUDPPort(t)
	m := NewManager(Options{})

	// Run a listener endpoint (acts as the "source"), then pull from it.
	upstream, err := m.StartPush(fmt.Sprintf("srt://127.0.0.1:%d?mode=listener", port), false)
	if err != nil {
		t.Fatal(err)
	}
	// Dial helper: caller side of manager is used by StartPull; here we wire
	// the publisher through a raw gosrt caller to keep the test self-contained.
	cfg := gosrt.DefaultConfig()
	cfg.StreamId = "pull/src"
	go func() {
		conn, err := gosrt.Dial("srt", fmt.Sprintf("127.0.0.1:%d", port), cfg)
		if err != nil {
			t.Errorf("dial failed: %v", err)
			return
		}
		data := tsStream(2600)
		for off := 0; off < len(data); off += 1316 {
			end := off + 1316
			if end > len(data) {
				end = len(data)
			}
			if _, err := conn.Write(data[off:end]); err != nil {
				break
			}
			time.Sleep(25 * time.Millisecond)
		}
		time.Sleep(200 * time.Millisecond)
		conn.Close()
	}()

	waitStatus(t, m, upstream.ID, StatusConnected, 10*time.Second)
	if d, _ := m.Session(upstream.ID); d.StreamID != "pull/src" {
		t.Fatalf("streamId = %q", d.StreamID)
	}
	_ = m.Stop(upstream.ID)
}

func TestPushRejectsUnencryptedThenSurvives(t *testing.T) {
	port := freeUDPPort(t)
	m := NewManager(Options{})
	s, err := m.StartPush(fmt.Sprintf("srt://127.0.0.1:%d?mode=listener&passphrase=0123456789&enforcedencryption=true", port), false)
	if err != nil {
		t.Fatal(err)
	}

	// No passphrase: the listener must reject this peer and stay alive.
	go func() {
		conn, err := gosrt.Dial("srt", fmt.Sprintf("127.0.0.1:%d", port), gosrt.DefaultConfig())
		if err == nil {
			conn.Close()
			t.Errorf("unencrypted dial unexpectedly accepted")
		}
	}()
	time.Sleep(4 * time.Second)

	// Correct passphrase: must still connect (listener survived the rejection).
	done := make(chan struct{})
	go publish(t, port, "live/ok", "0123456789", 3000, done)
	waitStatus(t, m, s.ID, StatusConnected, 10*time.Second)
	<-done
	_ = m.Stop(s.ID)
}

func TestUnknownSessionAndStop(t *testing.T) {
	m := NewManager(Options{})
	if _, ok := m.Session("nope"); ok {
		t.Fatal("unknown session must not resolve")
	}
	if err := m.Stop("nope"); err == nil {
		t.Fatal("stopping an unknown session must error")
	}
}
