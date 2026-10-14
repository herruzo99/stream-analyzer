package rtmp

// AMF 0 codec (§ "Action Message Format") — the marker set RTMP commands,
// data messages and FLV script tags use. Only what real endpoints send is
// implemented; unknown markers decode as a raw-skippable value and are
// reported, per the format's extensibility rule.
//
// Reference: standard/amf0-file-format-spec.pdf, AMF0 data types table.

import (
	"encoding/binary"
	"errors"
	"fmt"
	"math"
	"sort"
	"time"
)

// AMF0 type markers.
const (
	MarkerNumber      = 0x00
	MarkerBoolean     = 0x01
	MarkerString      = 0x02
	MarkerObject      = 0x03
	MarkerMovieClip   = 0x04 // reserved, not used in RTMP
	MarkerNull        = 0x05
	MarkerUndefined   = 0x06
	MarkerReference   = 0x07
	MarkerECMAArray   = 0x08
	MarkerObjectEnd   = 0x09
	MarkerStrictArray = 0x0a
	MarkerDate        = 0x0b
	MarkerLongString  = 0x0c
	MarkerUnsupported = 0x0d
	MarkerRecordSet   = 0x0e
	MarkerXMLDocument = 0x0f
	MarkerTypedObject = 0x10
	MarkerAMF3Switch  = 0x11
)

var errTruncated = errors.New("amf0: truncated value")

// Value is a decoded AMF0 value; objects and arrays are map[string]any with
// sorted key output, ECMA/strict arrays preserve order.
type Value struct {
	Marker byte
	// Exactly one of the following is set, by marker:
	Number  float64
	Boolean bool
	Str     string
	Object  *Object
	Array   []Value
	UnixMs  int64 // Date
	Raw     []byte
}

// Object is an AMF0 object (named keys). Named maps keep insertion order for
// reproducible JSON.
type Object struct {
	keys   []string
	values map[string]Value
}

// NewObject returns an empty object.
func NewObject() *Object {
	return &Object{values: map[string]Value{}}
}

// Set inserts or replaces a key, preserving insertion order.
func (o *Object) Set(key string, v Value) {
	if _, ok := o.values[key]; !ok {
		o.keys = append(o.keys, key)
	}
	o.values[key] = v
}

// Keys returns the keys in insertion order.
func (o *Object) Keys() []string { return o.keys }

// Get returns a value by key.
func (o *Object) Get(key string) (Value, bool) {
	v, ok := o.values[key]
	return v, ok
}

// String renders the value for the session-report/telemetry views.
func (v Value) String() string {
	switch v.Marker {
	case MarkerNumber:
		return fmt.Sprintf("%g", v.Number)
	case MarkerBoolean:
		if v.Boolean {
			return "true"
		}
		return "false"
	case MarkerString, MarkerLongString:
		return v.Str
	case MarkerNull:
		return "null"
	case MarkerUndefined, MarkerUnsupported:
		return "undefined"
	case MarkerObject:
		keys := append([]string(nil), v.Object.keys...)
		sort.Strings(keys)
		return "{" + fmt.Sprint(keys) + "}"
	case MarkerECMAArray, MarkerStrictArray:
		return fmt.Sprintf("[%d items]", len(v.Array))
	case MarkerDate:
		return time.UnixMilli(v.UnixMs).UTC().Format(time.RFC3339)
	default:
		return fmt.Sprintf("marker 0x%02x", v.Marker)
	}
}

// Decoder reads AMF0 values from a byte slice.
type Decoder struct {
	buf []byte
	off int
}

// NewDecoder returns a decoder over buf.
func NewDecoder(buf []byte) *Decoder { return &Decoder{buf: buf} }

// Offset returns the current read position.
func (d *Decoder) Offset() int { return d.off }

// Remaining reports unread bytes.
func (d *Decoder) Remaining() int { return len(d.buf) - d.off }

// Decode reads one value.
func (d *Decoder) Decode() (Value, error) {
	if d.off >= len(d.buf) {
		return Value{}, errTruncated
	}
	marker := d.buf[d.off]
	d.off++
	switch marker {
	case MarkerNumber:
		v, err := d.readFloat64()
		if err != nil {
			return Value{}, err
		}
		return Value{Marker: marker, Number: v}, nil
	case MarkerBoolean:
		if d.off >= len(d.buf) {
			return Value{}, errTruncated
		}
		b := d.buf[d.off] != 0
		d.off++
		return Value{Marker: marker, Boolean: b}, nil
	case MarkerString:
		s, err := d.readString(2)
		if err != nil {
			return Value{}, err
		}
		return Value{Marker: marker, Str: s}, nil
	case MarkerLongString:
		s, err := d.readString(4)
		if err != nil {
			return Value{}, err
		}
		return Value{Marker: marker, Str: s}, nil
	case MarkerNull:
		return Value{Marker: marker}, nil
	case MarkerUndefined, MarkerUnsupported:
		return Value{Marker: marker}, nil
	case MarkerObject:
		return d.decodeObject()
	case MarkerECMAArray:
		if _, err := d.readUint32(); err != nil { // approximate length, ignored
			return Value{}, err
		}
		return d.decodeObject()
	case MarkerStrictArray:
		n, err := d.readUint32()
		if err != nil {
			return Value{}, err
		}
		arr := make([]Value, 0, n)
		for i := uint32(0); i < n; i++ {
			v, err := d.Decode()
			if err != nil {
				return Value{}, err
			}
			arr = append(arr, v)
		}
		return Value{Marker: marker, Array: arr}, nil
	case MarkerDate:
		ms, err := d.readFloat64()
		if err != nil {
			return Value{}, err
		}
		if d.off+2 > len(d.buf) {
			return Value{}, errTruncated
		}
		d.off += 2 // timezone offset (unused)
		return Value{Marker: marker, UnixMs: int64(ms)}, nil
	case MarkerReference:
		if d.off+2 > len(d.buf) {
			return Value{}, errTruncated
		}
		d.off += 2
		return Value{Marker: marker}, nil
	case MarkerTypedObject:
		if _, err := d.readString(2); err != nil { // class name
			return Value{}, err
		}
		return d.decodeObject()
	case MarkerObjectEnd, MarkerXMLDocument, MarkerRecordSet, MarkerAMF3Switch:
		// A bare marker with no length prefix cannot be skipped safely.
		return Value{}, fmt.Errorf("amf0: marker 0x%02x not supported in this position", marker)
	default:
		return Value{}, fmt.Errorf("amf0: unknown marker 0x%02x", marker)
	}
}

