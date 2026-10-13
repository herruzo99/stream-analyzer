package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/segment"
	"github.com/herruzo/stream-analyzer/helper/internal/session"
	"github.com/herruzo/stream-analyzer/helper/internal/telemetry"
	"github.com/herruzo/stream-analyzer/helper/internal/updater"
)

func TestRenderPrometheus(t *testing.T) {
	sessions := []session.Summary{
		{
			ID: "s1", Mode: session.ModePush, Status: session.StatusConnected,
			Encrypted: true, Segments: 12, Bytes: 500000,
			Latest: &telemetry.Sample{
				RTTMS: 12.5, MbpsRecv: 6.2, MbpsSend: 0, MbpsLink: 100,
				PktRecv: 3000, PktRecvLSD: 4, PktRecvLS: 2, PktRetrans: 7,
				PktRecvDr: 1, PktBelated: 3, PktUndec: 0, MsSendBuf: 40,
				MsRecvBuf: 120, MsRcvTsbpd: 250, MsSndTsbpd: 0, LossRate: 0.2, Encrypted: true,
			},
		},
		{ID: "s2", Mode: session.ModePull, Status: session.StatusError, Segments: 0},
	}
	out := renderPrometheus(sessions, "1.0.0", "linux/amd64", 1)

	for _, want := range []string{
		"# HELP stream_analyzer_helper_up",
		"stream_analyzer_helper_up 1",
		"# TYPE stream_analyzer_helper_active_sessions gauge",
		"stream_analyzer_helper_active_sessions 1",
		`srt_rtt_ms{encrypted="true",mode="push",session="s1"} 12.5`,
		`srt_mbps_recv_rate{encrypted="true",mode="push",session="s1"} 6.2`,
		`srt_pkt_recv_total{encrypted="true",mode="push",session="s1"} 3000`,
		`srt_ms_rcv_tsbpd_delay{encrypted="true",mode="push",session="s1"} 250`,
		`srt_session_connected{encrypted="false",mode="pull",session="s2"} 0`,
		"stream_analyzer_helper_build{version=\"1.0.0\",platform=\"linux/amd64\"} 1",
	} {
		if !strings.Contains(out, want) {
			t.Fatalf("metrics output missing %q\n%s", want, out)
		}
	}
	// Invalid UTF-8 tolerant format: everything is plain ASCII here.
	for _, line := range strings.Split(out, "\n") {
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "# ") {
			continue
		}
		if !strings.Contains(line, " ") {
			t.Fatalf("metric line without value: %q", line)
		}
	}
}

func TestRenderPrometheusEmpty(t *testing.T) {
	out := renderPrometheus(nil, "1.0.0", "linux/amd64", 0)
	if !strings.Contains(out, "stream_analyzer_helper_up 1") || !strings.Contains(out, "active_sessions 0") {
		t.Fatalf("empty render broken:\n%s", out)
	}
}

func TestMetricsEndpointAndHandshakesEndpoint(t *testing.T) {
	rec, err := segment.NewRecorder(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	m := session.NewManager(session.Options{Recorder: rec})
	upd := updater.New("", "1.0.0", time.Hour)
	server := NewServer(m, upd, "1.0.0", "abc", "2026-10-14", "test-token", nil, nil)
	ts := httptest.NewServer(server.Routes())
	defer ts.Close()

	req, _ := http.NewRequest("GET", ts.URL+"/metrics", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "text/plain") {
		t.Fatalf("content-type = %q", ct)
	}
	body := make([]byte, 4096)
	n, _ := resp.Body.Read(body)
	if !strings.Contains(string(body[:n]), "stream_analyzer_helper_up 1") {
		t.Fatalf("bad metrics body: %s", body[:n])
	}

	// Unknown session for handshakes: 404.
	req2, _ := http.NewRequest("GET", ts.URL+"/sessions/nope/handshake", nil)
	req2.Header.Set("Authorization", "Bearer test-token")
	resp2, err := http.DefaultClient.Do(req2)
	if err != nil {
		t.Fatal(err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusNotFound {
		t.Fatalf("handshakes unknown = %d", resp2.StatusCode)
	}
}
