package telemetry

import (
	"testing"
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/rtmp"
)

func TestFromRtmpHonestNullsAndDeltas(t *testing.T) {
	prev := rtmp.StatsSnapshot{BytesRecvTotal: 1000, AudioTags: 5, VideoTags: 7}
	cur := rtmp.StatsSnapshot{
		BytesRecvTotal: 3000, AudioTags: 25, VideoTags: 14,
		WindowAckSize: 2_500_000, NegotiatedChunk: 4096,
		Keyframes: 2, MetadataSeen: true,
	}
	prevAt := time.UnixMilli(1_000_000)
	now := time.UnixMilli(1_001_000) // 1 s later

	s := FromRtmp(prev, cur, prevAt, now)

	if s.Rtmp == nil {
		t.Fatal("rtmp block missing")
	}
	if s.Rtmp["audioTagsDelta"].(uint64) != 20 || s.Rtmp["videoTagsDelta"].(uint64) != 7 {
		t.Fatalf("deltas: %+v", s.Rtmp)
	}
	if s.Rtmp["windowAckSize"].(uint32) != 2_500_000 {
		t.Fatalf("window ack: %v", s.Rtmp["windowAckSize"])
	}
	if s.Rtmp["negotiatedChunkSize"].(uint32) != 4096 {
		t.Fatalf("chunk size: %v", s.Rtmp["negotiatedChunkSize"])
	}
	// RTMP has no RTT or loss channel: those LinkTelemetry fields stay zero
	// and the browser side maps them to null with a documented reason.
	if s.RTTMS != 0 || s.PktRecvLSD != 0 || s.LossRate != 0 {
		t.Fatalf("expected zeroed RTT/loss fields: %+v", s)
	}
	if s.MbpsRecv <= 0 {
		t.Fatalf("mbpsRecv: %v", s.MbpsRecv)
	}
}

func TestFromRtmpZeroIntervalIsSafe(t *testing.T) {
	s := FromRtmp(rtmp.StatsSnapshot{}, rtmp.StatsSnapshot{}, time.UnixMilli(5), time.UnixMilli(5))
	if s.MbpsRecv != 0 || s.MbpsSend != 0 {
		t.Fatalf("expected zero rates for a zero interval: %+v", s)
	}
}