func (d *Decoder) decodeObject() (Value, error) {
	obj := NewObject()
	for {
		if d.off+3 > len(d.buf) {
			return Value{}, errTruncated
		}
		nameLen := int(d.buf[d.off])<<8 | int(d.buf[d.off+1])
		d.off += 2
		if nameLen == 0 {
			if d.off >= len(d.buf) || d.buf[d.off] != MarkerObjectEnd {
				return Value{}, errors.New("amf0: object name without end marker")
			}
			d.off++
			return Value{Marker: MarkerObject, Object: obj}, nil
		}
		if d.off+nameLen > len(d.buf) {
			return Value{}, errTruncated
		}
		key := string(d.buf[d.off : d.off+nameLen])
		d.off += nameLen
		v, err := d.Decode()
		if err != nil {
			return Value{}, err
		}
		obj.Set(key, v)
	}
}

func (d *Decoder) readString(lenBytes int) (string, error) {
	n, err := d.readUintN(lenBytes)
	if err != nil {
		return "", err
	}
	if d.off+int(n) > len(d.buf) {
		return "", errTruncated
	}
	s := string(d.buf[d.off : d.off+int(n)])
	d.off += int(n)
	return s, nil
}

func (d *Decoder) readUint32() (uint32, error) {
	v, err := d.readUintN(4)
	return uint32(v), err
}

func (d *Decoder) readUintN(n int) (uint64, error) {
	if d.off+n > len(d.buf) {
		return 0, errTruncated
	}
	var v uint64
	for i := 0; i < n; i++ {
		v = v<<8 | uint64(d.buf[d.off+i])
	}
	d.off += n
	return v, nil
}

func (d *Decoder) readFloat64() (float64, error) {
	if d.off+8 > len(d.buf) {
		return 0, errTruncated
	}
	bits := binary.BigEndian.Uint64(d.buf[d.off:])
	d.off += 8
	return math.Float64frombits(bits), nil
}

// Encoder writes AMF0 values.
type Encoder struct {
	buf []byte
}

// NewEncoder returns an empty encoder.
func NewEncoder() *Encoder { return &Encoder{} }

// Bytes returns the encoded bytes.
func (e *Encoder) Bytes() []byte { return e.buf }

// Len returns the encoded length.
func (e *Encoder) Len() int { return len(e.buf) }

func (e *Encoder) writeMarker(m byte) { e.buf = append(e.buf, m) }

func (e *Encoder) writeUintN(v uint64, n int) {
	for i := n - 1; i >= 0; i-- {
		e.buf = append(e.buf, byte(v>>(8*uint(i))))
	}
}

// EncodeNumber writes a Number value.
func (e *Encoder) EncodeNumber(v float64) {
	e.writeMarker(MarkerNumber)
	e.writeUintN(math.Float64bits(v), 8)
}

// EncodeBoolean writes a Boolean value.
func (e *Encoder) EncodeBoolean(v bool) {
	e.writeMarker(MarkerBoolean)
	if v {
		e.buf = append(e.buf, 1)
	} else {
		e.buf = append(e.buf, 0)
	}
}

// EncodeString writes a short String value.
func (e *Encoder) EncodeString(s string) {
	e.writeMarker(MarkerString)
	e.writeBytesAsString(s, 2)
}

// EncodeLongString writes a LongString value.
func (e *Encoder) EncodeLongString(s string) {
	e.writeMarker(MarkerLongString)
	e.writeBytesAsString(s, 4)
}

func (e *Encoder) writeBytesAsString(s string, lenBytes int) {
	e.writeUintN(uint64(len(s)), lenBytes)
	e.buf = append(e.buf, s...)
}

// EncodeNull writes a Null value.
func (e *Encoder) EncodeNull() { e.writeMarker(MarkerNull) }

// EncodePropertyName writes an object property name (no marker).
func (e *Encoder) EncodePropertyName(name string) {
	e.writeUintN(uint64(len(name)), 2)
	e.buf = append(e.buf, name...)
}

// BeginObject starts an object; EndObject terminates it.
func (e *Encoder) BeginObject() { e.writeMarker(MarkerObject) }
func (e *Encoder) EndObject() {
	e.writeUintN(0, 2)
	e.writeMarker(MarkerObjectEnd)
}

// BeginECMAArray starts an associative array.
func (e *Encoder) BeginECMAArray(approx uint32) {
	e.writeMarker(MarkerECMAArray)
	e.writeUintN(uint64(approx), 4)
}

// BeginStrictArray starts an indexed array of n values.
func (e *Encoder) BeginStrictArray(n uint32) {
	e.writeMarker(MarkerStrictArray)
	e.writeUintN(uint64(n), 4)
}

// EncodeArrayItem encodes one already-written value placeholder slot. Values
// must be written inline by the caller between Begin and End helpers.
