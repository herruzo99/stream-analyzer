package rtmp

import (
	"bytes"
	"encoding/binary"
	"testing"
)

// A fmt-0 chunk: absolute timestamp 40, 6-byte payload of type 17 (command),
// on chunk stream 3, message stream 0.
func fmt0Chunk() []byte {
	p := []byte{0x01, 0x02, 0x03, 0x04, 0x05, 0x06}
	out := []byte{0x03} // fmt 0, csid 3
	out = append(out, byte(40>>16), byte(40>>8), byte(40))
	out = append(out, byte(len(p)>>16), byte(len(p)>>8), byte(len(p)))
	out = append(out, MsgCommandAMF0)
	var sid [4]byte
	binary.LittleEndian.PutUint32(sid[:], 0)
	out = append(out, sid[:]...)
	return append(out, p...)
}

func TestReadFmt0Message(t *testing.T) {
	r := NewReader(bytes.NewReader(fmt0Chunk()))
	msg, err := r.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if msg.ChunkStreamID != 3 || msg.MessageType != MsgCommandAMF0 {
		t.Fatalf("header: %+v", msg)
	}
	if msg.MessageLength != 6 || msg.MessageStreamID != 0 {
		t.Fatalf("lengths: %+v", msg)
	}
	if msg.Timestamp != 40 || msg.TimestampDelta != 40 {
		t.Fatalf("timestamps: %+v", msg)
	}
	if !bytes.Equal(msg.Payload, []byte{1, 2, 3, 4, 5, 6}) {
		t.Fatalf("payload: % x", msg.Payload)
	}
	f := r.FormatCounts()
	if f.Fmt0 != 1 || f.Fmt1+f.Fmt2+f.Fmt3 != 0 {
		t.Fatalf("formats: %+v", f)
	}
}

func TestReadFmt0Fmt3SameMessage(t *testing.T) {
	// A 6-byte payload with a 4-byte chunk size: fmt 0 (4 bytes) + fmt 3 (2).
	p := []byte{0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f}
	var buf []byte
	chunk0 := []byte{0x04}                    // fmt 0, csid 4
	chunk0 = append(chunk0, 0x00, 0x00, 0x64) // timestamp 100
	chunk0 = append(chunk0, byte(len(p)>>16), byte(len(p)>>8), byte(len(p)))
	chunk0 = append(chunk0, MsgAudio)
	var sid [4]byte
	chunk0 = append(chunk0, sid[:]...)
	chunk0 = append(chunk0, p[:4]...)
	buf = append(buf, chunk0...)
	buf = append(buf, 0xc4) // fmt 3, csid 4
	buf = append(buf, p[4:]...)

	r := NewReader(bytes.NewReader(buf))
	r.SetChunkSize(4)
	msg, err := r.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if !bytes.Equal(msg.Payload, p) {
		t.Fatalf("payload: % x", msg.Payload)
	}
	if msg.Timestamp != 100 {
		t.Fatalf("timestamp: %d", msg.Timestamp)
	}
	f := r.FormatCounts()
	if f.Fmt0 != 1 || f.Fmt3 != 1 {
		t.Fatalf("formats: %+v", f)
	}
}

func TestReadFmt1IncrementsTimestamp(t *testing.T) {
	var buf []byte
	// fmt 0: ts 1000, then fmt 1: delta 20, then fmt 2: delta 30.
	buf = append(buf, 0x05)
	buf = append(buf, 0x00, 0x03, 0xe8)
	buf = append(buf, 0x00, 0x00, 0x01)
	buf = append(buf, MsgAudio)
	buf = append(buf, 0, 0, 0, 0)
	buf = append(buf, 0x11)

	buf = append(buf, 0x45)
	buf = append(buf, 0x00, 0x00, 0x14)
	buf = append(buf, 0x00, 0x00, 0x01)
	buf = append(buf, MsgAudio)
	buf = append(buf, 0x11)

	buf = append(buf, 0x85)
	buf = append(buf, 0x00, 0x00, 0x1e)
	buf = append(buf, 0x11)

	r := NewReader(bytes.NewReader(buf))
	first, err := r.ReadMessage()
	if err != nil {
		t.Fatalf("first: %v", err)
	}
	second, err := r.ReadMessage()
	if err != nil {
		t.Fatalf("second: %v", err)
	}
	third, err := r.ReadMessage()
	if err != nil {
		t.Fatalf("third: %v", err)
	}
	if first.Timestamp != 1000 || second.Timestamp != 1020 || third.Timestamp != 1050 {
		t.Fatalf("timestamps: %d %d %d", first.Timestamp, second.Timestamp, third.Timestamp)
	}
	f := r.FormatCounts()
	if f.Fmt0 != 1 || f.Fmt1 != 1 || f.Fmt2 != 1 {
		t.Fatalf("formats: %+v", f)
	}
}

