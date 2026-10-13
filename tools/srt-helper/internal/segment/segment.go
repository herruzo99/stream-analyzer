// Package segment implements the TS-aware chunker that turns a continuous
// SRT byte stream into HLS-ready segments. Segments are cut on PAT packet
// boundaries (never mid-packet) so the synthetic media playlist stays
// playable by the existing HLS pipeline, and so continuity-counter analysis
// downstream is not distorted by artificial re-alignment.
package segment

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	tsPacketSize = 188
	patPID       = 0

	// DefaultMinSegBytes is ~48 KiB of TS before a PAT-aligned cut is taken.
	DefaultMinSegBytes = tsPacketSize * 256
	// DefaultMaxSegBytes caps segment size so bitrate spikes cannot stall cuts.
	DefaultMaxSegBytes = 8 << 20
	// DefaultWindow is how many live segments are retained in memory.
	DefaultWindow = 96
)

// Segment is one cut chunk of the TS stream.
type Segment struct {
	Index   int    `json:"index"`
	Bytes   int    `json:"bytes"`
	StartMs int64  `json:"startMs"` // ms since chunker creation
	DurMs   int64  `json:"durMs"`   // wall-clock duration of this segment
	Data    []byte `json:"-"`
}

// Chunker aligns incoming bytes to TS packet boundaries and cuts segments on
// PAT boundaries. Safe for one writer goroutine plus readers via Snapshot().
type Chunker struct {
	MinSegBytes int
	MaxSegBytes int
	Window      int

	mu        sync.Mutex
	pending   []byte // bytes accumulated for the open segment
	buf       []byte // unaligned incoming bytes
	segs      []Segment
	nextIdx   int
	resyncs   int
	created   time.Time
	lastCut   time.Time
	onSegment func(index int, data []byte)

	curFirstPCR uint64 // first PCR (27MHz) of the open segment
	curLastPCR  uint64 // latest PCR (27MHz) of the open segment
	curHasPCR   bool
}

// NewChunker returns a chunker with defaults where values are zero.
func NewChunker() *Chunker {
	now := time.Now()
	return &Chunker{
		MinSegBytes: DefaultMinSegBytes,
		MaxSegBytes: DefaultMaxSegBytes,
		Window:      DefaultWindow,
		created:     now,
		lastCut:     now,
	}
}

// OnSegment registers a hook invoked synchronously for every closed segment.
func (c *Chunker) OnSegment(fn func(index int, data []byte)) {
	c.mu.Lock()
	c.onSegment = fn
	c.mu.Unlock()
}

// Stats returns diagnostic counters (resyncs = TS sync failures observed).
func (c *Chunker) Stats() (segments, bytes, resyncs int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, s := range c.segs {
		bytes += s.Bytes
	}
	return len(c.segs), bytes + len(c.pending), c.resyncs
}

// Write feeds received bytes and returns segments closed by this call.
func (c *Chunker) Write(data []byte) []Segment {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.buf = append(c.buf, data...)
	var cut []Segment

	for len(c.buf) >= tsPacketSize {
		if c.buf[0] != 0x47 {
			idx := c.findSync()
			if idx < 0 {
				break // wait for more bytes to validate a resync point
			}
			c.buf = c.buf[idx:]
			c.resyncs++
			continue
		}
		pkt := c.buf[:tsPacketSize]
		isPAT := pkt[1]&0x40 != 0 && pidOf(pkt) == patPID
		cur := len(c.pending)
		if cur > 0 && ((isPAT && cur >= c.MinSegBytes) || cur >= c.MaxSegBytes) {
			cut = append(cut, c.closeLocked())
		}
		c.pending = append(c.pending, pkt...)
		if pcr, ok := packetPCR(pkt); ok {
			if !c.curHasPCR {
				c.curFirstPCR = pcr
				c.curHasPCR = true
			}
			c.curLastPCR = pcr
		}
		c.buf = c.buf[tsPacketSize:]
	}
	return cut
}

// findSync returns the offset of the next plausible TS sync position,
// validating three consecutive packet starts. May consume the whole buffer
// when nothing plausible remains.
func (c *Chunker) findSync() int {
	for i := 1; i+3*tsPacketSize <= len(c.buf); i++ {
		if c.buf[i] != 0x47 {
			continue
		}
		ok := true
		for k := 1; k <= 2; k++ {
			if c.buf[i+k*tsPacketSize] != 0x47 {
				ok = false
				break
			}
		}
		if ok {
			return i
		}
	}
	return -1
}

