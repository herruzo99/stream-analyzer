package api

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	gosrt "github.com/datarhei/gosrt"
	"github.com/herruzo/stream-analyzer/helper/internal/segment"
	"github.com/herruzo/stream-analyzer/helper/internal/session"
	"github.com/herruzo/stream-analyzer/helper/internal/updater"
)

const testToken = "test-token-0123456789abcdef"

func newTestServer(t *testing.T) (*httptest.Server, *session.Manager) {
	t.Helper()
	rec, err := segment.NewRecorder(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	m := session.NewManager(session.Options{Recorder: rec, MinSegBytes: 188 * 250, Window: 32})
	upd := updater.New("", "1.2.0", time.Hour)
	server := NewServer(m, upd, "1.2.0", "abc123", "2026-10-14", testToken, []string{"http://localhost"}, nil)
	go server.RunSSE()
	ts := httptest.NewServer(server.Routes())
	t.Cleanup(ts.Close)
	return ts, m
}

func authGet(t *testing.T, url string, want int) *http.Response {
	t.Helper()
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	req.Header.Set("Authorization", "Bearer "+testToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != want {
		t.Fatalf("GET %s = %d, want %d", url, resp.StatusCode, want)
	}
	return resp
}

func TestAuthRequired(t *testing.T) {
	ts, _ := newTestServer(t)
	resp, err := http.Get(ts.URL + "/health")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("no-token /health = %d, want 401", resp.StatusCode)
	}
	resp = authGet(t, ts.URL+"/health", http.StatusOK)
	defer resp.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["ok"] != true || body["helperProtocol"].(float64) != HelperProtocol {
		t.Fatalf("health payload = %v", body)
	}
}

func TestOptionsPreflightPNA(t *testing.T) {
	ts, _ := newTestServer(t)
	req, _ := http.NewRequest(http.MethodOptions, ts.URL+"/sessions", nil)
	req.Header.Set("Origin", "http://localhost")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("OPTIONS = %d", resp.StatusCode)
	}
	if got := resp.Header.Get("Access-Control-Allow-Private-Network"); got != "true" {
		t.Fatalf("PNA header = %q", got)
	}
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "http://localhost" {
		t.Fatalf("ACAO = %q", got)
	}
}

func TestVersionIncludesUpdateState(t *testing.T) {
	ts, _ := newTestServer(t)
	resp := authGet(t, ts.URL+"/version", http.StatusOK)
	defer resp.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["version"] != "1.2.0" || body["platform"] == nil {
		t.Fatalf("version payload = %v", body)
	}
	upd, ok := body["update"].(map[string]any)
	if !ok || upd["state"] != "unknown" {
		t.Fatalf("update state = %v", body["update"])
	}
}

func TestCreateSessionValidation(t *testing.T) {
	ts, _ := newTestServer(t)
	for _, bad := range []string{"", "not-a-url", "http://example.com/x", "srt://host"} {
		resp, err := postJSON(ts, "/sessions", fmt.Sprintf(`{"url":%q}`, bad))
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("POST url=%q = %d, want 400", bad, resp.StatusCode)
		}
		resp.Body.Close()
	}
}

func postJSON(ts *httptest.Server, path, body string) (*http.Response, error) {
	req, _ := http.NewRequest(http.MethodPost, ts.URL+path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+testToken)
	req.Header.Set("Content-Type", "application/json")
	return http.DefaultClient.Do(req)
}

