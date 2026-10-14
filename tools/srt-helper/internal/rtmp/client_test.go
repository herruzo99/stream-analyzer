package rtmp

// Integration test: an in-process RTMP server drives the client through the
// complete lifecycle — handshake, connect, createStream, play — and serves FLV
// tags (script metadata, a video keyframe, an audio frame). This is the
// deterministic counterpart of the live public-endpoint verification, which
// depends on servers outside this repository.

import (
	"encoding/binary"
	"io"
	"net"
	"testing"
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/rtmpurl"
)

// testServer is a minimal RTMP server: handshake, command replies, and a few
// FLV tags after play.
type testServer struct {
	ln   net.Listener
	addr string

	// what the client sent, for forensics assertions
	mu       chan struct{}
	gotCmds  []string
	gotChunk uint32
}

func newTestServer(t *testing.T) *testServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	s := &testServer{ln: ln, addr: ln.Addr().String(), mu: make(chan struct{}, 1)}
	go s.serve(t)
	return s
}

func (s *testServer) serve(t *testing.T) {
	for {
		conn, err := s.ln.Accept()
		if err != nil {
			return
		}
		go s.handle(t, conn)
	}
}

func (s *testServer) handle(t *testing.T, conn net.Conn) {
	defer conn.Close()

	// Handshake: C0+C1 → S0+S1 → C2 → S2.
	c0c1 := make([]byte, 1+HandshakeLength)
	if _, err := io.ReadFull(conn, c0c1); err != nil {
		t.Logf("server: read C0C1: %v", err)
		return
	}
	body, err := RandomBody()
	if err != nil {
		return
	}
	if _, err := conn.Write(append([]byte{HandshakeVersion}, body...)); err != nil {
		return
	}
	c2 := make([]byte, HandshakeLength)
	if _, err := io.ReadFull(conn, c2); err != nil {
		return
	}
	s2 := make([]byte, HandshakeLength)
	copy(s2, c0c1[1:])
	if _, err := conn.Write(s2); err != nil {
		return
	}

	r := NewReader(conn)
	w := NewWriter(conn)
	_ = w.WindowAckSize(2_500_000)
	_ = w.SetChunkSize(4096)

	streamID := uint32(1)
	for {
		msg, err := r.ReadMessage()
		if err != nil {
			return
		}
		switch msg.MessageType {
		case MsgCommandAMF0:
			name, tx := commandNameTx(msg.Payload)
			if name == "" {
				continue
			}
			s.gotCmds = append(s.gotCmds, name)
			switch name {
			case "connect":
				_ = w.WriteMessage(serverResult(w, 1, connectResultObject(), nil))
			case "createStream":
				e := NewEncoder()
				e.EncodeString("_result")
				e.EncodeNumber(tx)
				e.EncodeNull()
				e.EncodeNumber(float64(streamID))
				_ = w.WriteMessage(Message{ChunkStreamID: 3, MessageLength: uint32(e.Len()), MessageType: MsgCommandAMF0, Payload: e.Bytes()})
			case "play":
				// StreamBegin user control event, then the media.
				e := NewEncoder()
				e.EncodeString("onStatus")
				e.EncodeNumber(0)
				e.EncodeNull()
				e.BeginObject()
				e.EncodePropertyName("level")
				e.EncodeString("status")
				e.EncodePropertyName("code")
				e.EncodeString("NetStream.Play.Start")
				e.EncodePropertyName("description")
				e.EncodeString("Start live")
				e.EndObject()
				_ = w.WriteMessage(Message{ChunkStreamID: 4, MessageLength: uint32(e.Len()), MessageType: MsgCommandAMF0, Payload: e.Bytes()})
				s.sendTags(w)
				return
			}
		}
	}
}