func TestSetChunkSizeIsConsumed(t *testing.T) {
	var buf []byte
	// Set Chunk Size (1), value 4096, on csid 2.
	buf = append(buf, 0x02) // fmt 0, csid 2
	buf = append(buf, 0x00, 0x00, 0x00)
	buf = append(buf, 0x00, 0x00, 0x04)
	buf = append(buf, MsgSetChunkSize)
	buf = append(buf, 0, 0, 0, 0)
	buf = append(buf, 0x00, 0x00, 0x10, 0x00)

	msg := fmt0Chunk()
	buf = append(buf, msg...)

	r := NewReader(bytes.NewReader(buf))
	out, err := r.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if out.MessageType != MsgCommandAMF0 {
		t.Fatalf("first non-control message: %+v", out)
	}
	if r.ChunkSize() != 4096 {
		t.Fatalf("chunk size: %d", r.ChunkSize())
	}
}

func TestExtendedTimestamp(t *testing.T) {
	var buf []byte
	buf = append(buf, 0x03)
	buf = append(buf, 0xff, 0xff, 0xff) // extended flag
	buf = append(buf, 0x00, 0x00, 0x02)
	buf = append(buf, MsgAudio)
	buf = append(buf, 0, 0, 0, 0)
	buf = append(buf, 0x00, 0x00, 0x00, 0x01) // 1 ms absolute
	buf = append(buf, 0xaa, 0xbb)

	r := NewReader(bytes.NewReader(buf))
	msg, err := r.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if msg.Timestamp != 1 {
		t.Fatalf("timestamp: %d", msg.Timestamp)
	}
}

func TestAbortDiscardsPartial(t *testing.T) {
	var buf []byte
	// Negotiate a 4-byte chunk size first: csid 2, fmt 0.
	buf = append(buf, 0x02)
	buf = append(buf, 0x00, 0x00, 0x00)
	buf = append(buf, 0x00, 0x00, 0x04)
	buf = append(buf, MsgSetChunkSize)
	buf = append(buf, 0, 0, 0, 0)
	buf = append(buf, 0x00, 0x00, 0x00, 0x04)

	// A 6-byte audio message on csid 4; only 4 of its bytes are sent.
	buf = append(buf, 0x04)
	buf = append(buf, 0x00, 0x00, 0x00)
	buf = append(buf, 0x00, 0x00, 0x06)
	buf = append(buf, MsgAudio)
	buf = append(buf, 0, 0, 0, 0)
	buf = append(buf, 0x01, 0x02, 0x03, 0x04)

	// Abort (2) for csid 4.
	buf = append(buf, 0x02)
	buf = append(buf, 0x00, 0x00, 0x00)
	buf = append(buf, 0x00, 0x00, 0x04)
	buf = append(buf, MsgAbort)
	buf = append(buf, 0, 0, 0, 0)
	buf = append(buf, 0x00, 0x00, 0x00, 0x04)

	// Raise the chunk size again so the complete message fits in one chunk.
	buf = append(buf, 0x02)
	buf = append(buf, 0x00, 0x00, 0x00)
	buf = append(buf, 0x00, 0x00, 0x04)
	buf = append(buf, MsgSetChunkSize)
	buf = append(buf, 0, 0, 0, 0)
	buf = append(buf, 0x00, 0x00, 0x00, 0x80)

	// A complete message afterwards.
	buf = append(buf, fmt0Chunk()...)

	r := NewReader(bytes.NewReader(buf))
	msg, err := r.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if msg.MessageType != MsgCommandAMF0 || !bytes.Equal(msg.Payload, []byte{1, 2, 3, 4, 5, 6}) {
		t.Fatalf("message after abort: %+v", msg)
	}
	if !r.Aborted[4] {
		t.Fatal("abort flag not recorded")
	}
}

func chunkWithCSID(csid uint32) []byte {
	var out []byte
	switch {
	case csid >= 2 && csid < 64: // 1 byte: fmt 0 in the top two bits
		out = append(out, byte(csid))
	case csid >= 64 && csid < 320: // 2 bytes: fmt 0 + marker 0
		out = append(out, 0x00, byte(csid-64))
	default: // 3 bytes: fmt 0 + marker 1, little-endian value
		v := csid - 64
		out = append(out, 0x01, byte(v), byte(v>>8))
	}
	out = append(out, 0x00, 0x00, 0x00) // timestamp 0
	out = append(out, 0x00, 0x00, 0x01) // length 1
	out = append(out, MsgAudio)
	out = append(out, 0, 0, 0, 0) // message stream id
	return append(out, 0xa7)
}

func TestChunkStreamIDEncodings(t *testing.T) {
	for _, csid := range []uint32{3, 64, 65, 319, 320, 65535} {
		r := NewReader(bytes.NewReader(chunkWithCSID(csid)))
		msg, err := r.ReadMessage()
		if err != nil {
			t.Fatalf("csid %d: %v", csid, err)
		}
		if msg.ChunkStreamID != csid {
			t.Fatalf("csid: got %d want %d", msg.ChunkStreamID, csid)
		}
		if !bytes.Equal(msg.Payload, []byte{0xa7}) {
			t.Fatalf("csid %d payload: % x (bytes % x)", csid, msg.Payload, chunkWithCSID(csid))
		}
	}
}
