// Package session owns SRT session lifecycle: caller dials (pull),
// listeners (push), the read pump that feeds the TS chunker, telemetry
// sampling, and recording wiring. A manager guards a set of sessions and
// publishes events for the control plane to fan out to the browser.
package session

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"sync"
	"time"

	gosrt "github.com/datarhei/gosrt"
	"github.com/herruzo/stream-analyzer/helper/internal/segment"
	"github.com/herruzo/stream-analyzer/helper/internal/srturl"
	"github.com/herruzo/stream-analyzer/helper/internal/telemetry"
)

// Session modes.
const (
	ModePull = "pull" // SRT caller: connect out to a source
	ModePush = "push" // SRT listener: accept an incoming publisher
)

// Session statuses.
const (
	StatusConnecting = "connecting"
	StatusConnected  = "connected"
	StatusListening  = "listening" // push: bound and waiting for a publisher
	StatusStopping   = "stopping"
	StatusStopped    = "stopped"
	StatusError      = "error"
)

// Event types emitted on the manager event channel.
const (
	EventSession   = "session"
	EventTelemetry = "telemetry"
	EventSegment   = "segment"
)

// Event is a control-plane notification.
type Event struct {
	Type      string          `json:"type"`
	SessionID string          `json:"sessionId,omitempty"`
	Data      json.RawMessage `json:"data,omitempty"`
	TS        int64           `json:"ts"`
}

// Session is a live or stopped analysis session.
type Session struct {
	ID       string `json:"id"`
	Mode     string `json:"mode"`
	Status   string `json:"status"`
	URL      string `json:"url"` // always the redacted form
	Error    string `json:"error,omitempty"`
	RecordID string `json:"recordingId,omitempty"`

	Peer        string `json:"peer,omitempty"`
	StreamID    string `json:"streamId,omitempty"`
	HSVersion   uint32 `json:"hsVersion,omitempty"`
	Encrypted   bool   `json:"encrypted"`
	TsbpdRecvMs uint64 `json:"tsbpdRecvMs,omitempty"`
	TsbpdSendMs uint64 `json:"tsbpdSendMs,omitempty"`

	StartedAt   time.Time  `json:"startedAt"`
	ConnectedAt *time.Time `json:"connectedAt,omitempty"`
	StoppedAt   *time.Time `json:"stoppedAt,omitempty"`

	Latest *telemetry.Sample `json:"latest,omitempty"`

	mu         sync.Mutex
	chunker    *segment.Chunker
	conn       gosrt.Conn // active publisher/pull connection, if any
	listener   gosrt.Listener
	handshakes *HandshakeLedger
	stopCh     chan struct{}
	stopOnce   sync.Once
	opts       *srturl.Options
	pass       string
	recording  bool
}

// Summary is the API projection of a session.
type Summary struct {
	ID          string            `json:"id"`
	Mode        string            `json:"mode"`
	Status      string            `json:"status"`
	URL         string            `json:"url"`
	Error       string            `json:"error,omitempty"`
	RecordID    string            `json:"recordingId,omitempty"`
	Peer        string            `json:"peer,omitempty"`
	StreamID    string            `json:"streamId,omitempty"`
	Encrypted   bool              `json:"encrypted"`
	StartedAt   time.Time         `json:"startedAt"`
	ConnectedAt *time.Time        `json:"connectedAt,omitempty"`
	Segments    int               `json:"segments"`
	Bytes       int               `json:"bytes"`
	Latest      *telemetry.Sample `json:"latest,omitempty"`
}

// SummaryJSON exposes the API-facing projection (summary is internal).
func (s *Session) SummaryJSON() Summary { return s.summary() }

func (s *Session) summary() Summary {
	s.mu.Lock()
	defer s.mu.Unlock()
	count, nbytes, _ := s.chunker.Stats()
	sum := Summary{
		ID: s.ID, Mode: s.Mode, Status: s.Status, URL: s.URL, Error: s.Error,
		RecordID: s.RecordID, Peer: s.Peer, StreamID: s.StreamID,
		Encrypted: s.Encrypted, StartedAt: s.StartedAt,
		ConnectedAt: s.ConnectedAt, Segments: count, Bytes: nbytes,
		Latest: s.Latest,
	}
	return sum
}