// sendTags writes a script (onMetaData), a video keyframe and an audio frame
// on a unidirectional stream, like a real publisher.
func (s *testServer) sendTags(w *Writer) {
	// Script tag: onMetaData with width/height/framerate.
	e := NewEncoder()
	e.EncodeString("onMetaData")
	e.BeginObject()
	e.EncodePropertyName("width")
	e.EncodeNumber(1920)
	e.EncodePropertyName("height")
	e.EncodeNumber(1080)
	e.EncodePropertyName("videocodecid")
	e.EncodeNumber(7) // AVC
	e.EncodePropertyName("audiocodecid")
	e.EncodeNumber(10) // AAC
	e.EncodePropertyName("framerate")
	e.EncodeNumber(30)
	e.EndObject()
	script := Message{
		ChunkStreamID: 6, Timestamp: 0, MessageType: MsgDataAMF0,
		MessageLength: uint32(e.Len()), Payload: e.Bytes(),
	}
	if err := w.WriteMessage(script); err != nil {
		return
	}

	// Video keyframe: AVC sequence header (frameType 1, codecId 7).
	video := Message{
		ChunkStreamID: 6, Timestamp: 0, MessageType: MsgVideo,
		MessageLength: 4, Payload: []byte{0x17, 0x00, 0x00, 0x00},
	}
	if err := w.WriteMessage(video); err != nil {
		return
	}

	// Audio: AAC sequence header (soundFormat 10).
	audio := Message{
		ChunkStreamID: 5, Timestamp: 0, MessageType: MsgAudio,
		MessageLength: 4, Payload: []byte{0xaf, 0x00, 0x11, 0x90},
	}
	if err := w.WriteMessage(audio); err != nil {
		return
	}

	// A second video frame later in time (keyframe interval).
	video2 := Message{
		ChunkStreamID: 6, Timestamp: 33, MessageType: MsgVideo,
		MessageLength: 4, Payload: []byte{0x27, 0x01, 0x00, 0x00},
	}
	_ = w.WriteMessage(video2)
}

// serverResult writes a _result message on the server's control stream.
func serverResult(w *Writer, tx float64, obj func(*Encoder), extra func(*Encoder)) Message {
	e := NewEncoder()
	e.EncodeString("_result")
	e.EncodeNumber(tx)
	if obj != nil {
		obj(e)
	} else {
		e.EncodeNull()
	}
	return Message{ChunkStreamID: 3, MessageLength: uint32(e.Len()), MessageType: MsgCommandAMF0, Payload: e.Bytes()}
}

func connectResultObject() func(*Encoder) {
	return func(e *Encoder) {
		e.BeginObject()
		e.EncodePropertyName("fmsVer")
		e.EncodeString("test/1.0")
		e.EncodePropertyName("capabilities")
		e.EncodeNumber(31)
		e.EndObject()
		e.BeginObject()
		e.EncodePropertyName("level")
		e.EncodeString("status")
		e.EncodePropertyName("code")
		e.EncodeString("NetConnection.Connect.Success")
		e.EncodePropertyName("description")
		e.EncodeString("ok")
		e.EncodePropertyName("objectEncoding")
		e.EncodeNumber(0)
		e.EndObject()
	}
}

// commandNameTx extracts the command name and transaction id from an AMF0
// command payload.
func commandNameTx(payload []byte) (string, float64) {
	d := NewDecoder(payload)
	name, err := d.Decode()
	if err != nil || name.Marker != MarkerString {
		return "", 0
	}
	tx, err := d.Decode()
	if err != nil {
		return name.Str, 0
	}
	return name.Str, tx.Number
}