// closeLocked finalizes the open segment. Caller holds the mutex.
func (c *Chunker) closeLocked() Segment {
	now := time.Now()
	// Prefer real media timing: PCR-derived duration inside the segment,
	// falling back to wall-clock when no PCR was seen (audio elementary
	// streams or broken sources).
	var durMs int64
	if c.curHasPCR && c.curLastPCR >= c.curFirstPCR {
		durMs = int64((c.curLastPCR - c.curFirstPCR) / 27000) // PCR runs at 27 MHz
	}
	seg := Segment{
		Index:   c.nextIdx,
		Bytes:   len(c.pending),
		StartMs: now.Sub(c.created).Milliseconds(),
		DurMs:   durMs,
		Data:    append([]byte(nil), c.pending...),
	}
	c.nextIdx++
	c.lastCut = now
	c.pending = c.pending[:0]
	c.curHasPCR = false
	c.segs = append(c.segs, seg)
	if c.Window > 0 && len(c.segs) > c.Window {
		drop := len(c.segs) - c.Window
		c.segs = append([]Segment(nil), c.segs[drop:]...)
	}
	if c.onSegment != nil {
		c.onSegment(seg.Index, seg.Data)
	}
	return seg
}

// Flush forces a cut of the pending packets at end of session so the tail
// remains analyzable. Returns nil when nothing complete was pending.
func (c *Chunker) Flush() *Segment {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.pending) == 0 {
		return nil
	}
	seg := c.closeLocked()
	return &seg
}

// Snapshot returns a copy of the live window.
func (c *Chunker) Snapshot() []Segment {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]Segment, len(c.segs))
	copy(out, c.segs)
	return out
}

// Get returns one live segment by index, if still retained.
func (c *Chunker) Get(index int) ([]byte, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, s := range c.segs {
		if s.Index == index {
			return append([]byte(nil), s.Data...), true
		}
	}
	return nil, false
}

func pidOf(pkt []byte) int {
	return int(pkt[1]&0x1f)<<8 | int(pkt[2])
}

// packetPCR extracts the Program Clock Reference from a TS packet (if the
// adaptation field carries one). Returned in 27 MHz ticks.
func packetPCR(pkt []byte) (uint64, bool) {
	if len(pkt) < tsPacketSize {
		return 0, false
	}
	afc := (pkt[3] >> 4) & 0x3
	if afc != 2 && afc != 3 {
		return 0, false // no adaptation field
	}
	afLen := int(pkt[4])
	if afLen < 7 || 5+afLen > tsPacketSize {
		return 0, false
	}
	if pkt[5]&0x10 == 0 {
		return 0, false // no PCR flag
	}
	base := uint64(pkt[6])<<25 | uint64(pkt[7])<<17 | uint64(pkt[8])<<9 |
		uint64(pkt[9])<<1 | uint64(pkt[10]>>7)
	ext := (uint64(pkt[10]&0x01) << 8) | uint64(pkt[11])
	return base*300 + ext, true
}

// LivePlaylist renders the sliding-window media playlist for a session.
func LivePlaylist(baseURL string, segs []Segment, targetDur int) string {
	var b strings.Builder
	b.WriteString("#EXTM3U\n")
	b.WriteString("#EXT-X-VERSION:3\n")
	fmt.Fprintf(&b, "#EXT-X-TARGETDURATION:%d\n", targetDur)
	b.WriteString("#EXT-X-INDEPENDENT-SEGMENTS\n")
	if len(segs) > 0 {
		fmt.Fprintf(&b, "#EXT-X-MEDIA-SEQUENCE:%d\n", segs[0].Index)
	}
	for _, s := range segs {
		fmt.Fprintf(&b, "#EXTINF:%.3f,\n", extinfDur(s.DurMs))
		fmt.Fprintf(&b, "%schunks/%d.ts\n", baseURL, s.Index)
	}
	return b.String()
}

// VodPlaylist renders a complete playlist for a recording.
func VodPlaylist(baseURL string, segs []Segment, targetDur int) string {
	var b strings.Builder
	b.WriteString("#EXTM3U\n")
	b.WriteString("#EXT-X-VERSION:3\n")
	b.WriteString("#EXT-X-PLAYLIST-TYPE:VOD\n")
	fmt.Fprintf(&b, "#EXT-X-TARGETDURATION:%d\n", targetDur)
	b.WriteString("#EXT-X-INDEPENDENT-SEGMENTS\n")
	for _, s := range segs {
		fmt.Fprintf(&b, "#EXTINF:%.3f,\n", extinfDur(s.DurMs))
		fmt.Fprintf(&b, "%schunks/%d.ts\n", baseURL, s.Index)
	}
	b.WriteString("#EXT-X-ENDLIST\n")
	return b.String()
}

