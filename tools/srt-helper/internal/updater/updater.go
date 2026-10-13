// Package updater fetches the published helper manifest (a static file
// served from the analyzer's own origin, see /helper/manifest.json) and
// decides whether the locally running helper is outdated. It is deliberately
// failure-tolerant: any fetch error leaves the last known state untouched.
package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/semver"
)

// Artifact describes one platform binary in the manifest.
type Artifact struct {
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
	Bytes  int64  `json:"bytes"`
}

// Manifest is the published manifest schema (schema version 1).
type Manifest struct {
	Schema         int                 `json:"schema"`
	Channel        string              `json:"channel"`
	Version        string              `json:"version"`
	HelperProtocol int                 `json:"helperProtocol"`
	MinimumHelper  string              `json:"minimumHelper"`
	MinimumApp     string              `json:"minimumApp"`
	PublishedAt    string              `json:"publishedAt"`
	Commit         string              `json:"commit"`
	Artifacts      map[string]Artifact `json:"artifacts"`
}

// Validate checks the manifest's required fields and value ranges.
func (m *Manifest) Validate() error {
	if m == nil {
		return fmt.Errorf("manifest is nil")
	}
	if m.Schema != 1 {
		return fmt.Errorf("unsupported manifest schema %d", m.Schema)
	}
	if strings.TrimSpace(m.Version) == "" {
		return fmt.Errorf("manifest version is empty")
	}
	if _, err := semver.Parse(m.Version); err != nil {
		return fmt.Errorf("manifest version invalid: %w", err)
	}
	if m.HelperProtocol < 1 {
		return fmt.Errorf("helperProtocol must be >= 1")
	}
	if strings.TrimSpace(m.MinimumHelper) == "" {
		return fmt.Errorf("minimumHelper is empty")
	}
	if _, err := semver.Parse(m.MinimumHelper); err != nil {
		return fmt.Errorf("minimumHelper invalid: %w", err)
	}
	if m.Artifacts == nil {
		return fmt.Errorf("manifest has no artifacts")
	}
	for platform, art := range m.Artifacts {
		if art.URL == "" || art.SHA256 == "" {
			return fmt.Errorf("artifact %s missing url/sha256", platform)
		}
		if len(art.SHA256) < 16 {
			return fmt.Errorf("artifact %s has an implausible sha256", platform)
		}
	}
	return nil
}

// PlatformKey returns the artifact key for the running platform.
func PlatformKey() string { return runtime.GOOS + "/" + runtime.GOARCH }

// Status is the helper's update view, embedded in /version.
type Status struct {
	State           string     `json:"state"` // current | update-available | outdated | ahead | unknown
	CurrentVersion  string     `json:"currentVersion"`
	LatestVersion   string     `json:"latestVersion,omitempty"`
	MinimumHelper   string     `json:"minimumHelper,omitempty"`
	ManifestChannel string     `json:"manifestChannel,omitempty"`
	CheckedAt       *time.Time `json:"checkedAt,omitempty"`
	LastError       string     `json:"lastError,omitempty"`
	UpdateAvailable *Update    `json:"updateAvailable,omitempty"`
}

// Update describes the upgrade action for the running platform.
type Update struct {
	Version string `json:"version"`
	URL     string `json:"url"`
	SHA256  string `json:"sha256"`
}

// Updater polls the manifest on a slow cadence.
type Updater struct {
	url      string
	local    string
	interval time.Duration
	client   *http.Client

	mu     sync.Mutex
	etag   string
	status Status
}

// New builds an updater. An empty url disables update checks entirely.
func New(manifestURL, localVersion string, interval time.Duration) *Updater {
	if interval <= 0 {
		interval = 6 * time.Hour
	}
	return &Updater{
		url:      strings.TrimSpace(manifestURL),
		local:    localVersion,
		interval: interval,
		client:   &http.Client{Timeout: 10 * time.Second},
		status:   Status{State: "unknown", CurrentVersion: localVersion},
	}
}

// Run polls until the context is cancelled.
func (u *Updater) Run(ctx context.Context) {
	if u.url == "" {
		return
	}
	u.check()
	t := time.NewTicker(u.interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			u.check()
		}
	}
}

// Status returns the last computed state.
func (u *Updater) Status() Status {
	u.mu.Lock()
	defer u.mu.Unlock()
	return u.status
}

// Check performs one manifest fetch (also used by tests).
func (u *Updater) Check() { u.check() }

func (u *Updater) check() {
	if u.url == "" {
		return
	}
	req, err := http.NewRequest(http.MethodGet, u.url, nil)
	if err != nil {
		u.recordError(err)
		return
	}
	u.mu.Lock()
	etag := u.etag
	u.mu.Unlock()
	if etag != "" {
		req.Header.Set("If-None-Match", etag)
	}
	resp, err := u.client.Do(req)
	if err != nil {
		u.recordError(err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		now := time.Now()
		u.mu.Lock()
		u.status.CheckedAt = &now
		u.status.LastError = ""
		u.mu.Unlock()
		return
	}
	if resp.StatusCode != http.StatusOK {
		u.recordError(fmt.Errorf("manifest fetch returned %s", resp.Status))
		return
	}
	var man Manifest
	dec := json.NewDecoder(resp.Body)
	if err := dec.Decode(&man); err != nil {
		u.recordError(fmt.Errorf("manifest decode failed: %w", err))
		return
	}
	if err := man.Validate(); err != nil {
		u.recordError(err)
		return
	}

	status := u.evaluate(&man)
	now := time.Now()
	status.CheckedAt = &now

	u.mu.Lock()
	if tag := resp.Header.Get("ETag"); tag != "" {
		u.etag = tag
	}
	u.status = status
	u.mu.Unlock()
}

func (u *Updater) recordError(err error) {
	now := time.Now()
	u.mu.Lock()
	u.status.State = "unknown"
	u.status.LastError = err.Error()
	u.status.CheckedAt = &now
	u.mu.Unlock()
}

// evaluate compares the local version against the manifest. Pure logic,
// exposed for tests without a server.
func (u *Updater) evaluate(man *Manifest) Status {
	localVer, localErr := semver.Parse(u.local)
	latestVer, latestErr := semver.Parse(man.Version)
	minVer, minErr := semver.Parse(man.MinimumHelper)

	status := Status{
		State:           "unknown",
		CurrentVersion:  u.local,
		LatestVersion:   man.Version,
		MinimumHelper:   man.MinimumHelper,
		ManifestChannel: man.Channel,
	}
	if localErr != nil || latestErr != nil || minErr != nil {
		return status
	}

	if semver.Compare(localVer, minVer) < 0 {
		status.State = "outdated"
	} else if semver.Compare(localVer, latestVer) < 0 {
		status.State = "update-available"
	} else if semver.Compare(localVer, latestVer) > 0 {
		status.State = "ahead"
	} else {
		status.State = "current"
	}

	if status.State == "update-available" || status.State == "outdated" {
		if art, ok := man.Artifacts[PlatformKey()]; ok {
			status.UpdateAvailable = &Update{
				Version: man.Version,
				URL:     art.URL,
				SHA256:  art.SHA256,
			}
		}
	}
	return status
}
