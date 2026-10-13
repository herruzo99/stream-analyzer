package segment

import (
	"bytes"
	"testing"
)

// pcrPacket builds a TS packet carrying a PCR (adaptation field, PCR flag).
func pcrPacket(pid int, pcr27MHz uint64) []byte {
	p := make([]byte, 188)
	p[0] = 0x47
	p[1] = byte(pid >> 8)
	p[2] = byte(pid)
	p[3] = 0x30 // adaptation+payload, CC=0
	// adaptation field: length, flags(PCR), PCR 33+9 bits, stuffing
	af := p[4:]
	afLen := 183
	af[0] = byte(afLen)
	af[1] = 0x10 // PCR flag
	base := pcr27MHz / 300
	ext := pcr27MHz % 300
	af[2] = byte(base >> 25)
	af[3] = byte(base >> 17)
	af[4] = byte(base >> 9)
	af[5] = byte(base >> 1)
	af[6] = byte((base&1)<<6) | 0x7E | byte(ext>>8)
	af[7] = byte(ext)
	for i := 8; i <= afLen; i++ {
		af[i] = 0xFF // stuffing
	}
	return p
}

func TestPacketPCRExtraction(t *testing.T) {
	p := pcrPacket(0x100, 300000*300) // 300 s in 27MHz ticks
	got, ok := packetPCR(p)
	if !ok {
		t.Fatal("PCR flag set but not extracted")
	}
	if got != 300000*300 {
		t.Fatalf("PCR = %d, want %d", got, 300000*300)
	}

	// No adaptation field -> no PCR.
	q := tsPacket(0x100, false, 'V')
	if _, ok := packetPCR(q); ok {
		t.Fatal("packet without adaptation field must not carry PCR")
	}
}

func TestChunkerPCRDurations(t *testing.T) {
	c := NewChunker()
	c.MinSegBytes = 188 * 10

	var buf bytes.Buffer
	// Two segments' worth: PAT, then 9 PCR-carrying video packets spanning
	// 3 seconds of 27MHz time, then the next PAT.
	pcr := uint64(0)
	for i := 0; i < 2; i++ {
		buf.Write(tsPacket(0, true, 'P'))
		for j := 0; j < 9; j++ {
			buf.Write(pcrPacket(0x100, pcr))
			pcr += 27_000_000 / 10 // 100 ms of 27MHz time per packet
		}
	}
	segs := c.Write(buf.Bytes())
	if len(segs) == 0 {
		t.Fatal("no segments cut")
	}
	last := segs[len(segs)-1]
	// 10 packets at 100 ms each = ~1000 ms expected in the segment.
	if last.DurMs < 700 || last.DurMs > 900 {
		t.Fatalf("PCR duration = %d ms, want ~1000", last.DurMs)
	}

	// Flush must also carry a sane duration.
	tail := c.Flush()
	if tail == nil || tail.DurMs < 700 {
		t.Fatalf("flushed tail duration = %v", tail)
	}
}
