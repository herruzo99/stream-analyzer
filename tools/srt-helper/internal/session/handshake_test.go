package session

import (
	"fmt"
	"testing"
	"time"

	gosrt "github.com/datarhei/gosrt"
)

func TestHandshakeLedgerBounds(t *testing.T) {
	l := NewHandshakeLedger(3)
	for i := 0; i < 10; i++ {
		l.Record(HandshakeEvent{Kind: "rejected", Rejection: uint32(gosrt.REJ_UNSECURE)})
	}
	snap := l.Snapshot()
	if len(snap) != 3 {
		t.Fatalf("ledger size = %d, want 3", len(snap))
	}
	if snap[0].T == 0 {
		t.Fatal("timestamps must be filled")
	}
}

func TestRejectionNames(t *testing.T) {
	cases := map[uint32]string{
		uint32(gosrt.REJ_BADSECRET): "REJ_BADSECRET",
		uint32(gosrt.REJ_UNSECURE):  "REJ_UNSECURE",
		uint32(gosrt.REJ_ROGUE):     "REJ_ROGUE",
		9999:                        "",
	}
	for code, want := range cases {
		if got := RejectionName(code); got != want {
			t.Fatalf("RejectionName(%d) = %q, want %q", code, got, want)
		}
	}
}

func TestHandshakeForensicsRejectThenAccept(t *testing.T) {
	port := freeUDPPort(t)
	m := NewManager(Options{})
	s, err := m.StartPush(fmt.Sprintf("srt://127.0.0.1:%d?mode=listener&passphrase=0123456789&enforcedencryption=true", port), false)
	if err != nil {
		t.Fatal(err)
	}

	// Unencrypted publisher: rejected, rejection recorded.
	go func() {
		conn, err := gosrt.Dial("srt", fmt.Sprintf("127.0.0.1:%d", port), gosrt.DefaultConfig())
		if err == nil {
			conn.Close()
			t.Errorf("unencrypted dial unexpectedly accepted")
		}
	}()
	time.Sleep(4 * time.Second)

	// Correct publisher: accepted, success recorded.
	done := make(chan struct{})
	go publish(t, port, "forensics/live", "0123456789", 3000, done)
	waitStatus(t, m, s.ID, StatusConnected, 10*time.Second)
	<-done

	events, ok := m.SessionHandshakes(s.ID)
	if !ok {
		t.Fatal("handshakes missing for session")
	}
	var rejects, accepts int
	for _, ev := range events {
		switch ev.Kind {
		case "rejected":
			rejects++
			if ev.Rejection != uint32(gosrt.REJ_UNSECURE) {
				t.Fatalf("unexpected rejection code %d", ev.Rejection)
			}
			if ev.RejectionName != "REJ_UNSECURE" {
				t.Fatalf("rejection name = %q", ev.RejectionName)
			}
			if ev.Peer == "" {
				t.Fatal("rejection must record the peer address")
			}
		case "connected":
			accepts++
			if ev.StreamID != "forensics/live" {
				t.Fatalf("accept streamid = %q", ev.StreamID)
			}
		}
	}
	if rejects < 1 || accepts < 1 {
		t.Fatalf("expected reject+accept, got %d rejects, %d accepts", rejects, accepts)
	}
	_ = m.Stop(s.ID)
}

func TestHandshakesUnknownSession(t *testing.T) {
	m := NewManager(Options{})
	if _, ok := m.SessionHandshakes("nope"); ok {
		t.Fatal("unknown session must not resolve")
	}
}
