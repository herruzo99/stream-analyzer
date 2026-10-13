// Package telemetry normalizes gosrt connection statistics into the
// LinkTelemetry schema shared by every transport adapter (SRT today,
// WebRTC/WebTransport later). All fields are bounded and JSON-tagged with
// the exact names the browser-side contract expects.
package telemetry

import (
	"encoding/json"
	"time"

	gosrt "github.com/datarhei/gosrt"
)

// Sample is one normalized telemetry record.
type Sample struct {
	T          int64   `json:"t"` // epoch milliseconds
	MsStamp    uint64  `json:"msStamp"`
	RTTMS      float64 `json:"rttMs"`
	MbpsSend   float64 `json:"mbpsSendRate"`
	MbpsRecv   float64 `json:"mbpsRecvRate"`
	MbpsMaxBW  float64 `json:"mbpsMaxBw"`
	MbpsLink   float64 `json:"mbpsLinkCapacity"`
	PktSent    uint64  `json:"pktSent"`
	PktRecv    uint64  `json:"pktRecv"`
	PktSentU   uint64  `json:"pktSentUnique"`
	PktRecvU   uint64  `json:"pktRecvUnique"`
	PktSendLS  uint64  `json:"pktSendLoss"`
	PktRecvLS  uint64  `json:"pktRecvLoss"`
	PktRecvLSD uint64  `json:"pktRecvLost"`
	PktRetrans uint64  `json:"pktRetrans"`
	PktRecvRtr uint64  `json:"pktRecvRetrans"`
	PktSendDr  uint64  `json:"pktSendDrop"`
	PktRecvDr  uint64  `json:"pktRecvDrop"`
	PktBelated uint64  `json:"pktRecvBelated"`
	PktUndec   uint64  `json:"pktRecvUndecrypt"`
	PktSentACK uint64  `json:"pktSentAck"`
	PktRecvACK uint64  `json:"pktRecvAck"`
	PktSentNAK uint64  `json:"pktSentNak"`
	PktRecvNAK uint64  `json:"pktRecvNak"`
	MsSendBuf  uint64  `json:"msSendBuf"`
	MsRecvBuf  uint64  `json:"msRecvBuf"`
	ByteRecvBf uint64  `json:"byteRecvBuf"`
	PktRecvBuf uint64  `json:"pktRecvBuf"`
	PktFlight  uint64  `json:"pktFlightSize"`
	MsRcvTsbpd uint64  `json:"msRcvTsbpdDelay"`
	MsSndTsbpd uint64  `json:"msSndTsbpdDelay"`
	LossRate   float64 `json:"pktRecvLossRate"`
	Encrypted  bool    `json:"encrypted"`
}

// Finite rounds NaN/Inf values produced by zero-length stat intervals to 0
// so the JSON payload crossing into the browser is always contract-safe.
func Finite(f float64) float64 {
	if f != f || f > 1e308 || f < -1e308 { // NaN or ±Inf
		return 0
	}
	return f
}

// FromGosrt maps a gosrt Statistics snapshot (accumulated + instantaneous)
// onto the shared schema. Rates come from the interval deltas, which gosrt
// computes when the same Statistics struct is reused across calls.
func FromGosrt(s *gosrt.Statistics, encrypted bool) *Sample {
	if s == nil {
		return nil
	}
	return &Sample{
		T:          time.Now().UnixMilli(),
		MsStamp:    s.MsTimeStamp,
		RTTMS:      Finite(s.Instantaneous.MsRTT),
		MbpsSend:   Finite(s.Interval.MbpsSendRate),
		MbpsRecv:   Finite(s.Interval.MbpsRecvRate),
		MbpsMaxBW:  Finite(s.Instantaneous.MbpsMaxBW),
		MbpsLink:   Finite(s.Instantaneous.MbpsLinkCapacity),
		PktSent:    s.Accumulated.PktSent,
		PktRecv:    s.Accumulated.PktRecv,
		PktSentU:   s.Accumulated.PktSentUnique,
		PktRecvU:   s.Accumulated.PktRecvUnique,
		PktSendLS:  s.Accumulated.PktSendLoss,
		PktRecvLS:  s.Accumulated.PktRecvLoss,
		PktRecvLSD: s.Accumulated.PktRecvLost,
		PktRetrans: s.Accumulated.PktRetrans,
		PktRecvRtr: s.Accumulated.PktRecvRetrans,
		PktSendDr:  s.Accumulated.PktSendDrop,
		PktRecvDr:  s.Accumulated.PktRecvDrop,
		PktBelated: s.Accumulated.PktRecvBelated,
		PktUndec:   s.Accumulated.PktRecvUndecrypt,
		PktSentACK: s.Accumulated.PktSentACK,
		PktRecvACK: s.Accumulated.PktRecvACK,
		PktSentNAK: s.Accumulated.PktSentNAK,
		PktRecvNAK: s.Accumulated.PktRecvNAK,
		MsSendBuf:  s.Instantaneous.MsSendBuf,
		MsRecvBuf:  s.Instantaneous.MsRecvBuf,
		ByteRecvBf: s.Instantaneous.ByteRecvBuf,
		PktRecvBuf: s.Instantaneous.PktRecvBuf,
		PktFlight:  s.Instantaneous.PktFlightSize,
		MsRcvTsbpd: s.Instantaneous.MsRecvTsbPdDelay,
		MsSndTsbpd: s.Instantaneous.MsSendTsbPdDelay,
		LossRate:   Finite(s.Instantaneous.PktRecvLossRate),
		Encrypted:  encrypted,
	}
}

// Marshal returns the sample as compact JSON with inherited keys.
func (s *Sample) Marshal() ([]byte, error) {
	return json.Marshal(s)
}
