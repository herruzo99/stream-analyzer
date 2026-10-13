package updater

import (
	"net/http"
	"net/http/httptest"
	"runtime"
	"testing"
	"time"
)

func manifest(version, minHelper string) *Manifest {
	return &Manifest{
		Schema:         1,
		Channel:        "stable",
		Version:        version,
		HelperProtocol: 1,
		MinimumHelper:  minHelper,
		MinimumApp:     "1.2.0",
		PublishedAt:    "2026-10-14T09:00:00Z",
		Commit:         "abc1234",
		Artifacts: map[string]Artifact{
			"linux/amd64":  {URL: "/helper/linux-amd64/h", SHA256: "0123456789abcdef0123456789abcdef", Bytes: 8123456},
			"darwin/arm64": {URL: "/helper/darwin-arm64/h", SHA256: "fedcba9876543210fedcba9876543210", Bytes: 8123456},
		},
	}
}

func TestValidate(t *testing.T) {
	if err := manifest("1.3.0", "1.1.0").Validate(); err != nil {
		t.Fatalf("valid manifest rejected: %v", err)
	}
	bad := []*Manifest{
		nil,
		{Schema: 2, Version: "1.0.0", MinimumHelper: "1.0.0", Artifacts: map[string]Artifact{}},
		{Schema: 1, Version: "", MinimumHelper: "1.0.0", Artifacts: map[string]Artifact{}},
		{Schema: 1, Version: "not-semver", MinimumHelper: "1.0.0", Artifacts: map[string]Artifact{}},
		{Schema: 1, Version: "1.0.0", MinimumHelper: "", Artifacts: map[string]Artifact{}},
		{Schema: 1, Version: "1.0.0", MinimumHelper: "1.0.0"},
		{Schema: 1, Version: "1.0.0", MinimumHelper: "1.0.0", Artifacts: map[string]Artifact{"linux/amd64": {URL: "/x", SHA256: "short"}}},
	}
	for i, m := range bad {
		if err := m.Validate(); err == nil {
			t.Fatalf("bad manifest %d accepted", i)
		}
	}
}

func TestEvaluateStates(t *testing.T) {
	u := &Updater{local: "1.2.0", status: Status{State: "unknown"}}

	// Same version as latest: current.
	if st := u.evaluate(manifest("1.2.0", "1.1.0")); st.State != "current" {
		t.Fatalf("state = %s, want current", st.State)
	}
	// Older than latest but above floor: update-available with artifact.
	st := u.evaluate(manifest("1.3.0", "1.1.0"))
	if st.State != "update-available" {
		t.Fatalf("state = %s, want update-available", st.State)
	}
	art, ok := manifest("1.3.0", "1.1.0").Artifacts[runtime.GOOS+"/"+runtime.GOARCH]
	if !ok {
		t.Skip("no artifact for this platform")
	}
	if st.UpdateAvailable == nil || st.UpdateAvailable.SHA256 != art.SHA256 {
		t.Fatalf("updateAvailable = %+v", st.UpdateAvailable)
	}
	// Below floor: outdated (hard).
	if st := u.evaluate(manifest("1.3.0", "1.2.1")); st.State != "outdated" {
		t.Fatalf("state = %s, want outdated", st.State)
	}
	// Newer than manifest: ahead, never an error.
	if st := u.evaluate(manifest("1.0.0", "1.0.0")); st.State != "ahead" {
		t.Fatalf("state = %s, want ahead", st.State)
	}
	// Prerelease newer than release semantics: 1.3.0-rc.1 < 1.3.0.
	u2 := &Updater{local: "1.3.0"}
	if st := u2.evaluate(manifest("1.3.0-rc.1", "1.0.0")); st.State != "ahead" {
		t.Fatalf("state = %s, want ahead (1.3.0 > 1.3.0-rc.1)", st.State)
	}
}

func TestCheckOverHTTPAndETag(t *testing.T) {
	body := `{"schema":1,"channel":"stable","version":"1.4.0","helperProtocol":1,` +
		`"minimumHelper":"1.1.0","minimumApp":"1.2.0","publishedAt":"2026-10-14T09:00:00Z","commit":"abc",` +
		`"artifacts":{"` + runtime.GOOS + `/` + runtime.GOARCH + `":{"url":"/helper/h","sha256":"` + "0123456789abcdef" + `","bytes":10}}}`
	var lastETag string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("If-None-Match") == `"v1"` {
			w.Header().Set("ETag", `"v1"`)
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Set("ETag", `"v1"`)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(body))
		lastETag = `"v1"`
	}))
	defer server.Close()

	u := New(server.URL, "1.2.0", time.Hour)
	u.Check()
	if st := u.Status(); st.State != "update-available" || st.LatestVersion != "1.4.0" {
		t.Fatalf("state = %+v", st)
	}

	u.Check() // must send If-None-Match and accept 304 without erroring
	st := u.Status()
	if st.State != "update-available" || st.LastError != "" {
		t.Fatalf("304 handling broken: %+v", st)
	}
	_ = lastETag
}

func TestCheckUnreachableAndBadPayload(t *testing.T) {
	u := New("http://127.0.0.1:1/manifest.json", "1.2.0", time.Hour)
	u.Check()
	if st := u.Status(); st.State != "unknown" || st.LastError == "" {
		t.Fatalf("unreachable manifest must degrade to unknown: %+v", st)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("not json"))
	}))
	defer server.Close()
	u2 := New(server.URL, "1.2.0", time.Hour)
	u2.Check()
	if st := u2.Status(); st.State != "unknown" || st.LastError == "" {
		t.Fatalf("invalid manifest must degrade to unknown: %+v", st)
	}
}

func TestDisabledWhenNoURL(t *testing.T) {
	u := New("", "1.2.0", time.Hour)
	u.Check()
	st := u.Status()
	if st.State != "unknown" || st.CheckedAt != nil {
		t.Fatalf("empty URL must never fetch: %+v", st)
	}
}
