package session

import (
	"sync"
	"time"
)

// HandshakeEvent is one SRT handshake attempt on a session (capability plan
// Tier-2 #6). It captures the data an SRT engineer needs when an encoder
// "won't connect": which peer asked, with what streamid/handshake version,
// whether encryption was negotiated, and — on rejection — the exact SRT
// rejection reason code.
type HandshakeEvent struct {
	T         int64  `json:"t"` // epoch ms
	Kind      string `json:"kind"`
	Peer      string `json:"peer,omitempty"`
	StreamID  string `json:"streamId,omitempty"`
	HSVersion uint32 `json:"hsVersion,omitempty"`
	Encrypted bool   `json:"encrypted"`
	// Rejection carries the SRT rejection reason code + name when a peer was
	// rejected (SRT_REJ_*).
	Rejection     uint32 `json:"rejection,omitempty"`
	RejectionName string `json:"rejectionName,omitempty"`
	Note          string `json:"note,omitempty"`
}

// Rejection reason names (libSRT access_control.h subset, names stable).
var rejectionNames = map[uint32]string{
	1000: "REJ_UNKNOWN", 1001: "REJ_SYSTEM", 1002: "REJ_PEER", 1003: "REJ_RESOURCE",
	1004: "REJ_ROGUE", 1005: "REJ_BACKLOG", 1006: "REJ_IPE", 1007: "REJ_CLOSE",
	1008: "REJ_VERSION", 1009: "REJ_RDVCOOKIE", 1010: "REJ_BADSECRET",
	1011: "REJ_UNSECURE", 1012: "REJ_MESSAGEAPI", 1013: "REJ_CONGESTION",
	1014: "REJ_FILTER", 1015: "REJ_GROUP",
	1400: "REJX_BAD_REQUEST", 1401: "REJX_UNAUTHORIZED", 1402: "REJX_OVERLOAD",
	1403: "REJX_FORBIDDEN", 1405: "REJX_BAD_MODE", 1415: "REJX_NOTSUP_MEDIA",
}

// RejectionName maps an SRT rejection code to its stable name.
func RejectionName(code uint32) string {
	if name, ok := rejectionNames[code]; ok {
		return name
	}
	return ""
}

// HandshakeLedger is a bounded, thread-safe log of handshake events.
type HandshakeLedger struct {
	mu     sync.Mutex
	events []HandshakeEvent
	max    int
}

// NewHandshakeLedger builds a ledger retaining at most max events.
func NewHandshakeLedger(max int) *HandshakeLedger {
	if max <= 0 {
		max = 200
	}
	return &HandshakeLedger{max: max}
}

// Record appends an event, dropping the oldest beyond the bound.
func (l *HandshakeLedger) Record(ev HandshakeEvent) {
	if ev.T == 0 {
		ev.T = time.Now().UnixMilli()
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.events = append(l.events, ev)
	if len(l.events) > l.max {
		l.events = append([]HandshakeEvent(nil), l.events[len(l.events)-l.max:]...)
	}
}

// Snapshot returns a copy of the ledger.
func (l *HandshakeLedger) Snapshot() []HandshakeEvent {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]HandshakeEvent(nil), l.events...)
}
