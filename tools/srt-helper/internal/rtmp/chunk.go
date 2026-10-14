package rtmp

// Chunk stream (§5.3): reads and writes the chunked message encoding RTMP
// multiplexes over TCP — basic header (fmt + chunk stream id), message header
// (types 0-3), extended timestamps, and Set Chunk Size negotiation (default
// 128 bytes per the spec).
//
// The reader keeps per-chunk-stream state so forensics can report which header
// formats each peer actually used — the point of this implementation.

import (
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"sync"
)

// Message type ids (§7.1).
const (
	MsgSetChunkSize  = 1
	MsgAbort         = 2
	MsgAck           = 3
	MsgUserControl   = 4
	MsgWindowAckSize = 5
	MsgSetPeerBW     = 6
	MsgAudio         = 8
	MsgVideo         = 9
	MsgDataAMF3      = 18 // AMF3
	MsgSharedObject3 = 19 // AMF3
	MsgCommandAMF3   = 20 // AMF3
	MsgDataAMF0      = 15 // AMF0
	MsgSharedObject0 = 16 // AMF0
	MsgCommandAMF0   = 17 // AMF0
	MsgAggregate     = 22
	MsgDataExtended  = 15 // alias kept for readability
)

// Protocol constants.
const (
	DefaultChunkSize  = 128
	MaxChunkSize      = 0x7fffffff
	TimestampMask     = 0x00ffffff // 24-bit
	ExtendedTimestamp = TimestampMask
	HandshakeLength   = 1536
	HandshakeVersion  = 0x03
)

var errAborted = errors.New("rtmp: chunk stream aborted")

// HeaderFormatCounts records how often each message-header format was used
// (fmt 0/1/2/3) — encoder behaviour forensics.
type HeaderFormatCounts struct {
	Fmt0 uint64 `json:"fmt0"`
	Fmt1 uint64 `json:"fmt1"`
	Fmt2 uint64 `json:"fmt2"`
	Fmt3 uint64 `json:"fmt3"`
}

// Message is one fully reassembled RTMP message.
type Message struct {
	ChunkStreamID   uint32
	Timestamp       uint32 // absolute, ms (extended if needed)
	TimestampDelta  uint32
	MessageLength   uint32
	MessageType     byte
	MessageStreamID uint32
	Payload         []byte
}

// chunkState is per-chunk-stream reassembly state.
type chunkState struct {
	timestamp       uint32
	messageLength   uint32
	messageType     byte
	messageStreamID uint32
	haveHeader      bool
	buf             []byte
}

// Reader reassembles messages from a chunk stream.
type Reader struct {
	r          io.Reader
	chunkSize  uint32
	states     map[uint32]*chunkState
	Formats    HeaderFormatCounts
	ChunksRead uint64
	BytesRead  uint64
	Aborted    map[uint32]bool
	mu         sync.Mutex
}

// NewReader returns a reader with the 128-byte default chunk size.
func NewReader(r io.Reader) *Reader {
	return &Reader{
		r:         r,
		chunkSize: DefaultChunkSize,
		states:    map[uint32]*chunkState{},
		Aborted:   map[uint32]bool{},
	}
}

// ChunkSize reports the currently negotiated inbound chunk size.
func (r *Reader) ChunkSize() uint32 {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.chunkSize
}

// SetChunkSize applies the peer's Set Chunk Size message.
func (r *Reader) SetChunkSize(size uint32) error {
	if size < 1 || size > MaxChunkSize {
		return fmt.Errorf("chunk size %d out of range", size)
	}
	r.mu.Lock()
	r.chunkSize = size
	r.mu.Unlock()
	return nil
}

// FormatCounts returns a copy of the header-format counters.
func (r *Reader) FormatCounts() HeaderFormatCounts {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.Formats
}

// ReadMessage reassembles the next message. Set Chunk Size / Abort control
// messages are handled internally and not returned. Set Chunk Size / Abort control
// messages are handled internally and not returned.
// ReadMessage reassembles the next message. Set Chunk Size / Abort control
// messages are handled internally and not returned. It blocks until a
// complete non-control message is available.
func (r *Reader) ReadMessage() (Message, error) {
	for {
		msg, done, err := r.readChunk()
		if err != nil {
			return Message{}, err
		}
		if !done {
			continue // the message spans more chunks
		}
		switch msg.MessageType {
		case MsgSetChunkSize:
			if len(msg.Payload) != 4 {
				return Message{}, fmt.Errorf("Set Chunk Size payload is %d bytes", len(msg.Payload))
			}
			if err := r.SetChunkSize(binary.BigEndian.Uint32(msg.Payload)); err != nil {
				return Message{}, err
			}
			continue
		case MsgAbort:
			if len(msg.Payload) != 4 {
				return Message{}, fmt.Errorf("Abort payload is %d bytes", len(msg.Payload))
			}
			r.mu.Lock()
			id := binary.BigEndian.Uint32(msg.Payload)
			r.Aborted[id] = true
			if st, ok := r.states[id]; ok {
				st.buf = st.buf[:0]
			}
			r.mu.Unlock()
			continue
		}
		return msg, nil
	}
}

