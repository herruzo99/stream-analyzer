// Command helper is the local companion daemon for the stream-analyzer SRT
// feature. It owns the machine's UDP sockets (browsers cannot speak SRT),
// serves TS bytes as a synthetic HLS façade, exposes normalized telemetry,
// and can record sessions to disk for later replay.
//
// Docs: ../../../../ai/srt-integration-analysis.md
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/api"
	"github.com/herruzo/stream-analyzer/helper/internal/segment"
	"github.com/herruzo/stream-analyzer/helper/internal/session"
	"github.com/herruzo/stream-analyzer/helper/internal/updater"
)

// Injected at build time via -ldflags.
var (
	version   = "1.0.0"
	commit    = "dev"
	buildDate = "unknown"
)

type stateFile struct {
	Version        string `json:"version"`
	HelperProtocol int    `json:"helperProtocol"`
	ControlURL     string `json:"controlUrl"`
	Token          string `json:"token"`
	Platform       string `json:"platform"`
	PID            int    `json:"pid"`
	StartedAt      string `json:"startedAt"`
}

func main() {
	var (
		addr        = flag.String("addr", "127.0.0.1:7231", "control plane listen address (loopback by default)")
		token       = flag.String("token", "", "auth token; generated and printed when empty")
		recordings  = flag.String("recordings", "", "recording directory (default: ./recordings)")
		updateURL   = flag.String("update-url", envOr("STREAM_ANALYZER_UPDATE_URL", ""), "published helper manifest URL for update checks")
		origins     multiFlag
		showVersion = flag.Bool("version", false, "print version and exit")
	)
	flag.Var(&origins, "origin", "allowed Origin for the control plane (repeatable); empty = extension/same-origin only")
	flag.Parse()

	if *showVersion {
		fmt.Printf("stream-analyzer-helper %s (commit %s, built %s, %s)\n", version, commit, buildDate, runtime.GOOS+"/"+runtime.GOARCH)
		return
	}

	log := slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))

	// --- token ---
	tokenValue := *token
	if tokenValue == "" {
		b := make([]byte, 24)
		if _, err := rand.Read(b); err != nil {
			log.Error("token generation failed", "error", err)
			os.Exit(1)
		}
		tokenValue = hex.EncodeToString(b)
	}

	// --- recordings ---
	recDir := *recordings
	if recDir == "" {
		recDir = filepath.Join(".", "recordings")
	}
	recorder, err := segment.NewRecorder(recDir)
	if err != nil {
		log.Error("recorder init failed", "error", err, "dir", recDir)
		os.Exit(1)
	}

	manager := session.NewManager(session.Options{Recorder: recorder})
	upd := updater.New(*updateURL, version, 6*time.Hour)

	server := api.NewServer(manager, upd, version, commit, buildDate, tokenValue, origins, log)

	control := &http.Server{
		Addr:              *addr,
		Handler:           server.Routes(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	// Publish discovery state for the browser extension / first-run UX.
	ctrlURL := "http://" + *addr
	state := stateFile{
		Version:        version,
		HelperProtocol: api.HelperProtocol,
		ControlURL:     ctrlURL,
		Token:          tokenValue,
		Platform:       runtime.GOOS + "/" + runtime.GOARCH,
		PID:            os.Getpid(),
		StartedAt:      time.Now().UTC().Format(time.RFC3339),
	}
	if data, err := json.MarshalIndent(state, "", "  "); err == nil {
		statePath := filepath.Join(recDir, "helper-state.json")
		if err := os.WriteFile(statePath, data, 0o600); err != nil {
			log.Warn("could not write state file", "error", err, "path", statePath)
		}
	}

	go server.RunSSE()
	go upd.Run(context.Background())

	go func() {
		log.Info("helper listening",
			"version", version,
			"platform", state.Platform,
			"control", ctrlURL,
			"tokenFirst8", tokenValue[:8]+"...",
			"recordings", recDir,
		)
		if err := control.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("control plane failed", "error", err)
			os.Exit(1)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	log.Info("shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = control.Shutdown(ctx)
	log.Info("stopped", "uptimeMs", time.Since(time.Now()).Milliseconds())
}

// multiFlag allows repeated -origin flags.
type multiFlag []string

func (m *multiFlag) String() string { return fmt.Sprint(*m) }
func (m *multiFlag) Set(v string) error {
	*m = append(*m, v)
	return nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
