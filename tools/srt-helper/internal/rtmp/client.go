package rtmp

// RTMP client session: handshake, chunk stream, command lifecycle
// (connect → createStream → play), FLV tag demux, and the counters that feed
// telemetry. Wire details live in url.go, handshake.go, chunk.go, amf0.go,
// writer.go.

import (
	"encoding/binary"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/rtmpurl"
)

// Command is one AMF0 command observed on the control channel, kept for
// session forensics.
type Command struct {
	Direction   string   `json:"direction"` // client | server
	Name        string   `json:"name"`      // connect | _result | _error | onStatus | ...
	StreamID    float64  `json:"transactionId"`
	Fields      []string `json:"fields"` // object keys, in order
	At          int64    `json:"atMs"`
	Code        float64  `json:"code,omitempty"`
	Level       string   `json:"level,omitempty"`
	Description string   `json:"description,omitempty"`
}

type codecCounter struct {
	Count uint64 `json:"count"`
	Bytes uint64 `json:"bytes"`
}

// Stats are the session counters the telemetry layer reads. Guarded by mu.
type Stats struct {
	mu sync.Mutex

	BytesRecvTotal uint64 `json:"bytesRecvTotal"`
	BytesSentTotal uint64 `json:"bytesSentTotal"`
	ChunkCount     uint64 `json:"chunkCount"`
	MessageCount   uint64 `json:"messageCount"`
	AudioTags      uint64 `json:"audioTags"`
	VideoTags      uint64 `json:"videoTags"`
	ScriptTags     uint64 `json:"scriptTags"`
	AudioBytes     uint64 `json:"audioBytes"`
	VideoBytes     uint64 `json:"videoBytes"`

	AckSequence     uint64  `json:"ackSequence"`
	WindowAckSize   uint32  `json:"windowAckSize"`
	PeerBandwidth   uint32  `json:"peerBandwidth"`
	NegotiatedChunk uint32  `json:"negotiatedChunkSize"`
	ServerChunkSize uint32  `json:"serverChunkSize"`
	HandshakeRTTMs  float64 `json:"handshakeRttMs"`

	VideoCodecs        map[uint32]*codecCounter `json:"videoCodecs"`
	AudioCodecs        map[uint32]*codecCounter `json:"audioCodecs"`
	Keyframes          uint64                   `json:"videoKeyframes"`
	Metadata           map[string]any           `json:"onMetaData,omitempty"`
	MetadataSeen       bool                     `json:"metadataSeen"`
	S1ZeroFieldNonZero bool                     `json:"s1ZeroFieldNonZero,omitempty"`

	commands     []Command
	messageTypes map[byte]uint64
}

// StatsSnapshot is a mutex-free copy of the counters, safe to serialize.
type StatsSnapshot struct {
	BytesRecvTotal uint64 `json:"bytesRecvTotal"`
	BytesSentTotal uint64 `json:"bytesSentTotal"`
	ChunkCount     uint64 `json:"chunkCount"`
	MessageCount   uint64 `json:"messageCount"`
	AudioTags      uint64 `json:"audioTags"`
	VideoTags      uint64 `json:"videoTags"`
	ScriptTags     uint64 `json:"scriptTags"`
	AudioBytes     uint64 `json:"audioBytes"`
	VideoBytes     uint64 `json:"videoBytes"`

	AckSequence     uint64  `json:"ackSequence"`
	WindowAckSize   uint32  `json:"windowAckSize"`
	PeerBandwidth   uint32  `json:"peerBandwidth"`
	NegotiatedChunk uint32  `json:"negotiatedChunkSize"`
	ServerChunkSize uint32  `json:"serverChunkSize"`
	HandshakeRTTMs  float64 `json:"handshakeRttMs"`

	VideoCodecs        map[uint32]*codecCounter `json:"videoCodecs"`
	AudioCodecs        map[uint32]*codecCounter `json:"audioCodecs"`
	Keyframes          uint64                   `json:"videoKeyframes"`
	Metadata           map[string]any           `json:"onMetaData,omitempty"`
	MetadataSeen       bool                     `json:"metadataSeen"`
	S1ZeroFieldNonZero bool                     `json:"s1ZeroFieldNonZero,omitempty"`
}

