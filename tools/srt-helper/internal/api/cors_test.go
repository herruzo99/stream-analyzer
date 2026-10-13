package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/segment"
	"github.com/herruzo/stream-analyzer/helper/internal/session"
	"github.com/herruzo/stream-analyzer/helper/internal/updater"
)

func TestOriginAllowedAndDefaults(t *testing.T) {
	// Default set: public site, localhost wildcard, 127.0.0.1 wildcard.
	for _, ok := range []string{
		"https://stream-analyzer.herruzo.dev",
		"http://localhost:3000",
		"http://127.0.0.1:7231",
		"http://localhost",
	} {
		if !originAllowed(DefaultOrigins, ok) {
			t.Fatalf("default set must allow %s", ok)
		}
	}
	for _, bad := range []string{
		"https://evil.example.com",
		"http://localhost.evil.com:3000",
		"http://sub.localhost:3000",
		"https://stream-analyzer.herruzo.dev.evil.com",
		"",
	} {
		if originAllowed(DefaultOrigins, bad) {
			t.Fatalf("default set must NOT allow %q", bad)
		}
	}
	// Explicit lists: exact match, "*" everything, no defaults leak.
	if !originAllowed([]string{"*"}, "http://anything") {
		t.Fatal("star must allow anything")
	}
	if originAllowed([]string{"https://a.test"}, "https://b.test") {
		t.Fatal("explicit list must not fall back to defaults")
	}
	if !originAllowed([]string{"http://localhost:*"}, "http://localhost:9999") {
		t.Fatal("wildcard port must match")
	}
}

// A server started WITHOUT -origin must still emit ACAO for the public site:
// that is what makes the Chromium extension unnecessary on GitHub Pages.
func TestDefaultCORSAllowsPublicSite(t *testing.T) {
	rec, err := segment.NewRecorder(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	m := session.NewManager(session.Options{Recorder: rec})
	upd := updater.New("", "1.2.0", time.Hour)
	server := NewServer(m, upd, "1.2.0", "abc", "2026-10-14", "tok", nil, nil)
	ts := httptest.NewServer(server.Routes())
	defer ts.Close()

	req, _ := http.NewRequest("GET", ts.URL+"/health", nil)
	req.Header.Set("Origin", "https://stream-analyzer.herruzo.dev")
	req.Header.Set("Authorization", "Bearer tok")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("health = %d", resp.StatusCode)
	}
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "https://stream-analyzer.herruzo.dev" {
		t.Fatalf("ACAO = %q; the public site must be allowed by default", got)
	}
	if got := resp.Header.Get("Access-Control-Allow-Private-Network"); got != "true" {
		t.Fatalf("PNA header = %q", got)
	}

	// The preflight carries both CORS and the PNA grant.
	pre, _ := http.NewRequest("OPTIONS", ts.URL+"/sessions", nil)
	pre.Header.Set("Origin", "https://stream-analyzer.herruzo.dev")
	pre.Header.Set("Access-Control-Request-Method", "POST")
	pre.Header.Set("Access-Control-Request-Headers", "authorization,content-type")
	preResp, err := http.DefaultClient.Do(pre)
	if err != nil {
		t.Fatal(err)
	}
	preResp.Body.Close()
	if preResp.StatusCode != http.StatusNoContent {
		t.Fatalf("preflight = %d", preResp.StatusCode)
	}
	if preResp.Header.Get("Access-Control-Allow-Private-Network") != "true" {
		t.Fatal("preflight must grant private network access")
	}
	if preResp.Header.Get("Access-Control-Allow-Headers") != "Authorization, Content-Type" {
		t.Fatalf("preflight must allow the auth header")
	}
}

// An unrelated public origin must NOT be allowed by default.
func TestDefaultCORSRejectsUnknownOrigin(t *testing.T) {
	rec, err := segment.NewRecorder(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	m := session.NewManager(session.Options{Recorder: rec})
	upd := updater.New("", "1.2.0", time.Hour)
	server := NewServer(m, upd, "1.2.0", "abc", "2026-10-14", "tok", nil, nil)
	ts := httptest.NewServer(server.Routes())
	defer ts.Close()

	req, _ := http.NewRequest("GET", ts.URL+"/health", nil)
	req.Header.Set("Origin", "https://stream-analyzer.herruzo.dev.evil.com")
	req.Header.Set("Authorization", "Bearer tok")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("unknown origin got ACAO %q", got)
	}
}
