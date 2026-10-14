package rtmp

import (
	"bytes"
	"testing"
)

func TestWriterReaderRoundTrip(t *testing.T) {
	var buf bytes.Buffer
	w := NewWriter(&buf)
	payload := append([]byte("connect"), 0x00, 0x3f, 0xf0, 0, 0, 0, 0, 0, 0)
	err := w.WriteMessage(Message{
		ChunkStreamID:   3,
		MessageLength:   uint32(len(payload)),
		MessageType:     MsgCommandAMF0,
		MessageStreamID: 0,
		Payload:         payload,
	})
	if err != nil {
		t.Fatalf("write: %v", err)
	}
	// A second identical message on the same chunk stream should reuse the
	// header (fmt 3) rather than repeat all 11 header bytes.
	err = w.WriteMessage(Message{
		ChunkStreamID:   3,
		MessageLength:   uint32(len(payload)),
		MessageType:     MsgCommandAMF0,
		MessageStreamID: 0,
		Payload:         payload,
	})
	if err != nil {
		t.Fatalf("write 2: %v", err)
	}

	r := NewReader(bytes.NewReader(buf.Bytes()))
	for i := 0; i < 2; i++ {
		msg, err := r.ReadMessage()
		if err != nil {
			t.Fatalf("read %d: %v", i, err)
		}
		if !bytes.Equal(msg.Payload, payload) {
			t.Fatalf("payload %d: % x", i, msg.Payload)
		}
		if msg.MessageType != MsgCommandAMF0 || msg.MessageLength != uint32(len(payload)) {
			t.Fatalf("header %d: %+v", i, msg)
		}
	}
}

func TestWriterSplitsLargeMessages(t *testing.T) {
	var buf bytes.Buffer
	w := NewWriter(&buf)
	w.SetChunkSize(4096)
	big := make([]byte, 10000)
	for i := range big {
		big[i] = byte(i)
	}
	if err := w.WriteMessage(Message{
		ChunkStreamID: 6, MessageLength: uint32(len(big)),
		MessageType: MsgVideo, Payload: big,
	}); err != nil {
		t.Fatalf("write: %v", err)
	}

	r := NewReader(bytes.NewReader(buf.Bytes()))
	r.SetChunkSize(4096)
	msg, err := r.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if !bytes.Equal(msg.Payload, big) {
		t.Fatalf("payload mismatch: got %d bytes", len(msg.Payload))
	}
	if f := r.FormatCounts(); f.Fmt3 == 0 {
		t.Fatalf("expected continuation chunks, formats: %+v", f)
	}
}

func TestWriterSetChunkSizeFrame(t *testing.T) {
	var buf bytes.Buffer
	w := NewWriter(&buf)
	if err := w.SetChunkSize(4096); err != nil {
		t.Fatalf("set: %v", err)
	}
	want := []byte{
		0x02,             // fmt 0, csid 2
		0x00, 0x00, 0x00, // timestamp
		0x00, 0x00, 0x04, // length 4
		MsgSetChunkSize,
		0x00, 0x00, 0x00, 0x00, // message stream id
		0x00, 0x00, 0x10, 0x00, // 4096
	}
	if !bytes.Equal(buf.Bytes(), want) {
		t.Fatalf("frame: % x", buf.Bytes())
	}
}

func TestWriterRejectsLengthMismatch(t *testing.T) {
	var buf bytes.Buffer
	w := NewWriter(&buf)
	if err := w.WriteMessage(Message{
		ChunkStreamID: 3, MessageLength: 10, MessageType: MsgAudio,
		Payload: []byte{1, 2, 3},
	}); err == nil {
		t.Fatal("expected a length mismatch error")
	}
}
