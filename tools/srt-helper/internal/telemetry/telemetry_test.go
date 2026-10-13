package telemetry

import (
	"math"
	"testing"

	gosrt "github.com/datarhei/gosrt"
)

func TestFromGosrtMapping(t *testing.T) {
	s := &gosrt.Statistics{
		MsTimeStamp: 4200,
		Accumulated: gosrt.StatisticsAccumulated{
			PktRecv: 100, PktRecvUnique: 95, PktRecvLoss: 5, PktRetrans: 2,
			PktRecvDrop: 1, PktRecvUndecrypt: 0, ByteRecv: 188 * 100,
		},
		Interval: gosrt.StatisticsInterval{
			MbpsRecvRate: 4.5, MsInterval: 1000,
		},
		Instantaneous: gosrt.StatisticsInstantaneous{
			MsRTT: 12.5, MbpsLinkCapacity: 100, MsRecvBuf: 300,
			MsRecvTsbPdDelay: 120, PktRecvLossRate: 2.5,
		},
	}
	sample := FromGosrt(s, true)
	if sample == nil {
		t.Fatal("nil sample")
	}
	if sample.T <= 0 {
		t.Fatal("sample timestamp must be set")
	}
	if sample.MsStamp != 4200 || sample.RTTMS != 12.5 || sample.MbpsRecv != 4.5 {
		t.Fatalf("scalars wrong: %+v", sample)
	}
	if sample.PktRecv != 100 || sample.PktRecvU != 95 || sample.PktRecvLS != 5 || sample.PktRetrans != 2 {
		t.Fatalf("packet counters wrong: %+v", sample)
	}
	if sample.MsRecvBuf != 300 || sample.MsRcvTsbpd != 120 || sample.LossRate != 2.5 {
		t.Fatalf("buffer/latency wrong: %+v", sample)
	}
	if !sample.Encrypted {
		t.Fatal("encrypted flag must pass through")
	}
}

func TestFinite(t *testing.T) {
	if Finite(math.NaN()) != 0 || Finite(math.Inf(1)) != 0 || Finite(math.Inf(-1)) != 0 {
		t.Fatal("NaN/Inf must be clamped to 0 for JSON safety")
	}
	if Finite(0) != 0 || Finite(12.5) != 12.5 || Finite(-1) != -1 {
		t.Fatal("finite values must pass through unchanged")
	}
}

func TestFromGosrtNil(t *testing.T) {
	if FromGosrt(nil, false) != nil {
		t.Fatal("nil stats must yield nil sample")
	}
}

func TestMarshal(t *testing.T) {
	sample := FromGosrt(&gosrt.Statistics{Instantaneous: gosrt.StatisticsInstantaneous{MsRTT: 1.5}}, false)
	data, err := sample.Marshal()
	if err != nil {
		t.Fatal(err)
	}
	if len(data) == 0 || data[0] != '{' {
		t.Fatalf("bad JSON: %s", data)
	}
}
