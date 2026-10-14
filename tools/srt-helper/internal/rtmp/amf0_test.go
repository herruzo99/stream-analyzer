package rtmp

import (
	"bytes"
	"testing"
)

// Fixtures mirror the AMF0 spec tables and the exact bytes Flash/ffmpeg emit.

func TestDecodeNumberAndString(t *testing.T) {
	buf := []byte{
		0x00, 0x40, 0x09, 0x21, 0xfb, 0x54, 0x44, 0x2d, 0x18, // Number 3.14
		0x02, 0x00, 0x05, 'h', 'e', 'l', 'l', 'o', // "hello"
	}
	d := NewDecoder(buf)
	n, err := d.Decode()
	if err != nil {
		t.Fatalf("number: %v", err)
	}
	if n.Marker != MarkerNumber || n.Number != 3.141592653589793 {
		t.Fatalf("number value: %+v", n)
	}
	s, err := d.Decode()
	if err != nil {
		t.Fatalf("string: %v", err)
	}
	if s.Marker != MarkerString || s.Str != "hello" {
		t.Fatalf("string value: %+v", s)
	}
	if d.Remaining() != 0 {
		t.Fatalf("trailing bytes: %d", d.Remaining())
	}
}

func TestDecodeObjectWithMixedTypes(t *testing.T) {
	buf := []byte{
		0x03,                      // object
		0x00, 0x03, 'a', 'p', 'p', // key "app"
		0x02, 0x00, 0x04, 'l', 'i', 'v', 'e', // "live"
		0x00, 0x04, 'p', 'o', 'r', 't', // key "port"
		0x00, 0x40, 0x70, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Number 256
		0x00, 0x00, // end
		0x09,
	}
	d := NewDecoder(buf)
	v, err := d.Decode()
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if v.Marker != MarkerObject {
		t.Fatalf("marker: %+v", v)
	}
	app, ok := v.Object.Get("app")
	if !ok || app.Str != "live" {
		t.Fatalf("app: %+v", app)
	}
	port, ok := v.Object.Get("port")
	if !ok || port.Number != 256 {
		t.Fatalf("port: %+v", port)
	}
	if got := v.Object.Keys(); len(got) != 2 || got[0] != "app" || got[1] != "port" {
		t.Fatalf("key order: %v", got)
	}
}

func TestDecodeECMAArrayAndNull(t *testing.T) {
	buf := []byte{
		0x08, 0x00, 0x00, 0x00, 0x01, // ECMA array, 1 entry
		0x00, 0x06, 'f', 'm', 'p', '4', ':', '1', // key "fmp4:1"
		0x05,       // null
		0x00, 0x00, // end
		0x09,
	}
	v, err := NewDecoder(buf).Decode()
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	fmp4, ok := v.Object.Get("fmp4:1")
	if !ok || fmp4.Marker != MarkerNull {
		t.Fatalf("fmp4: %+v", fmp4)
	}
}

func TestDecodeStrictArray(t *testing.T) {
	buf := []byte{
		0x0a, 0x00, 0x00, 0x00, 0x02, // strict array of 2
		0x00, 0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 1.0
		0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 2.0
	}
	v, err := NewDecoder(buf).Decode()
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(v.Array) != 2 || v.Array[0].Number != 1 || v.Array[1].Number != 2 {
		t.Fatalf("array: %+v", v)
	}
}

func TestDecodeTruncated(t *testing.T) {
	if _, err := NewDecoder([]byte{0x02, 0x00, 0x05, 'a', 'b'}).Decode(); err == nil {
		t.Fatal("expected truncation error")
	}
	if _, err := NewDecoder([]byte{0x63}).Decode(); err == nil {
		t.Fatal("expected unknown marker error")
	}
}

func TestEncodeObjectRoundTrip(t *testing.T) {
	e := NewEncoder()
	e.EncodeString("connect") // command name
	e.EncodeNumber(1)
	e.BeginObject()
	e.EncodePropertyName("app")
	e.EncodeString("live")
	e.EncodePropertyName("flashVer")
	e.EncodeString("FMLE/3.0")
	e.EndObject()
	e.EncodeNull()

	d := NewDecoder(e.Bytes())
	name, err := d.Decode()
	if err != nil || name.Str != "connect" {
		t.Fatalf("name: %+v %v", name, err)
	}
	tid, err := d.Decode()
	if err != nil || tid.Number != 1 {
		t.Fatalf("tid: %+v %v", tid, err)
	}
	obj, err := d.Decode()
	if err != nil {
		t.Fatalf("obj: %v", err)
	}
	app, _ := obj.Object.Get("app")
	if app.Str != "live" {
		t.Fatalf("app: %+v", app)
	}
	ver, _ := obj.Object.Get("flashVer")
	if ver.Str != "FMLE/3.0" {
		t.Fatalf("ver: %+v", ver)
	}
	if v, err := d.Decode(); err != nil || v.Marker != MarkerNull {
		t.Fatalf("null: %+v %v", v, err)
	}
}

func TestEncodeIsByteExact(t *testing.T) {
	e := NewEncoder()
	e.EncodeNumber(1)
	e.EncodeBoolean(true)
	e.EncodeString("ab")
	want := []byte{
		0x00, 0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x01, 0x01,
		0x02, 0x00, 0x02, 'a', 'b',
	}
	if !bytes.Equal(e.Bytes(), want) {
		t.Fatalf("bytes: % x", e.Bytes())
	}
}