// readChunk consumes one chunk and returns a message when its stream completes.
func (r *Reader) readChunk() (msg Message, done bool, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Basic header: 2 fmt bits + chunk stream id (1, 2 or 3 bytes).
	b0, err := readByte(r.r)
	if err != nil {
		return Message{}, false, err
	}
	r.BytesRead++
	fmtBits := b0 >> 6
	csid := uint32(b0 & 0x3f)
	switch csid {
	case 0:
		second, err := readByte(r.r)
		if err != nil {
			return Message{}, false, err
		}
		r.BytesRead++
		csid = uint32(second) + 64
	case 1:
		b1, err := readByte(r.r)
		if err != nil {
			return Message{}, false, err
		}
		b2, err := readByte(r.r)
		if err != nil {
			return Message{}, false, err
		}
		r.BytesRead += 2
		csid = uint32(b1) + uint32(b2)<<8 + 64
	}

	st := r.states[csid]
	if st == nil {
		st = &chunkState{}
		r.states[csid] = st
	}

	var timestampDelta uint32
	var messageLength uint32
	var messageType byte
	var messageStreamID uint32
	extended := false

	switch fmtBits {
	case 0:
		t, err := readUint24(r.r)
		if err != nil {
			return Message{}, false, err
		}
		l, err := readUint24(r.r)
		if err != nil {
			return Message{}, false, err
		}
		ty, err := readByte(r.r)
		if err != nil {
			return Message{}, false, err
		}
		sid, err := readUint32LE(r.r)
		if err != nil {
			return Message{}, false, err
		}
		r.BytesRead += 11
		timestampDelta = t
		messageLength = l
		messageType = ty
		messageStreamID = sid
		extended = t >= ExtendedTimestamp
		r.Formats.Fmt0++
	case 1:
		t, err := readUint24(r.r)
		if err != nil {
			return Message{}, false, err
		}
		l, err := readUint24(r.r)
		if err != nil {
			return Message{}, false, err
		}
		ty, err := readByte(r.r)
		if err != nil {
			return Message{}, false, err
		}
		r.BytesRead += 7
		timestampDelta = t
		messageLength = l
		messageType = ty
		messageStreamID = st.messageStreamID
		extended = t >= ExtendedTimestamp
		r.Formats.Fmt1++
	case 2:
		t, err := readUint24(r.r)
		if err != nil {
			return Message{}, false, err
		}
		r.BytesRead += 3
		timestampDelta = t
		messageLength = st.messageLength
		messageType = st.messageType
		messageStreamID = st.messageStreamID
		extended = t >= ExtendedTimestamp
		r.Formats.Fmt2++
	case 3:
		timestampDelta = st.timestamp
		messageLength = st.messageLength
		messageType = st.messageType
		messageStreamID = st.messageStreamID
		if !st.haveHeader {
			return Message{}, false, errors.New("rtmp: type-3 chunk before any header")
		}
		r.Formats.Fmt3++
	}

	if extended {
		v, err := readUint32(r.r)
		if err != nil {
			return Message{}, false, err
		}
		r.BytesRead += 4
		timestampDelta = v
	}

	// Timestamps: fmt 0 carries an absolute timestamp; fmt 1/2 carry a delta
	// to add; fmt 3 repeats the previous chunk's delta without moving the
	// message's absolute timestamp forward (§5.3.1.2.4).
	switch fmtBits {
	case 0:
		st.timestamp = timestampDelta
	case 1, 2:
		st.timestamp += timestampDelta
	}
	st.messageLength = messageLength
	st.messageType = messageType
	st.messageStreamID = messageStreamID
	st.haveHeader = true

	// Payload reassembly. A message may span chunks; each chunk carries at
	// most chunkSize bytes of it, and a new full header while a partial
	// message is still buffered is a protocol violation (§5.3).
	if fmtBits != 3 && len(st.buf) > 0 {
		return Message{}, false, errors.New("rtmp: new message header while previous message incomplete")
	}
	remaining := int(messageLength) - len(st.buf)
	if remaining <= 0 {
		// Zero-length message (legal: e.g. empty script/command payload).
		return Message{
			ChunkStreamID:   csid,
			Timestamp:       st.timestamp,
			TimestampDelta:  timestampDelta,
			MessageLength:   messageLength,
			MessageType:     st.messageType,
			MessageStreamID: st.messageStreamID,
		}, true, nil
	}
	toRead := int(r.chunkSize)
	if remaining < toRead {
		toRead = remaining
	}

	buf := make([]byte, toRead)
	if _, err := io.ReadFull(r.r, buf); err != nil {
		return Message{}, false, err
	}
	r.BytesRead += uint64(toRead)
	r.ChunksRead++
	st.buf = append(st.buf, buf...)

	if len(st.buf) == int(messageLength) {
		out := Message{
			ChunkStreamID:   csid,
			Timestamp:       st.timestamp,
			TimestampDelta:  timestampDelta,
			MessageLength:   messageLength,
			MessageType:     st.messageType,
			MessageStreamID: st.messageStreamID,
			Payload:         st.buf,
		}
		st.buf = nil
		return out, true, nil
	}
	// More chunks of this message are pending.
	return Message{}, false, nil
}

func readByte(r io.Reader) (byte, error) {
	var b [1]byte
	if _, err := io.ReadFull(r, b[:]); err != nil {
		return 0, err
	}
	return b[0], nil
}

func readUint24(r io.Reader) (uint32, error) {
	var b [3]byte
	if _, err := io.ReadFull(r, b[:]); err != nil {
		return 0, err
	}
	return uint32(b[0])<<16 | uint32(b[1])<<8 | uint32(b[2]), nil
}

func readUint32(r io.Reader) (uint32, error) {
	var b [4]byte
	if _, err := io.ReadFull(r, b[:]); err != nil {
		return 0, err
	}
	return binary.BigEndian.Uint32(b[:]), nil
}

func readUint32LE(r io.Reader) (uint32, error) {
	var b [4]byte
	if _, err := io.ReadFull(r, b[:]); err != nil {
		return 0, err
	}
	return binary.LittleEndian.Uint32(b[:]), nil
}