// TestFullSessionLifecycle runs a REAL loopback SRT session through the
// control plane: listener created over HTTP, ffmpeg-style publisher attached
// via gosrt, synthetic playlist + chunk served, then stopped and replayed.
func TestFullSessionLifecycle(t *testing.T) {
	ts, _ := newTestServer(t)

	// Subscribe to SSE before creating the session so the event is captured.
	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/events?token="+testToken, nil)
	sseResp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer sseResp.Body.Close()
	sseLines := make(chan string, 8)
	go func() {
		sc := bufio.NewScanner(sseResp.Body)
		for sc.Scan() {
			if line := sc.Text(); len(line) > 7 && line[:7] == "event: " {
				sseLines <- line[7:]
			}
		}
	}()

	port := freeTestPort()
	listenURL := fmt.Sprintf("srt://127.0.0.1:%d?mode=listener&passphrase=0123456789", port)
	resp, err := postJSON(ts, "/sessions", fmt.Sprintf(`{"url":%q,"record":false}`, listenURL))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create = %d", resp.StatusCode)
	}
	var created map[string]any
	json.NewDecoder(resp.Body).Decode(&created)
	resp.Body.Close()
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatalf("no session id: %v", created)
	}

	select {
	case ev := <-sseLines:
		if ev != session.EventSession {
			t.Fatalf("first SSE event = %s", ev)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("no SSE session event")
	}

	// Publisher.
	done := make(chan struct{})
	go func() {
		cfg := gosrt.DefaultConfig()
		cfg.StreamId = "live/web"
		cfg.Passphrase = "0123456789"
		conn, err := gosrt.Dial("srt", fmt.Sprintf("127.0.0.1:%d", port), cfg)
		if err != nil {
			t.Errorf("publisher dial failed: %v", err)
			close(done)
			return
		}
		defer conn.Close()
		data := make([]byte, 0, 2600*188)
		for i := 0; i < 2600; i++ {
			p := make([]byte, 188)
			p[0] = 0x47
			if i%40 == 0 {
				p[1] = 0x40 // PAT
			} else {
				p[1] = 0x01 // PID 0x100
				p[2] = 0x00
			}
			p[3] = 0x10
			data = append(data, p...)
		}
		for off := 0; off < len(data); off += 1316 {
			end := off + 1316
			if end > len(data) {
				end = len(data)
			}
			if _, err := conn.Write(data[off:end]); err != nil {
				break
			}
			time.Sleep(15 * time.Millisecond)
		}
		time.Sleep(400 * time.Millisecond)
		close(done)
	}()
	<-done

	// Detail shows connected + streamid.
	detailResp := authGet(t, fmt.Sprintf("%s/sessions/%s", ts.URL, id), http.StatusOK)
	var detail map[string]any
	json.NewDecoder(detailResp.Body).Decode(&detail)
	detailResp.Body.Close()
	if detail["streamId"] != "live/web" {
		t.Fatalf("streamId = %v", detail["streamId"])
	}
	if detail["encrypted"] != true {
		t.Fatalf("encrypted = %v", detail["encrypted"])
	}

	// Synthetic playlist + chunk over the façade.
	plResp := authGet(t, fmt.Sprintf("%s/sessions/%s/playlist.m3u8", ts.URL, id), http.StatusOK)
	buf := make([]byte, 4096)
	n, _ := plResp.Body.Read(buf)
	plResp.Body.Close()
	if got := string(buf[:n]); len(got) < 16 || got[:7] != "#EXTM3U" {
		t.Fatalf("bad playlist: %q", got)
	}

	chunkResp := authGet(t, fmt.Sprintf("%s/sessions/%s/chunks/0.ts", ts.URL, id), http.StatusOK)
	chunk := make([]byte, 4096)
	n, _ = chunkResp.Body.Read(chunk)
	chunkResp.Body.Close()
	if n < 188 || chunk[0] != 0x47 {
		t.Fatalf("bad chunk: n=%d sync=%#x", n, chunk[0])
	}

	// Telemetry event arrives over SSE.
	deadline := time.After(4 * time.Second)
	for {
		select {
		case ev := <-sseLines:
			if ev == session.EventTelemetry {
				goto telemetrySeen
			}
		case <-deadline:
			t.Fatal("no telemetry SSE event within timeout")
		}
	}
telemetrySeen:

	// Unknown session 404s.
	authGet(t, ts.URL+"/sessions/nope", http.StatusNotFound)

	// Delete recordings that don't exist 404s.
	dr, _ := http.NewRequest(http.MethodDelete, ts.URL+"/recordings/missing", nil)
	dr.Header.Set("Authorization", "Bearer "+testToken)
	drResp, err := http.DefaultClient.Do(dr)
	if err != nil {
		t.Fatal(err)
	}
	drResp.Body.Close()
	if drResp.StatusCode != http.StatusNotFound {
		t.Fatalf("delete missing recording = %d", drResp.StatusCode)
	}
}

func freeTestPort() int {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic(err)
	}
	port := l.Addr().(*net.TCPAddr).Port
	l.Close()
	return port
}