// Snapshot copies the counters under the lock, deep-copying the codec maps.
func (s *Stats) Snapshot() StatsSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := StatsSnapshot{
		BytesRecvTotal:     s.BytesRecvTotal,
		BytesSentTotal:     s.BytesSentTotal,
		ChunkCount:         s.ChunkCount,
		MessageCount:       s.MessageCount,
		AudioTags:          s.AudioTags,
		VideoTags:          s.VideoTags,
		ScriptTags:         s.ScriptTags,
		AudioBytes:         s.AudioBytes,
		VideoBytes:         s.VideoBytes,
		AckSequence:        s.AckSequence,
		WindowAckSize:      s.WindowAckSize,
		PeerBandwidth:      s.PeerBandwidth,
		NegotiatedChunk:    s.NegotiatedChunk,
		ServerChunkSize:    s.ServerChunkSize,
		HandshakeRTTMs:     s.HandshakeRTTMs,
		Keyframes:          s.Keyframes,
		MetadataSeen:       s.MetadataSeen,
		S1ZeroFieldNonZero: s.S1ZeroFieldNonZero,
	}
	out.VideoCodecs = map[uint32]*codecCounter{}
	for k, v := range s.VideoCodecs {
		out.VideoCodecs[k] = &codecCounter{Count: v.Count, Bytes: v.Bytes}
	}
	out.AudioCodecs = map[uint32]*codecCounter{}
	for k, v := range s.AudioCodecs {
		out.AudioCodecs[k] = &codecCounter{Count: v.Count, Bytes: v.Bytes}
	}
	if s.MetadataSeen {
		out.Metadata = s.Metadata
	}
	return out
}

// Commands returns a copy of the recorded command log.
func (s *Stats) Commands() []Command {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Command, len(s.commands))
	copy(out, s.commands)
	return out
}

func (s *Stats) countMessage(t byte) {
	if s.messageTypes == nil {
		s.messageTypes = map[byte]uint64{}
	}
	s.messageTypes[t]++
}

func (s *Stats) recordCommand(c Command) {
	s.commands = append(s.commands, c)
}

// FLVTag is a demuxed media or script tag (matching the FLV container).
type FLVTag struct {
	Type    byte   `json:"type"` // 8 audio, 9 video, 18 script
	DTS     uint32 `json:"dts"`
	Length  uint32 `json:"length"`
	Payload []byte `json:"-"`

	// Video header fields (type 9).
	FrameType byte `json:"frameType,omitempty"`
	CodecID   byte `json:"codecId,omitempty"`

	// Audio header fields (type 8).
	SoundFormat byte `json:"soundFormat,omitempty"`
	SoundRate   byte `json:"soundRate,omitempty"`
	SoundSize   byte `json:"soundSize,omitempty"`
	SoundType   byte `json:"soundType,omitempty"`

	// Script tags carry onMetaData objects.
	ScriptName string         `json:"scriptName,omitempty"`
	MetaData   map[string]any `json:"metaData,omitempty"`
}

// Session is one RTMP pull session.
type Session struct {
	URL rtmpurl.Parts

	conn   net.Conn
	reader *Reader
	writer *Writer

	chunkStreamID uint32 // our command chunk stream (3, like Flash)
	msgStreamID   uint32
	txnCounter    float64

	stats *Stats

	OnTag     func(tag FLVTag)
	OnCommand func(c Command)
	OnState   func(state string)

	closed chan struct{}
	once   sync.Once
	err    error
}