// Detail is the API projection with negotiated parameters.
type Detail struct {
	Summary
	HSVersion   uint32 `json:"hsVersion,omitempty"`
	TsbpdRecvMs uint64 `json:"tsbpdRecvMs,omitempty"`
	TsbpdSendMs uint64 `json:"tsbpdSendMs,omitempty"`
}

func (s *Session) detail() Detail {
	sum := s.summary()
	s.mu.Lock()
	defer s.mu.Unlock()
	return Detail{
		Summary:     sum,
		HSVersion:   s.HSVersion,
		TsbpdRecvMs: s.TsbpdRecvMs,
		TsbpdSendMs: s.TsbpdSendMs,
	}
}

// Manager tracks sessions and emits events.
type Manager struct {
	mu       sync.Mutex
	sessions map[string]*Session
	recorder *segment.Recorder
	nextID   int
	events   chan Event
	minSeg   int
	window   int
	started  time.Time
}

// Options configures a Manager.
type Options struct {
	Recorder    *segment.Recorder // nil disables recording
	MinSegBytes int
	Window      int
	EventBuffer int
	// MaxRecordBytes truncates recordings at a disk budget (0 = unlimited).
	MaxRecordBytes int64
}

// NewManager builds a manager. A nil recorder disables recording support.
func NewManager(opts Options) *Manager {
	if opts.MinSegBytes <= 0 {
		opts.MinSegBytes = segment.DefaultMinSegBytes
	}
	if opts.Window <= 0 {
		opts.Window = segment.DefaultWindow
	}
	if opts.EventBuffer <= 0 {
		opts.EventBuffer = 256
	}
	return &Manager{
		sessions: map[string]*Session{},
		recorder: opts.Recorder,
		events:   make(chan Event, opts.EventBuffer),
		minSeg:   opts.MinSegBytes,
		window:   opts.Window,
		started:  time.Now(),
	}
}

// Events exposes the manager event stream.
func (m *Manager) Events() <-chan Event { return m.events }

// Stats reports manager-wide counters for /health.
func (m *Manager) Stats() (sessions, active int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, s := range m.sessions {
		sessions++
		if s.Status == StatusConnected || s.Status == StatusListening {
			active++
		}
	}
	return sessions, active
}

// StartPull dials an SRT source (caller mode).
func (m *Manager) StartPull(rawURL string, record bool) (*Session, error) {
	opts, err := srturl.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	if opts.Mode == "listener" {
		return nil, fmt.Errorf("URL selects listener mode; start a push session instead")
	}

	s := m.newSession(ModePull, opts, record)

	cfg := configFromOptions(opts)
	conn, err := gosrt.Dial("srt", opts.DialAddr(), cfg)
	if err != nil {
		s.fail(fmt.Sprintf("dial failed: %v", err))
		m.emitSession(s)
		return s, err
	}

	s.mu.Lock()
	s.conn = conn
	s.Status = StatusConnected
	now := time.Now()
	s.ConnectedAt = &now
	s.StreamID = conn.StreamId()
	s.HSVersion = conn.Version()
	s.Encrypted = opts.HasPassphrase
	s.Peer = opts.DialAddr()
	s.mu.Unlock()
	s.handshakes.Record(HandshakeEvent{
		Kind: "connected", StreamID: conn.StreamId(), HSVersion: conn.Version(),
		Encrypted: opts.HasPassphrase, Peer: opts.DialAddr(), Note: "caller dial",
	})

	m.emitSession(s)
	if record {
		m.startRecording(s)
	}
	go m.pump(s, conn)
	return s, nil
}

// StartPush binds an SRT listener and accepts publishers.
func (m *Manager) StartPush(rawURL string, record bool) (*Session, error) {
	opts, err := srturl.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	if opts.Mode != "listener" {
		return nil, fmt.Errorf("URL selects caller mode; start a pull session instead")
	}
	addr, err := opts.ListenAddr()
	if err != nil {
		return nil, err
	}

	cfg := configFromOptions(opts)
	ln, err := gosrt.Listen("srt", addr, cfg)
	if err != nil {
		return nil, fmt.Errorf("listen on %s failed: %w", addr, err)
	}

	s := m.newSession(ModePush, opts, record)
	s.mu.Lock()
	s.listener = ln
	s.Status = StatusListening
	s.mu.Unlock()

	m.emitSession(s)
	go m.acceptLoop(s, ln, opts)
	return s, nil
}