func TestClientLifecycleAgainstTestServer(t *testing.T) {
	server := newTestServer(t)
	defer server.ln.Close()

	parts := PartsFromAddr(server.addr, "live", "key")
	sess, err := Dial(parts)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer sess.Close()

	// Give the tags time to flow through the client's read loop.
	deadline := time.Now().Add(10 * time.Second)
	var snap StatsSnapshot
	for time.Now().Before(deadline) {
		snap = sess.Stats().Snapshot()
		if snap.VideoTags >= 2 && snap.AudioTags >= 1 && snap.ScriptTags >= 1 {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}

	if snap.ScriptTags < 1 {
		t.Errorf("script tags: %d", snap.ScriptTags)
	}
	if snap.VideoTags < 2 {
		t.Errorf("video tags: %d", snap.VideoTags)
	}
	if snap.AudioTags < 1 {
		t.Errorf("audio tags: %d", snap.AudioTags)
	}
	if snap.Keyframes != 1 {
		t.Errorf("keyframes: %d", snap.Keyframes)
	}
	if !snap.MetadataSeen {
		t.Error("onMetaData was not decoded")
	} else if snap.Metadata["width"] != float64(1920) || snap.Metadata["height"] != float64(1080) {
		t.Errorf("metadata: %+v", snap.Metadata)
	}
	if snap.NegotiatedChunk != 4096 {
		t.Errorf("negotiated chunk size: %d", snap.NegotiatedChunk)
	}
	if snap.WindowAckSize != 2_500_000 {
		t.Errorf("window ack size: %d", snap.WindowAckSize)
	}
	if snap.HandshakeRTTMs <= 0 && snap.HandshakeRTTMs != 0 {
		t.Errorf("handshake rtt: %v", snap.HandshakeRTTMs)
	}

	// The command log must show the full lifecycle the client drove:
	// client connect/createStream/play, and the server's _result/onStatus.
	logged := namesOf(sess.Stats().Commands())
	for _, want := range []string{
		"client:connect",
		"client:createStream",
		"client:play",
		"server:_result",
		"server:onStatus",
	} {
		if !containsString(logged, want) {
			t.Errorf("command log missing %s (got %v)", want, logged)
		}
	}
	if len(logged) < 5 {
		t.Errorf("command log too short: %v", logged)
	}
}

func containsString(list []string, want string) bool {
	for _, v := range list {
		if v == want {
			return true
		}
	}
	return false
}

func namesOf(cmds []Command) []string {
	out := make([]string, 0, len(cmds))
	for _, c := range cmds {
		out = append(out, c.Direction+":"+c.Name)
	}
	return out
}

func TestDetectHandshakeAnomalyRecordedNotFatal(t *testing.T) {
	// A server that puts junk in the S1 zero field must still be usable: the
	// anomaly is recorded for the report, not raised.
	c, s := net.Pipe()
	defer c.Close()
	defer s.Close()
	go func() {
		buf := make([]byte, 1+HandshakeLength)
		if _, err := io.ReadFull(s, buf); err != nil {
			return
		}
		body, _ := RandomBody()
		binary.BigEndian.PutUint32(body[4:8], 0x03000101) // violate the spec
		s.Write(append([]byte{HandshakeVersion}, body...))
		c2 := make([]byte, HandshakeLength)
		if _, err := io.ReadFull(s, c2); err != nil {
			return
		}
		s2 := make([]byte, HandshakeLength)
		copy(s2, c2)
		s.Write(s2)
	}()
	_, outcome, err := Handshake(c)
	if err != nil {
		t.Fatalf("handshake must tolerate the anomaly: %v", err)
	}
	if !outcome.S1ZeroFieldNonZero {
		t.Error("anomaly was not recorded")
	}
}

// PartsFromAddr builds parts for a test address (keeps the constructor out of
// the public URL surface).
func PartsFromAddr(addr, app, playpath string) rtmpurl.Parts {
	host, portStr, _ := net.SplitHostPort(addr)
	port := 0
	for _, ch := range portStr {
		port = port*10 + int(ch-'0')
	}
	return rtmpurl.Parts{
		Protocol: "rtmp",
		Host:     host,
		Port:     port,
		App:      app,
		Playpath: playpath,
		TcURL:    "rtmp://" + addr + "/" + app,
		Params:   map[string]string{},
		Raw:      "rtmp://" + addr + "/" + app + "/" + playpath,
	}
}