// Dial opens a session to the URL and runs the command lifecycle.
func Dial(parts rtmpurl.Parts) (*Session, error) {
	s := &Session{
		URL:           parts,
		chunkStreamID: 3,
		stats:         &Stats{},
		closed:        make(chan struct{}),
	}

	conn, err := net.DialTimeout("tcp", parts.Addr(), 10*time.Second)
	if err != nil {
		return nil, errConn{parts.Addr(), err}
	}
	s.conn = conn

	rtt, outcome, err := Handshake(conn)
	if err != nil {
		conn.Close()
		return nil, err
	}
	s.stats.mu.Lock()
	s.stats.HandshakeRTTMs = rtt
	s.stats.S1ZeroFieldNonZero = outcome.S1ZeroFieldNonZero
	s.stats.NegotiatedChunk = DefaultChunkSize
	s.stats.ServerChunkSize = DefaultChunkSize
	s.stats.mu.Unlock()

	s.reader = NewReader(conn)
	s.writer = NewWriter(conn)

	// Announce our acknowledgement behaviour and a larger outbound chunk size,
	// exactly like the classic Flash player did (128 → 4096 cuts overhead).
	// Set Peer Bandwidth is what librtmp/FMLE send before the connect gets
	// answered by Wowza-family servers.
	if err := s.writer.SetPeerBandwidth(8_000_000); err != nil {
		conn.Close()
		return nil, err
	}
	if err := s.writer.WindowAckSize(2_500_000); err != nil {
		conn.Close()
		return nil, err
	}
	if err := s.writer.SetChunkSize(4096); err != nil {
		conn.Close()
		return nil, err
	}
	s.stats.mu.Lock()
	s.stats.NegotiatedChunk = 4096
	s.stats.mu.Unlock()

	go s.readLoop()
	if err := s.connect(); err != nil {
		if readErr := s.Err(); readErr != nil {
			err = fmt.Errorf("%w (read loop: %v)", err, readErr)
		}
		s.Close()
		return nil, err
	}
	if err := s.createStream(); err != nil {
		s.Close()
		return nil, err
	}
	if err := s.play(); err != nil {
		s.Close()
		return nil, err
	}
	return s, nil
}

type errConn struct {
	addr string
	err  error
}

func (e errConn) Error() string { return "rtmp dial " + e.addr + ": " + e.err.Error() }
func (e errConn) Unwrap() error { return e.err }

// Close tears the session down.
func (s *Session) Close() error {
	s.once.Do(func() {
		close(s.closed)
		if s.conn != nil {
			s.conn.Close()
		}
	})
	return nil
}

// Done reports when the session ended.
func (s *Session) Done() <-chan struct{} { return s.closed }

// Err returns the terminal read error, if any.
func (s *Session) Err() error { return s.err }

// Stats exposes the counters.
func (s *Session) Stats() *Stats { return s.stats }

func (s *Session) readLoop() {
	for {
		msg, err := s.reader.ReadMessage()
		if err != nil {
			select {
			case <-s.closed:
				return
			default:
			}
			s.err = err
			if s.OnState != nil {
				s.OnState("error")
			}
			s.Close()
			return
		}
		s.stats.mu.Lock()
		s.stats.MessageCount++
		s.stats.BytesRecvTotal += uint64(msg.MessageLength)
		s.stats.countMessage(msg.MessageType)
		s.stats.mu.Unlock()
		s.stats.mu.Lock()
		s.stats.ChunkCount = s.reader.ChunksRead
		s.stats.mu.Unlock()

		switch msg.MessageType {
		case MsgWindowAckSize:
			if len(msg.Payload) == 4 {
				v := binary.BigEndian.Uint32(msg.Payload)
				s.stats.mu.Lock()
				s.stats.WindowAckSize = v
				s.stats.mu.Unlock()
			}
		case MsgSetPeerBW:
			if len(msg.Payload) >= 4 {
				v := binary.BigEndian.Uint32(msg.Payload)
				s.stats.mu.Lock()
				s.stats.PeerBandwidth = v
				s.stats.mu.Unlock()
			}
		case MsgAudio, MsgVideo:
			tag := FLVTag{
				Type: msg.MessageType, DTS: msg.Timestamp,
				Length: msg.MessageLength, Payload: msg.Payload,
			}
			if tag.Type == MsgVideo && len(tag.Payload) > 0 {
				tag.FrameType = tag.Payload[0] >> 4
				tag.CodecID = tag.Payload[0] & 0x0f
				if tag.FrameType == 1 {
					s.stats.mu.Lock()
					s.stats.Keyframes++
					s.stats.mu.Unlock()
				}
			}
			if tag.Type == MsgAudio && len(tag.Payload) > 0 {
				b := tag.Payload[0]
				tag.SoundFormat = b >> 4
				tag.SoundRate = (b >> 2) & 0x03
				tag.SoundSize = (b >> 1) & 0x01
				tag.SoundType = b & 0x01
			}
			s.accountTag(tag)
			if s.OnTag != nil {
				s.OnTag(tag)
			}
		case MsgDataAMF0:
			tag := FLVTag{
				Type: msg.MessageType, DTS: msg.Timestamp,
				Length: msg.MessageLength, Payload: msg.Payload,
			}
			s.parseScriptTag(&tag)
			s.accountTag(tag)
			if s.OnTag != nil {
				s.OnTag(tag)
			}
		case MsgCommandAMF0:
			c := s.parseCommand(msg.Payload, "server")
			if c != nil && s.OnCommand != nil {
				s.OnCommand(*c)
			}
		}
	}
}

