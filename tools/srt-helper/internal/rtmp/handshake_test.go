package rtmp

import (
	"net"
	"testing"
	"time"
)

// A minimal server that completes the classic RTMP handshake, letting the
// client handshake be verified byte-for-byte.
func handshakeServer(t *testing.T, conn net.Conn) {
	t.Helper()
	c0 := make([]byte, 1)
	if _, err := conn.Read(c0); err != nil {
		t.Errorf("read C0: %v", err)
		return
	}
	if c0[0] != HandshakeVersion {
		t.Errorf("C0 version: %d", c0[0])
	}
	c1 := make([]byte, HandshakeLength)
	if _, err := readFullHelper(conn, c1); err != nil {
		t.Errorf("read C1: %v", err)
		return
	}
	// S0 + S1.
	body, err := RandomBody()
	if err != nil {
		t.Errorf("random: %v", err)
		return
	}
	if _, err := conn.Write(append([]byte{HandshakeVersion}, body...)); err != nil {
		t.Errorf("write S0S1: %v", err)
		return
	}
	// C2 echoes S1.
	c2 := make([]byte, HandshakeLength)
	if _, err := readFullHelper(conn, c2); err != nil {
		t.Errorf("read C2: %v", err)
		return
	}
	// The echoed random data must match what we sent as S1.
	if !bytesEqual(c2[8:], body[8:]) {
		t.Error("C2 did not echo the S1 random data")
	}
	// S2 echoes C1's payload with the time fields.
	s2 := make([]byte, HandshakeLength)
	copy(s2, c1)
}

func readFullHelper(conn net.Conn, b []byte) (int, error) {
	total := 0
	for total < len(b) {
		n, err := conn.Read(b[total:])
		total += n
		if err != nil {
			return total, err
		}
	}
	return total, nil
}

func bytesEqual(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestHandshakeSequence(t *testing.T) {
	c, s := net.Pipe()
	defer c.Close()
	defer s.Close()

	done := make(chan struct{})
	go func() {
		handshakeServer(t, s)
		close(done)
	}()

	rtt, err := Handshake(c, false)
	if err != nil {
		t.Fatalf("handshake: %v", err)
	}
	if rtt < 0 {
		t.Fatalf("rtt must not be negative: %v", rtt)
	}
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("server did not finish the handshake")
	}
}

func TestHandshakeRejectsBadVersion(t *testing.T) {
	c, s := net.Pipe()
	defer c.Close()
	defer s.Close()
	go func() {
		// C0 + C1 from the client, then a wrong S0.
		buf := make([]byte, 1+HandshakeLength)
		readFullHelper(s, buf)
		s.Write([]byte{0x99})
	}()
	_, err := Handshake(c, false)
	if err == nil {
		t.Fatal("expected a version rejection")
	}
}

func TestRandomBodyShape(t *testing.T) {
	body, err := RandomBody()
	if err != nil {
		t.Fatalf("random: %v", err)
	}
	if len(body) != HandshakeLength {
		t.Fatalf("length: %d", len(body))
	}
	// Zero field must be zero.
	for _, b := range body[4:8] {
		if b != 0 {
			t.Fatal("zero field is not zero")
		}
	}
}
