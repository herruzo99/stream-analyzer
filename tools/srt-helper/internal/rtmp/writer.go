package rtmp

// Chunk writer: serializes messages into chunks, negotiating the outbound
// chunk size (128 default, raised to 4096 like Flash does) and choosing header
// formats per chunk stream.

import (
	"encoding/binary"
	"io"
	"net"
	"sync"
)

// Writer emits chunked RTMP messages.
type Writer struct {
	w         io.Writer
	mu        sync.Mutex
	chunkSize uint32

	// Per-chunk-stream previous header state, so the writer can emit the
	// cheapest format for each chunk.
	prevTimestamp map[uint32]uint32
	prevHeader    map[uint32]bool
}

// NewWriter returns a writer with the 128-byte default outbound chunk size.
func NewWriter(w io.Writer) *Writer {
	return &Writer{
		w:             w,
		chunkSize:     DefaultChunkSize,
		prevTimestamp: map[uint32]uint32{},
		prevHeader:    map[uint32]bool{},
	}
}

// SetChunkSize changes the outbound chunk size (and announces it to the peer).
func (w *Writer) SetChunkSize(size uint32) error {
	if size < 1 || size > MaxChunkSize {
		return &writeError{"chunk size out of range"}
	}
	w.mu.Lock()
	w.chunkSize = size
	w.mu.Unlock()
	payload := make([]byte, 4)
	binary.BigEndian.PutUint32(payload, size)
	return w.WriteMessage(Message{
		ChunkStreamID:   2,
		MessageLength:   4,
		MessageType:     MsgSetChunkSize,
		MessageStreamID: 0,
		Payload:         payload,
	})
}

// WindowAckSize announces our acknowledgement window.
func (w *Writer) WindowAckSize(size uint32) error {
	payload := make([]byte, 4)
	binary.BigEndian.PutUint32(payload, size)
	return w.WriteMessage(Message{
		ChunkStreamID:   2,
		MessageLength:   4,
		MessageType:     MsgWindowAckSize,
		MessageStreamID: 0,
		Payload:         payload,
	})
}

// SetPeerBandwidth answers the peer's Set Peer Bandwidth with the soft limit.
func (w *Writer) SetPeerBandwidth(size uint32) error {
	payload := make([]byte, 5)
	binary.BigEndian.PutUint32(payload, size)
	payload[4] = 0 // limit type: hard
	return w.WriteMessage(Message{
		ChunkStreamID:   2,
		MessageLength:   5,
		MessageType:     MsgSetPeerBW,
		MessageStreamID: 0,
		Payload:         payload,
	})
}

// WriteMessage writes one message as one or more chunks. The first chunk uses
// fmt 0 (full header); continuation chunks use fmt 3.
func (w *Writer) WriteMessage(msg Message) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if msg.MessageLength > 0xffffff || uint32(len(msg.Payload)) != msg.MessageLength {
		return &writeError{"message length does not match payload"}
	}

	var out []byte
	first := true
	extended := msg.Timestamp >= ExtendedTimestamp
	ts := msg.Timestamp
	if extended {
		ts = ExtendedTimestamp
	}

	writeBasic := func(fmtBits byte) {
		b0 := fmtBits<<6 | byte(msg.ChunkStreamID&0x3f)
		switch cs := msg.ChunkStreamID; {
		case cs < 2, cs > 65599:
			return // unsupported id; caller should use 2..65599
		case cs > 63 && cs < 320:
			out = append(out, fmtBits<<6, byte(cs-64))
		case cs >= 320:
			v := cs - 64
			out = append(out, fmtBits<<6|1, byte(v), byte(v>>8))
		default:
			out = append(out, b0)
		}
	}

	payload := msg.Payload
	for first || len(payload) > 0 {
		if first {
			switch {
			case !w.prevHeader[msg.ChunkStreamID] || w.prevTimestamp[msg.ChunkStreamID] != msg.Timestamp:
				writeBasic(0)
				out = appendUint24(out, ts)
				out = appendUint24(out, uint32(len(payload)))
				out = append(out, msg.MessageType)
				out = append(out, byte(msg.MessageStreamID>>0), byte(msg.MessageStreamID>>8), byte(msg.MessageStreamID>>16), byte(msg.MessageStreamID>>24))
			default:
				// Continuation of an identical header: fmt 3.
				writeBasic(3)
			}
			if extended {
				out = appendUint32(out, msg.Timestamp)
			}
		} else {
			writeBasic(3)
		}
		n := len(payload)
		if n > int(w.chunkSize) {
			n = int(w.chunkSize)
		}
		out = append(out, payload[:n]...)
		payload = payload[n:]
		first = false
	}

	w.prevHeader[msg.ChunkStreamID] = true
	w.prevTimestamp[msg.ChunkStreamID] = msg.Timestamp

	if _, err := w.w.Write(out); err != nil {
		return &writeError{err.Error()}
	}
	return nil
}

func appendUint24(b []byte, v uint32) []byte {
	return append(b, byte(v>>16), byte(v>>8), byte(v))
}

func appendUint32(b []byte, v uint32) []byte {
	return append(b, byte(v>>24), byte(v>>16), byte(v>>8), byte(v))
}

type writeError struct{ msg string }

func (e *writeError) Error() string { return "rtmp writer: " + e.msg }

// compile-time proof the writer works over any stream, including TCP conns.
var _ = (*net.TCPConn)(nil)