func (s *Session) accountTag(tag FLVTag) {
	s.stats.mu.Lock()
	switch tag.Type {
	case MsgAudio:
		s.stats.AudioTags++
		s.stats.AudioBytes += uint64(tag.Length)
		if s.stats.AudioCodecs == nil {
			s.stats.AudioCodecs = map[uint32]*codecCounter{}
		}
		c := s.stats.AudioCodecs[uint32(tag.SoundFormat)]
		if c == nil {
			c = &codecCounter{}
			s.stats.AudioCodecs[uint32(tag.SoundFormat)] = c
		}
		c.Count++
		c.Bytes += uint64(tag.Length)
	case MsgVideo:
		s.stats.VideoTags++
		s.stats.VideoBytes += uint64(tag.Length)
		if s.stats.VideoCodecs == nil {
			s.stats.VideoCodecs = map[uint32]*codecCounter{}
		}
		c := s.stats.VideoCodecs[uint32(tag.CodecID)]
		if c == nil {
			c = &codecCounter{}
			s.stats.VideoCodecs[uint32(tag.CodecID)] = c
		}
		c.Count++
		c.Bytes += uint64(tag.Length)
	case MsgDataAMF0:
		s.stats.ScriptTags++
	}
	s.stats.mu.Unlock()
}

// parseScriptTag decodes "name" + value pairs; only onMetaData is inspected.
func (s *Session) parseScriptTag(tag *FLVTag) {
	d := NewDecoder(tag.Payload)
	name, err := d.Decode()
	if err != nil || name.Marker != MarkerString {
		return
	}
	tag.ScriptName = name.Str
	if tag.ScriptName != "onMetaData" {
		return
	}
	v, err := d.Decode()
	if err != nil || v.Marker != MarkerObject {
		return
	}
	meta := map[string]any{}
	for _, k := range v.Object.Keys() {
		val, _ := v.Object.Get(k)
		switch val.Marker {
		case MarkerNumber:
			meta[k] = val.Number
		case MarkerBoolean:
			meta[k] = val.Boolean
		default:
			meta[k] = val.String()
		}
	}
	tag.MetaData = meta
	s.stats.mu.Lock()
	if !s.stats.MetadataSeen {
		s.stats.Metadata = meta
		s.stats.MetadataSeen = true
	}
	s.stats.mu.Unlock()
}

// parseCommand decodes an AMF0 command message into the forensics record.
func (s *Session) parseCommand(payload []byte, direction string) *Command {
	d := NewDecoder(payload)
	name, err := d.Decode()
	if err != nil || name.Marker != MarkerString {
		return nil
	}
	tx, err := d.Decode()
	if err != nil || tx.Marker != MarkerNumber {
		return nil
	}
	c := &Command{
		Direction: direction,
		Name:      name.Str,
		StreamID:  tx.Number,
		At:        time.Now().UnixMilli(),
	}
	if obj, err := d.Decode(); err == nil && obj.Marker == MarkerObject {
		c.Fields = append([]string(nil), obj.Object.Keys()...)
		for _, k := range obj.Object.Keys() {
			v, _ := obj.Object.Get(k)
			switch strings.ToLower(k) {
			case "code":
				if v.Marker == MarkerNumber {
					c.Code = v.Number
				}
			case "level":
				c.Level = v.Str
			case "description":
				c.Description = v.Str
			}
		}
	}
	s.stats.mu.Lock()
	s.stats.recordCommand(*c)
	s.stats.mu.Unlock()
	return c
}