func extinfDur(durMs int64) float64 {
	d := float64(durMs) / 1000.0
	if d < 0.001 {
		return 0.001
	}
	return d
}

// TargetDuration returns the playlist target duration (max segment duration
// rounded up, minimum 1).
func TargetDuration(segs []Segment) int {
	max := int64(0)
	for _, s := range segs {
		if s.DurMs > max {
			max = s.DurMs
		}
	}
	d := int(math.Ceil(float64(max) / 1000.0))
	if d < 1 {
		return 1
	}
	return d
}

// Recorder persists every closed segment under <dir>/<sessionID>.
type Recorder struct {
	Dir   string
	mu    sync.Mutex
	metas map[string]*Recording
}

// Recording describes a persisted session.
type Recording struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	StartedAt time.Time `json:"startedAt"`
	EndedAt   time.Time `json:"endedAt,omitempty"`
	Peer      string    `json:"peer,omitempty"`
	StreamID  string    `json:"streamId,omitempty"`
	Encrypted bool      `json:"encrypted"`
	Segments  []SegMeta `json:"segments"`
	Dir       string    `json:"-"`
}

// SegMeta is the on-disk record of one segment.
type SegMeta struct {
	Index int    `json:"index"`
	Bytes int    `json:"bytes"`
	DurMS int64  `json:"durMs"`
	File  string `json:"file"`
}

// NewRecorder creates the recordings root directory.
func NewRecorder(dir string) (*Recorder, error) {
	if dir == "" {
		dir = "recordings"
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &Recorder{Dir: dir, metas: map[string]*Recording{}}, nil
}

// StartRecording registers a recording for a session.
func (r *Recorder) StartRecording(id, url, streamID, peer string, encrypted bool) (*Recording, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.metas[id]; exists {
		return nil, fmt.Errorf("recording %s already exists", id)
	}
	dir := filepath.Join(r.Dir, id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	rec := &Recording{
		ID:        id,
		URL:       url,
		StartedAt: time.Now(),
		StreamID:  streamID,
		Peer:      peer,
		Encrypted: encrypted,
		Dir:       dir,
	}
	r.metas[id] = rec
	return rec, nil
}

// AddSegment writes one segment file and records its metadata.
func (r *Recorder) AddSegment(id string, seg Segment) error {
	r.mu.Lock()
	rec, ok := r.metas[id]
	r.mu.Unlock()
	if !ok {
		return fmt.Errorf("unknown recording %s", id)
	}
	name := fmt.Sprintf("%d.ts", seg.Index)
	if err := os.WriteFile(filepath.Join(rec.Dir, name), seg.Data, 0o644); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	rec.Segments = append(rec.Segments, SegMeta{
		Index: seg.Index, Bytes: seg.Bytes, DurMS: seg.DurMs, File: name,
	})
	return nil
}

// Stop marks the recording finished and writes meta.json.
func (r *Recorder) Stop(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	rec, ok := r.metas[id]
	if !ok {
		return nil
	}
	rec.EndedAt = time.Now()
	data, err := json.MarshalIndent(rec, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(rec.Dir, "meta.json"), data, 0o644)
}

// LoadRecording reads a persisted recording from disk.
func (r *Recorder) LoadRecording(id string) (*Recording, error) {
	path := filepath.Join(r.Dir, id, "meta.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var rec Recording
	if err := json.Unmarshal(data, &rec); err != nil {
		return nil, err
	}
	rec.Dir = filepath.Join(r.Dir, id)
	return &rec, nil
}

// ListRecordings returns all recordings currently in memory.
func (r *Recorder) ListRecordings() []*Recording {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]*Recording, 0, len(r.metas))
	for _, rec := range r.metas {
		out = append(out, rec)
	}
	return out
}

// SegmentsFromRecording converts recording metadata into playlist segments.
func SegmentsFromRecording(rec *Recording) []Segment {
	out := make([]Segment, 0, len(rec.Segments))
	for _, s := range rec.Segments {
		out = append(out, Segment{Index: s.Index, Bytes: s.Bytes, DurMs: s.DurMS})
	}
	return out
}

// ReadSegment loads a persisted segment's bytes from disk.
func (rec *Recording) ReadSegment(index int) ([]byte, bool) {
	for _, s := range rec.Segments {
		if s.Index == index {
			data, err := os.ReadFile(filepath.Join(rec.Dir, s.File))
			if err != nil {
				return nil, false
			}
			return data, true
		}
	}
	return nil, false
}