func (m *Manager) newSession(mode string, opts *srturl.Options, record bool) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.nextID++
	c := segment.NewChunker()
	c.MinSegBytes = m.minSeg
	c.Window = m.window
	s := &Session{
		ID:         fmt.Sprintf("s%d", m.nextID),
		Mode:       mode,
		Status:     StatusConnecting,
		URL:        opts.Normalized(),
		StartedAt:  time.Now(),
		chunker:    c,
		handshakes: NewHandshakeLedger(200),
		stopCh:     make(chan struct{}),
		opts:       opts,
		pass:       opts.Passphrase,
		recording:  record,
	}
	m.sessions[s.ID] = s
	return s
}

func (m *Manager) acceptLoop(s *Session, ln gosrt.Listener, opts *srturl.Options) {
	for {
		select {
		case <-s.stopCh:
			return
		default:
		}
		req, err := ln.Accept2()
		if err != nil {
			if errors.Is(err, gosrt.ErrListenerClosed) || s.isStopping() {
				return
			}
			continue // transient handshake failure: keep listening
		}
		if req.IsEncrypted() {
			if opts.Passphrase == "" {
				req.Reject(gosrt.REJ_UNSECURE)
				s.handshakes.Record(HandshakeEvent{
					Kind: "rejected", Peer: req.RemoteAddr().String(),
					StreamID: req.StreamId(), HSVersion: req.Version(), Encrypted: true,
					Rejection: uint32(gosrt.REJ_UNSECURE), RejectionName: RejectionName(uint32(gosrt.REJ_UNSECURE)),
					Note: "encrypted publisher without configured passphrase",
				})
				continue
			}
			if err := req.SetPassphrase(opts.Passphrase); err != nil {
				req.Reject(gosrt.REJ_BADSECRET)
				s.handshakes.Record(HandshakeEvent{
					Kind: "rejected", Peer: req.RemoteAddr().String(),
					StreamID: req.StreamId(), HSVersion: req.Version(), Encrypted: true,
					Rejection: uint32(gosrt.REJ_BADSECRET), RejectionName: RejectionName(uint32(gosrt.REJ_BADSECRET)),
					Note: "passphrase mismatch",
				})
				continue
			}
		} else if opts.EnforcedEncr {
			req.Reject(gosrt.REJ_UNSECURE)
			s.handshakes.Record(HandshakeEvent{
				Kind: "rejected", Peer: req.RemoteAddr().String(),
				HSVersion: req.Version(), Rejection: uint32(gosrt.REJ_UNSECURE),
				RejectionName: RejectionName(uint32(gosrt.REJ_UNSECURE)),
				Note:          "unencrypted publisher refused (enforcedencryption)",
			})
			continue
		}
		conn, err := req.Accept()
		if err != nil {
			continue
		}
		m.attachPublisher(s, conn, req.StreamId(), req.Version(), req.RemoteAddr().String())
		go m.pump(s, conn)
	}
}

func (m *Manager) attachPublisher(
	s *Session,
	conn gosrt.Conn,
	streamID string,
	version uint32,
	peer string,
) {
	s.mu.Lock()
	old := s.conn // a new publisher replaces the old one (reconnect semantics)
	s.conn = conn
	now := time.Now()
	s.ConnectedAt = &now
	s.Peer = peer
	s.StreamID = streamID
	s.HSVersion = version
	s.Encrypted = conn != nil && s.pass != ""
	s.Status = StatusConnected
	s.Error = ""
	s.mu.Unlock()

	// Close the replaced connection outside the lock.
	if old != nil {
		_ = old.Close()
	}

	s.handshakes.Record(HandshakeEvent{
		Kind: "connected", Peer: peer, StreamID: streamID, HSVersion: version,
		Encrypted: s.pass != "", Note: "accepted publisher",
	})

	m.emitSession(s)
	if s.recording {
		m.startRecording(s)
	}
}