func (s *Session) nextTxn() float64 {
	s.txnCounter++
	return s.txnCounter
}

// sendCommand writes one AMF0 command on our control chunk stream and records
// it in the command log (direction "client") for the forensics view.
func (s *Session) sendCommand(payload []byte) error {
	if c := s.parseCommand(payload, "client"); c != nil && s.OnCommand != nil {
		s.OnCommand(*c)
	}
	msg := Message{
		ChunkStreamID:   s.chunkStreamID,
		Timestamp:       0,
		MessageLength:   uint32(len(payload)),
		MessageType:     MsgCommandAMF0,
		MessageStreamID: s.msgStreamID,
		Payload:         payload,
	}
	if err := s.writer.WriteMessage(msg); err != nil {
		return err
	}
	s.stats.mu.Lock()
	s.stats.BytesSentTotal += uint64(len(payload))
	s.stats.mu.Unlock()
	return nil
}

func (s *Session) connect() error {
	tx := s.nextTxn()
	e := NewEncoder()
	e.EncodeString("connect")
	e.EncodeNumber(tx)
	e.BeginObject()
	e.EncodePropertyName("app")
	e.EncodeString(s.URL.App)
	e.EncodePropertyName("type")
	e.EncodeString("nonprivate")
	e.EncodePropertyName("flashVer")
	e.EncodeString("FMLE/3.0 (stream-analyzer helper)")
	e.EncodePropertyName("tcUrl")
	e.EncodeString(s.URL.TcURL)
	// The classic Flash connect object; servers in the wild (Wowza, FMS and
	// their forks) gate on these.
	e.EncodePropertyName("fpad")
	e.EncodeBoolean(false)
	e.EncodePropertyName("capabilities")
	e.EncodeNumber(15)
	e.EncodePropertyName("audioCodecs")
	e.EncodeNumber(4071)
	e.EncodePropertyName("videoCodecs")
	e.EncodeNumber(252)
	e.EncodePropertyName("videoFunction")
	e.EncodeNumber(1)
	e.EncodePropertyName("objectEncoding")
	e.EncodeNumber(0) // AMF0
	if v, ok := s.URL.Params["token"]; ok {
		e.EncodePropertyName("token")
		e.EncodeString(v)
	}
	e.EndObject()
	if err := s.sendCommand(e.Bytes()); err != nil {
		return err
	}
	if err := s.awaitReply("_result", tx, 10*time.Second); err != nil {
		return err
	}
	return nil
}

func (s *Session) createStream() error {
	tx := s.nextTxn()
	e := NewEncoder()
	e.EncodeString("createStream")
	e.EncodeNumber(tx)
	e.EncodeNull()
	if err := s.sendCommand(e.Bytes()); err != nil {
		return err
	}
	// The reply lands as _result with the stream id; the play that follows uses
	// stream id 1 unless the server assigned another one.
	if err := s.awaitReply("_result", tx, 10*time.Second); err != nil {
		return err
	}
	return nil
}

func (s *Session) play() error {
	e := NewEncoder()
	e.EncodeString("play")
	e.EncodeNumber(0)
	e.EncodeNull()
	e.EncodeString(s.playpath())
	e.EncodeNumber(-2) // start at the live edge
	return s.sendCommand(e.Bytes())
}

func (s *Session) playpath() string {
	if s.URL.Playpath != "" {
		return s.URL.Playpath
	}
	return ""
}

// awaitReply waits (bounded) for a command with the given name/transaction.
func (s *Session) awaitReply(name string, tx float64, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		for _, c := range s.stats.Commands() {
			if (c.Name == name || (name == "_result" && c.Name == "_error")) && c.StreamID == tx {
				if c.Name == "_error" {
					return errReply{"_error", c.Description, c.Code}
				}
				return nil
			}
		}
		select {
		case <-s.closed:
			return errReply{"connect", "session closed", 0}
		case <-time.After(10 * time.Millisecond):
		}
	}
	return errReply{name, "timeout waiting for " + name, 0}
}

type errReply struct {
	name string
	msg  string
	code float64
}

func (e errReply) Error() string {
	if e.msg == "" {
		return "rtmp " + e.name + " failed"
	}
	return "rtmp " + e.name + ": " + e.msg
}
