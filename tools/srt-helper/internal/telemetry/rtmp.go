package telemetry

import (
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/rtmp"
)

// FromRtmp maps one RTMP session snapshot onto the shared LinkTelemetry
// sample. RTMP has no RTT or packet-loss channel (TCP hides it; only the C1/S1
// time fields give a one-shot estimate), so those fields stay zero and the
// rtmp object carries the protocol's real counters.
func FromRtmp(prev, cur rtmp.StatsSnapshot, prevAt, now time.Time) Sample {
	intervalMs := now.UnixMilli() - prevAt.UnixMilli()
	if intervalMs <= 0 {
		intervalMs = 1
	}
	dRecv := cur.BytesRecvTotal - prev.BytesRecvTotal
	dSent := cur.BytesSentTotal - prev.BytesSentTotal

	return Sample{
		T:        now.UnixMilli(),
		MsStamp:  uint64(now.UnixMilli()),
		MbpsSend: Finite(float64(dSent) * 8 / 1048576 / (float64(intervalMs) / 1000)),
		MbpsRecv: Finite(float64(dRecv) * 8 / 1048576 / (float64(intervalMs) / 1000)),
		// The command channel is ours to interpret: no SRT-style crypto state.
		Encrypted: true,
		Rtmp: map[string]any{
			"bytesRecvTotal":      cur.BytesRecvTotal,
			"bytesSentTotal":      cur.BytesSentTotal,
			"chunkCount":          cur.ChunkCount,
			"messageCount":        cur.MessageCount,
			"audioTags":           cur.AudioTags,
			"videoTags":           cur.VideoTags,
			"scriptTags":          cur.ScriptTags,
			"audioTagsDelta":      cur.AudioTags - prev.AudioTags,
			"videoTagsDelta":      cur.VideoTags - prev.VideoTags,
			"ackSequence":         cur.AckSequence,
			"windowAckSize":       cur.WindowAckSize,
			"peerBandwidth":       cur.PeerBandwidth,
			"negotiatedChunkSize": cur.NegotiatedChunk,
			"serverChunkSize":     cur.ServerChunkSize,
			"handshakeRttMs":      cur.HandshakeRTTMs,
			"videoKeyframes":      cur.Keyframes,
			"metadataSeen":        cur.MetadataSeen,
		},
	}
}