func (m *Manager) startRecording(s *Session) {
	if m.recorder == nil {
		return
	}
	recID := s.ID + "-rec"
	if _, err := m.recorder.StartRecording(recID, s.URL, s.StreamID, s.Peer, s.Encrypted); err != nil {
		return
	}
	s.mu.Lock()
	s.RecordID = recID
	s.chunker.OnSegment(func(index int, data []byte) {
		_ = m.recorder.AddSegment(recID, segment.Segment{Index: index, Bytes: len(data), Data: data})
	})
	s.mu.Unlock()
}

// pump reads from a connection into the chunker and samples telemetry.
func (m *Manager) pump(s *Session, conn gosrt.Conn) {
	var stats gosrt.Statistics
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	buf := make([]byte, 64*1024)
	for {
		select {
		case <-s.stopCh:
			return
		default:
		}

		_ = conn.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
		n, err := conn.Read(buf)
		if n > 0 {
			for _, seg := range s.chunker.Write(buf[:n]) {
				m.emit(Event{Type: EventSegment, SessionID: s.ID, TS: time.Now().UnixMilli(),
					Data: mustJSON(map[string]any{"index": seg.Index, "bytes": seg.Bytes})})
			}
		}
		select {
		case <-ticker.C:
			conn.Stats(&stats)
			sample := telemetry.FromGosrt(&stats, s.snapshotEncrypted())
			s.mu.Lock()
			s.Latest = sample
			s.mu.Unlock()
			m.emit(Event{Type: EventTelemetry, SessionID: s.ID, TS: time.Now().UnixMilli(),
				Data: mustJSON(sample)})
		default:
		}

		if err != nil {
			var netErr net.Error
			if errors.As(err, &netErr) && netErr.Timeout() {
				continue
			}
			break // real EOF/close: publisher went away
		}
	}

	// Publisher ended: flush the tail, keep listening if this is a push session.
	if tail := s.chunker.Flush(); tail != nil {
		m.emit(Event{Type: EventSegment, SessionID: s.ID, TS: time.Now().UnixMilli(),
			Data: mustJSON(map[string]any{"index": tail.Index, "bytes": tail.Bytes, "final": true})})
	}
	s.mu.Lock()
	s.conn = nil
	if s.Status != StatusStopping && s.Status != StatusStopped {
		if s.Mode == ModePush {
			s.Status = StatusListening
			s.ConnectedAt = nil
			s.Latest = nil
		} else {
			s.Status = StatusStopped
			now := time.Now()
			s.StoppedAt = &now
		}
	}
	s.mu.Unlock()
	m.emitSession(s)
}

func (s *Session) snapshotEncrypted() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.Encrypted
}

func (s *Session) isStopping() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.Status == StatusStopping || s.Status == StatusStopped
}

// Stop terminates a session and flushes everything analyzable.
func (m *Manager) Stop(id string) error {
	m.mu.Lock()
	s, ok := m.sessions[id]
	m.mu.Unlock()
	if !ok {
		return fmt.Errorf("unknown session %q", id)
	}
	s.stopOnce.Do(func() {
		s.mu.Lock()
		s.Status = StatusStopping
		conn := s.conn
		ln := s.listener
		s.mu.Unlock()
		if conn != nil {
			_ = conn.Close() // nil once the publisher already went away
		}
		if ln != nil {
			ln.Close()
		}
		close(s.stopCh)

		if tail := s.chunker.Flush(); tail != nil {
			m.emit(Event{Type: EventSegment, SessionID: s.ID, TS: time.Now().UnixMilli(),
				Data: mustJSON(map[string]any{"index": tail.Index, "bytes": tail.Bytes, "final": true})})
		}
		if s.RecordID != "" && m.recorder != nil {
			_ = m.recorder.Stop(s.RecordID)
		}
		s.mu.Lock()
		s.Status = StatusStopped
		now := time.Now()
		s.StoppedAt = &now
		s.mu.Unlock()
		m.emitSession(s)
	})
	return nil
}

// Sessions lists all known sessions.
func (m *Manager) Sessions() []Summary {
	m.mu.Lock()
	list := make([]*Session, 0, len(m.sessions))
	for _, s := range m.sessions {
		list = append(list, s)
	}
	m.mu.Unlock()
	out := make([]Summary, 0, len(list))
	for _, s := range list {
		out = append(out, s.summary())
	}
	return out
}

