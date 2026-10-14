package session

import (
	"fmt"
	"sync"
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/rtmp"
	"github.com/herruzo/stream-analyzer/helper/internal/rtmpurl"
	"github.com/herruzo/stream-analyzer/helper/internal/telemetry"
)

// ModeRtmp marks sessions backed by the RTMP pull client (the browser routes
// rtmp:// and rtmps:// URLs here instead of the SRT manifest/ façade path).
const ModeRtmp = "rtmp"

// rtmpRef holds an active RTMP client for the session lifetime.
type rtmpRef struct {
	conn  *rtmp.Session
	parts rtmpurl.Parts
	once  sync.Once
}

// close is idempotent so the session stop path and the read-loop teardown
// cannot double-close the underlying TCP connection.
func (r *rtmpRef) close() {
	r.once.Do(func() {
		if r.conn != nil {
			_ = r.conn.Close()
		}
	})
}

// newRtmpSession builds the session record for an RTMP source (no SRT
// options are involved).
func (m *Manager) newRtmpSession(parts rtmpurl.Parts, record bool) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.nextID++
	s := &Session{
		ID:         fmt.Sprintf("s%d", m.nextID),
		Mode:       ModeRtmp,
		Status:     StatusConnecting,
		URL:        parts.Raw,
		StartedAt:  time.Now(),
		handshakes: NewHandshakeLedger(200),
		stopCh:     make(chan struct{}),
		recording:  record,
		rtmp:       &rtmpRef{parts: parts},
	}
	m.sessions[s.ID] = s
	return s
}

// StartRtmpPull connects to an rtmp:// or rtmps:// source and pumps its
// counters into the same telemetry stream as SRT, so the shared monitor,
// rules and exports work unchanged.
func (m *Manager) StartRtmpPull(rawURL string, record bool) (*Session, error) {
	parts, err := rtmpurl.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("parse rtmp url: %w", err)
	}
	if parts.Playpath == "" {
		return nil, fmt.Errorf("rtmp URL needs a playpath: rtmp://host/app/stream")
	}

	s := m.newRtmpSession(parts, record)

	conn, err := rtmp.Dial(parts)
	if err != nil {
		s.fail(err.Error())
		m.emitSession(s)
		return s, err
	}

	s.mu.Lock()
	s.rtmp.conn = conn
	s.Status = StatusConnected
	now := time.Now()
	s.ConnectedAt = &now
	s.Encrypted = parts.Protocol == "rtmps"
	s.Peer = parts.Addr()
	s.mu.Unlock()

	m.emitSession(s)
	go m.pumpRtmp(s, conn)
	return s, nil
}

// pumpRtmp samples the RTMP counters once per second.
func (m *Manager) pumpRtmp(s *Session, conn *rtmp.Session) {
	var (
		prev   = rtmp.StatsSnapshot{}
		prevAt = time.Now()
	)
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-s.stopCh:
			return
		case <-conn.Done():
			s.fail(fmt.Sprintf("session ended: %v", conn.Err()))
			m.emitSession(s)
			return
		case now := <-ticker.C:
			cur := conn.Stats().Snapshot()
			sample := telemetry.FromRtmp(prev, cur, prevAt, now)
			prev = cur
			prevAt = now
			s.mu.Lock()
			s.Latest = &sample
			s.mu.Unlock()
			m.emit(Event{
				Type:      EventTelemetry,
				SessionID: s.ID,
				TS:        now.UnixMilli(),
				Data:      mustJSON(sample),
			})
		}
	}
}

// rtmpFor returns the RTMP client for a session id, if it has one.
func (m *Manager) rtmpFor(id string) (*rtmp.Session, bool) {
	m.mu.Lock()
	s, ok := m.sessions[id]
	m.mu.Unlock()
	if !ok {
		return nil, false
	}
	s.mu.Lock()
	ref := s.rtmp
	s.mu.Unlock()
	if ref == nil || ref.conn == nil {
		return nil, false
	}
	return ref.conn, true
}

// RtmpStats returns the RTMP counters for a session id (API detail view).
func (m *Manager) RtmpStats(id string) (rtmp.StatsSnapshot, bool) {
	conn, ok := m.rtmpFor(id)
	if !ok {
		return rtmp.StatsSnapshot{}, false
	}
	return conn.Stats().Snapshot(), true
}

// RtmpCommands returns the AMF0 command log for a session id (forensics UI).
func (m *Manager) RtmpCommands(id string) ([]rtmp.Command, bool) {
	conn, ok := m.rtmpFor(id)
	if !ok {
		return nil, false
	}
	return conn.Stats().Commands(), true
}
