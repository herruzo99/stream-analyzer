package segment

import (
	"strings"
	"testing"
)

func bigSegment(index int) Segment {
	return Segment{Index: index, Bytes: 1000, DurMs: 10, Data: []byte(strings.Repeat("x", 1000))}
}

func TestRecorderDiskBudget(t *testing.T) {
	dir := t.TempDir()
	rec, err := NewRecorder(dir)
	if err != nil {
		t.Fatal(err)
	}
	rec.MaxTotalBytes = 2500 // enough for 2 segments of 1000 bytes
	if _, err := rec.StartRecording("s1-rec", "srt://x:1", "live/1", "127.0.0.1:5", true); err != nil {
		t.Fatal(err)
	}

	if err := rec.AddSegment("s1-rec", bigSegment(0)); err != nil {
		t.Fatal(err)
	}
	if err := rec.AddSegment("s1-rec", bigSegment(1)); err != nil {
		t.Fatal(err)
	}
	// This one would exceed the budget: dropped, recording flagged truncated.
	if err := rec.AddSegment("s1-rec", bigSegment(2)); err != nil {
		t.Fatal(err)
	}

	if err := rec.Stop("s1-rec"); err != nil {
		t.Fatal(err)
	}
	loaded, err := rec.LoadRecording("s1-rec")
	if err != nil {
		t.Fatal(err)
	}
	if len(loaded.Segments) != 2 {
		t.Fatalf("segments = %d, want 2", len(loaded.Segments))
	}
	if !loaded.Truncated {
		t.Fatal("recording must be flagged truncated when the budget is hit")
	}
	// What was written stays replayable.
	if _, ok := loaded.ReadSegment(1); !ok {
		t.Fatal("written segments must remain readable")
	}
	if _, ok := loaded.ReadSegment(2); ok {
		t.Fatal("dropped segment must not be readable")
	}
}

func TestRecorderNoBudgetUnlimited(t *testing.T) {
	dir := t.TempDir()
	rec, err := NewRecorder(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := rec.StartRecording("s1-rec", "srt://x:1", "", "", false); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 10; i++ {
		if err := rec.AddSegment("s1-rec", bigSegment(i)); err != nil {
			t.Fatal(err)
		}
	}
	if err := rec.Stop("s1-rec"); err != nil {
		t.Fatal(err)
	}
	loaded, err := rec.LoadRecording("s1-rec")
	if err != nil {
		t.Fatal(err)
	}
	if len(loaded.Segments) != 10 || loaded.Truncated {
		t.Fatalf("unlimited recorder: %d segments truncated=%v", len(loaded.Segments), loaded.Truncated)
	}
}