// Session returns the detail view of one session.
func (m *Manager) Session(id string) (Detail, bool) {
	m.mu.Lock()
	s, ok := m.sessions[id]
	m.mu.Unlock()
	if !ok {
		return Detail{}, false
	}
	return s.detail(), true
}

// SessionChunker exposes the live chunker of a session (playlist/chunk endpoints).
func (m *Manager) SessionChunker(id string) (*segment.Chunker, bool) {
	m.mu.Lock()
	s, ok := m.sessions[id]
	m.mu.Unlock()
	if !ok {
		return nil, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.chunker, true
}

// Recording exposes the recorder.
func (m *Manager) Recording() *segment.Recorder { return m.recorder }

// SessionHandshakes returns the handshake ledger of a session.
func (m *Manager) SessionHandshakes(id string) ([]HandshakeEvent, bool) {
	m.mu.Lock()
	s, ok := m.sessions[id]
	m.mu.Unlock()
	if !ok {
		return nil, false
	}
	s.mu.Lock()
	ledger := s.handshakes
	s.mu.Unlock()
	if ledger == nil {
		return nil, true
	}
	return ledger.Snapshot(), true
}

func (m *Manager) emitSession(s *Session) {
	m.emit(Event{Type: EventSession, SessionID: s.ID, TS: time.Now().UnixMilli(),
		Data: mustJSON(s.summary())})
}

func (m *Manager) emit(e Event) {
	select {
	case m.events <- e:
	default: // drop on overflow; SSE clients resync via /sessions
	}
}

func (s *Session) fail(msg string) {
	s.mu.Lock()
	s.Status = StatusError
	s.Error = msg
	now := time.Now()
	s.StoppedAt = &now
	s.mu.Unlock()
}

func mustJSON(v any) json.RawMessage {
	data, err := json.Marshal(v)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return json.RawMessage(data)
}

// configFromOptions maps validated URL options onto gosrt.Config.
func configFromOptions(o *srturl.Options) gosrt.Config {
	cfg := gosrt.DefaultConfig()
	cfg.StreamId = o.StreamID
	cfg.Passphrase = o.Passphrase
	if o.LatencyMS > 0 {
		cfg.Latency = time.Duration(o.LatencyMS) * time.Millisecond
	}
	if o.ReceiverLatMS > 0 {
		cfg.ReceiverLatency = time.Duration(o.ReceiverLatMS) * time.Millisecond
	}
	if o.PeerLatencyMS > 0 {
		cfg.PeerLatency = time.Duration(o.PeerLatencyMS) * time.Millisecond
	}
	if o.FC > 0 {
		cfg.FC = uint32(o.FC)
	}
	if o.MSS > 0 {
		cfg.MSS = uint32(o.MSS)
	}
	if o.PayloadSize > 0 {
		cfg.PayloadSize = uint32(o.PayloadSize)
	}
	if o.MaxBW > 0 {
		cfg.MaxBW = o.MaxBW
	}
	if o.InputBW > 0 {
		cfg.InputBW = o.InputBW
	}
	if o.OverheadBWPct > 0 {
		cfg.OverheadBW = int64(o.OverheadBWPct)
	}
	if o.PBKeylen > 0 {
		cfg.PBKeylen = o.PBKeylen
	}
	if o.ConnectionMS > 0 {
		cfg.ConnectionTimeout = time.Duration(o.ConnectionMS) * time.Millisecond
	}
	if o.PeerIdleMS > 0 {
		cfg.PeerIdleTimeout = time.Duration(o.PeerIdleMS) * time.Millisecond
	}
	if o.MinVersion > 0 {
		cfg.MinVersion = o.MinVersion
	}
	if o.KMRefreshRate > 0 {
		cfg.KMRefreshRate = o.KMRefreshRate
	}
	if o.KMPreAnnounce > 0 {
		cfg.KMPreAnnounce = o.KMPreAnnounce
	}
	if o.LossMaxTTL > 0 {
		cfg.LossMaxTTL = uint32(o.LossMaxTTL)
	}
	if o.Congestion != "" {
		cfg.Congestion = o.Congestion
	}
	cfg.TSBPDMode = true
	cfg.MessageAPI = false // buffer mode is required for TS byte-streaming
	cfg.EnforcedEncryption = o.EnforcedEncr
	if o.TooLateDrop {
		cfg.TooLatePacketDrop = true
	}
	return cfg
}
