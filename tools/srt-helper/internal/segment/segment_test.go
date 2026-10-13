package segment

import (
	"bytes"
	"strings"
	"testing"
)

// tsPacket builds a minimal, structurally valid 188-byte TS packet.
func tsPacket(pid int, pus bool, fill byte) []byte {
	p := make([]byte, 188)
	p[0] = 0x47
	if pus {
		p[1] |= 0x40
	}
	p[1] |= byte(pid >> 8)
	p[2] = byte(pid)
	p[3] = 0x10 // payload only, continuity counter 0
	for i := 4; i < 188; i++ {
		p[i] = fill
	}
	return p
}

// stream builds n packets: a PAT every patEvery packets, one PMT, rest padding.
func stream(n, patEvery int) []byte {
	var buf bytes.Buffer
	for i := 0; i < n; i++ {
		switch {
		case i%patEvery == 0:
			buf.Write(tsPacket(0, true, 'P'))
		case i%(patEvery+1) == 0:
			buf.Write(tsPacket(0x1000, true, 'M'))
		default:
			buf.Write(tsPacket(0x100, false, 'V'))
		}
	}
	return buf.Bytes()
}

func TestChunkerCutsOnPAT(t *testing.T) {
	c := NewChunker()
	c.MinSegBytes = 188 * 300
	c.MaxSegBytes = 8 << 20

	data := stream(4000, 40) // ~100 PATs, each PAT well over min
	var segs []Segment
	for off := 0; off < len(data); off += 1500 { // odd write sizes
		end := off + 1500
		if end > len(data) {
			end = len(data)
		}
		segs = append(segs, c.Write(data[off:end])...)
	}
	if len(segs) < 5 {
		t.Fatalf("expected at least 5 segments, got %d", len(segs))
	}
	for _, s := range segs {
		if s.Bytes%188 != 0 {
			t.Fatalf("segment %d not packet aligned: %d bytes", s.Index, s.Bytes)
		}
		if s.Bytes < c.MinSegBytes {
			t.Fatalf("segment %d below min: %d", s.Index, s.Bytes)
		}
		if s.Data[0] != 0x47 {
			t.Fatalf("segment %d does not start with sync byte", s.Index)
		}
		// First packet of every segment must be a PAT (PID 0, PUSI set).
		if !(s.Data[1]&0x40 != 0 && s.Data[1]&0x1f == 0 && s.Data[2] == 0) {
			t.Fatalf("segment %d does not start on a PAT", s.Index)
		}
	}
	if segs[0].Index != 0 || segs[1].Index != 1 {
		t.Fatalf("segment indices not sequential: %d, %d", segs[0].Index, segs[1].Index)
	}
}

func TestChunkerWindowAndGet(t *testing.T) {
	c := NewChunker()
	c.MinSegBytes = 188 * 250
	c.Window = 5
	c.Write(stream(3000, 30))
	if snap := c.Snapshot(); len(snap) != 5 {
		t.Fatalf("window = %d, want 5", len(snap))
	}
	first := c.Snapshot()[0].Index
	data, ok := c.Get(first)
	if !ok || len(data) == 0 || data[0] != 0x47 {
		t.Fatalf("Get(%d) failed ok=%v bytes=%d", first, ok, len(data))
	}
	if _, ok := c.Get(first - 1); ok {
		t.Fatal("evicted segment should not be retrievable")
	}
}

func TestChunkerResyncAfterGarbage(t *testing.T) {
	c := NewChunker()
	c.MinSegBytes = 188 * 250
	good := stream(600, 20)
	garbage := []byte("NOT TS DATA NOT TS DATA NOT TS DATA") // 39 bytes of junk
	if out := c.Write(garbage); len(out) != 0 {
		t.Fatal("garbage must not produce segments")
	}
	segs := c.Write(good)
	_, _, resyncs := c.Stats()
	if resyncs == 0 {
		t.Fatal("resync counter should have incremented")
	}
	// After resync, whatever segments exist must still be packet aligned.
	for _, s := range segs {
		if s.Bytes%188 != 0 || s.Data[0] != 0x47 {
			t.Fatalf("segment %d misaligned after resync", s.Index)
		}
	}
}

func TestChunkerFlush(t *testing.T) {
	c := NewChunker()
	c.MinSegBytes = 188 * 250
	c.Write(stream(200, 20)) // below min: nothing cut yet
	if tail := c.Flush(); tail == nil {
		t.Fatal("Flush should emit the pending tail")
	} else if tail.Bytes%188 != 0 {
		t.Fatalf("tail not aligned: %d", tail.Bytes)
	}
	if again := c.Flush(); again != nil {
		t.Fatal("second Flush must be empty")
	}
}

func TestPlaylists(t *testing.T) {
	segs := []Segment{
		{Index: 5, Bytes: 48128, DurMs: 400},
		{Index: 6, Bytes: 48128, DurMs: 600},
	}
	live := LivePlaylist("/sessions/s1/", segs, TargetDuration(segs))
	for _, want := range []string{"#EXTM3U", "#EXT-X-MEDIA-SEQUENCE:5", "#EXTINF:0.400,", "/sessions/s1/chunks/5.ts"} {
		if !strings.Contains(live, want) {
			t.Fatalf("live playlist missing %q:\n%s", want, live)
		}
	}
	if strings.Contains(live, "ENDLIST") {
		t.Fatal("live playlist must not have ENDLIST")
	}
	vod := VodPlaylist("/recordings/r1/", segs, TargetDuration(segs))
	for _, want := range []string{"#EXT-X-PLAYLIST-TYPE:VOD", "#EXT-X-ENDLIST", "/recordings/r1/chunks/6.ts"} {
		if !strings.Contains(vod, want) {
			t.Fatalf("vod playlist missing %q:\n%s", want, vod)
		}
	}
	if TargetDuration(segments()) < 1 {
		t.Fatal("target duration must be at least 1")
	}
}

func segments() []Segment { return nil }

func TestRecorderRoundTrip(t *testing.T) {
	dir := t.TempDir()
	rec, err := NewRecorder(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := rec.StartRecording("s1-rec", "srt://x:1", "live/1", "127.0.0.1:5", true); err != nil {
		t.Fatal(err)
	}
	seg := Segment{Index: 0, Bytes: 188, DurMs: 10, Data: stream(1, 1)}
	if err := rec.AddSegment("s1-rec", seg); err != nil {
		t.Fatal(err)
	}
	if err := rec.Stop("s1-rec"); err != nil {
		t.Fatal(err)
	}
	loaded, err := rec.LoadRecording("s1-rec")
	if err != nil {
		t.Fatal(err)
	}
	if len(loaded.Segments) != 1 || loaded.Segments[0].Bytes != 188 {
		t.Fatalf("loaded = %+v", loaded)
	}
	data, ok := loaded.ReadSegment(0)
	if !ok || len(data) != 188 || data[0] != 0x47 {
		t.Fatalf("ReadSegment failed ok=%v bytes=%d", ok, len(data))
	}
	if _, err := rec.LoadRecording("missing"); err == nil {
		t.Fatal("unknown recording should error")
	}
}
