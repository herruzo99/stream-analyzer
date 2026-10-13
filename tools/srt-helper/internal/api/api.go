// Package api implements the helper's localhost control plane: health,
// version (including update status), session lifecycle, the synthetic HLS
// façade endpoints, recording replay, and an SSE event stream for live
// telemetry. Every endpoint requires the token; CORS and Chrome's Private
// Network Access preflight are answered for origins allow-listed at startup.
package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/herruzo/stream-analyzer/helper/internal/segment"
	"github.com/herruzo/stream-analyzer/helper/internal/session"
	"github.com/herruzo/stream-analyzer/helper/internal/updater"
)

// HelperProtocol is the control-plane contract version. Bump when the JSON
// shapes change incompatibly; SemVer alone never implies compatibility.
const HelperProtocol = 1

// Server wires the control plane to its dependencies.
type Server struct {
	manager   *session.Manager
	updater   *updater.Updater
	version   string
	commit    string
	buildDate string
	token     string
	origins   []string // empty = only same-origin/extension contexts
	started   time.Time
	log       *slog.Logger

	sseMu   sync.Mutex
	sseSubs map[chan string]struct{}
}

// NewServer builds the API server.
func NewServer(m *session.Manager, u *updater.Updater, version, commit, buildDate, token string, origins []string, log *slog.Logger) *Server {
	return &Server{
		manager:   m,
		updater:   u,
		version:   version,
		commit:    commit,
		buildDate: buildDate,
		token:     token,
		origins:   origins,
		started:   time.Now(),
		log:       log,
		sseSubs:   map[chan string]struct{}{},
	}
}

// Routes returns the handler with all endpoints registered.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", s.withAuth(s.handleHealth))
	mux.HandleFunc("GET /version", s.withAuth(s.handleVersion))
	mux.HandleFunc("GET /sessions", s.withAuth(s.handleListSessions))
	mux.HandleFunc("POST /sessions", s.withAuth(s.handleCreateSession))
	mux.HandleFunc("GET /sessions/{id}", s.withAuth(s.handleSessionDetail))
	mux.HandleFunc("DELETE /sessions/{id}", s.withAuth(s.handleStopSession))
	mux.HandleFunc("GET /sessions/{id}/playlist.m3u8", s.withAuth(s.handleLivePlaylist))
	mux.HandleFunc("GET /sessions/{id}/chunks/{index}", s.withAuth(s.handleLiveChunk))
	mux.HandleFunc("GET /recordings", s.withAuth(s.handleListRecordings))
	mux.HandleFunc("GET /recordings/{id}", s.withAuth(s.handleRecording))
	mux.HandleFunc("DELETE /recordings/{id}", s.withAuth(s.handleDeleteRecording))
	mux.HandleFunc("GET /recordings/{id}/playlist.m3u8", s.withAuth(s.handleVodPlaylist))
	mux.HandleFunc("GET /recordings/{id}/chunks/{index}", s.withAuth(s.handleRecordingChunk))
	mux.HandleFunc("GET /events", s.withAuth(s.handleEvents))
	mux.HandleFunc("GET /metrics", s.withAuth(s.handleMetrics))
	mux.HandleFunc("GET /sessions/{id}/handshake", s.withAuth(s.handleHandshakes))

	return s.withPreflight(mux)
}

// withPreflight answers CORS/PNA preflights for any path: browsers cannot
// attach an Authorization header to a preflight, so OPTIONS is token-free.
func (s *Server) withPreflight(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			s.setCORS(w, r)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Private-Network", "true")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RunSSE bridges manager events to SSE subscribers.
func (s *Server) RunSSE() {
	for ev := range s.manager.Events() {
		data, err := json.Marshal(ev)
		if err != nil {
			continue
		}
		msg := fmt.Sprintf("event: %s\ndata: %s\n\n", ev.Type, data)
		s.sseMu.Lock()
		for ch := range s.sseSubs {
			select {
			case ch <- msg:
			default: // slow client: drop it rather than block analysis
				close(ch)
				delete(s.sseSubs, ch)
			}
		}
		s.sseMu.Unlock()
	}
}

// --- auth / CORS / PNA -----------------------------------------------------

func (s *Server) withAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s.setCORS(w, r)
		w.Header().Set("Access-Control-Allow-Private-Network", "true")
		if s.token != "" && !s.tokenOK(r) {
			s.writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing or invalid token"})
			return
		}
		next(w, r)
	}
}

func (s *Server) tokenOK(r *http.Request) bool {
	if got := r.Header.Get("Authorization"); got == "Bearer "+s.token {
		return true
	}
	if got := r.URL.Query().Get("token"); got == s.token {
		return true
	}
	return false
}

func (s *Server) setCORS(w http.ResponseWriter, r *http.Request) {
	if len(s.origins) == 0 {
		// Extension service-worker contexts and same-origin fetches need no
		// ACAO; ordinary pages must be allow-listed explicitly.
		if origin := r.Header.Get("Origin"); origin == "" || origin == "null" {
			return
		}
	}
	for _, o := range s.origins {
		if o == "*" || o == r.Header.Get("Origin") {
			w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
			return
		}
	}
}

// --- handlers ---------------------------------------------------------------

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	_, active := s.manager.Stats()
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	fmt.Fprint(w, renderPrometheus(s.manager.Sessions(), s.version, runtime.GOOS+"/"+runtime.GOARCH, active))
}

// handleHandshakes exposes the SRT handshake ledger (Tier-2 #6): every
// accepted/rejected peer attempt with rejection reason codes.
func (s *Server) handleHandshakes(w http.ResponseWriter, r *http.Request) {
	events, ok := s.manager.SessionHandshakes(r.PathValue("id"))
	if !ok {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown session"})
		return
	}
	s.writeJSON(w, http.StatusOK, map[string]any{"handshakes": events})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	sessions, active := s.manager.Stats()
	s.writeJSON(w, http.StatusOK, map[string]any{
		"ok":             true,
		"version":        s.version,
		"helperProtocol": HelperProtocol,
		"platform":       runtime.GOOS + "/" + runtime.GOARCH,
		"uptimeMs":       time.Since(s.started).Milliseconds(),
		"sessions":       sessions,
		"activeSessions": active,
	})
}

func (s *Server) handleVersion(w http.ResponseWriter, r *http.Request) {
	s.writeJSON(w, http.StatusOK, map[string]any{
		"version":        s.version,
		"commit":         s.commit,
		"buildDate":      s.buildDate,
		"helperProtocol": HelperProtocol,
		"platform":       runtime.GOOS + "/" + runtime.GOARCH,
		"go":             runtime.Version(),
		"pid":            os.Getpid(),
		"startedAt":      s.started.UTC().Format(time.RFC3339),
		"update":         s.updater.Status(),
	})
}

func (s *Server) handleListSessions(w http.ResponseWriter, r *http.Request) {
	s.writeJSON(w, http.StatusOK, map[string]any{"sessions": s.manager.Sessions()})
}

func (s *Server) handleSessionDetail(w http.ResponseWriter, r *http.Request) {
	detail, ok := s.manager.Session(r.PathValue("id"))
	if !ok {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown session"})
		return
	}
	s.writeJSON(w, http.StatusOK, detail)
}

type createRequest struct {
	URL    string `json:"url"`
	Record bool   `json:"record"`
}

func (s *Server) handleCreateSession(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&req); err != nil || req.URL == "" {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "expected JSON body with a non-empty url"})
		return
	}
	var (
		sess *session.Session
		err  error
	)
	if isListenerURL(req.URL) {
		sess, err = s.manager.StartPush(req.URL, req.Record)
	} else {
		sess, err = s.manager.StartPull(req.URL, req.Record)
	}
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if sess.Status == session.StatusError {
		s.writeJSON(w, http.StatusBadGateway, map[string]string{"error": sess.Error})
		return
	}
	w.Header().Set("Location", "/sessions/"+sess.ID)
	s.writeJSON(w, http.StatusCreated, sess.SummaryJSON())
}

func (s *Server) handleStopSession(w http.ResponseWriter, r *http.Request) {
	if err := s.manager.Stop(r.PathValue("id")); err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}
	s.writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleLivePlaylist(w http.ResponseWriter, r *http.Request) {
	chunker, ok := s.manager.SessionChunker(r.PathValue("id"))
	if !ok {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown session"})
		return
	}
	segs := chunker.Snapshot()
	if len(segs) == 0 {
		s.writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "no segments yet"})
		return
	}
	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	w.Header().Set("Cache-Control", "no-store")
	base := fmt.Sprintf("/sessions/%s/", r.PathValue("id"))
	fmt.Fprint(w, segment.LivePlaylist(base, segs, segment.TargetDuration(segs)))
}

func (s *Server) handleLiveChunk(w http.ResponseWriter, r *http.Request) {
	chunker, ok := s.manager.SessionChunker(r.PathValue("id"))
	if !ok {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown session"})
		return
	}
	index, err := parseIndex(r.PathValue("index"))
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad chunk index"})
		return
	}
	data, found := chunker.Get(index)
	if !found {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "chunk not in live window"})
		return
	}
	writeTS(w, data)
}

func (s *Server) handleListRecordings(w http.ResponseWriter, r *http.Request) {
	if s.manager.Recording() == nil {
		s.writeJSON(w, http.StatusOK, map[string]any{"recordings": []any{}})
		return
	}
	s.writeJSON(w, http.StatusOK, map[string]any{"recordings": s.manager.Recording().ListRecordings()})
}

func (s *Server) handleRecording(w http.ResponseWriter, r *http.Request) {
	if s.manager.Recording() == nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "recording unavailable"})
		return
	}
	rec, err := s.manager.Recording().LoadRecording(r.PathValue("id"))
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown recording"})
		return
	}
	s.writeJSON(w, http.StatusOK, rec)
}

func (s *Server) handleDeleteRecording(w http.ResponseWriter, r *http.Request) {
	if s.manager.Recording() == nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "recording unavailable"})
		return
	}
	rec, err := s.manager.Recording().LoadRecording(r.PathValue("id"))
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown recording"})
		return
	}
	if rec.Dir != "" {
		if err := removeAll(rec.Dir); err != nil {
			s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
	}
	s.writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleVodPlaylist(w http.ResponseWriter, r *http.Request) {
	rec, err := s.manager.Recording().LoadRecording(r.PathValue("id"))
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown recording"})
		return
	}
	segs := segment.SegmentsFromRecording(rec)
	if len(segs) == 0 {
		s.writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "recording has no segments"})
		return
	}
	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	w.Header().Set("Cache-Control", "no-store")
	base := fmt.Sprintf("/recordings/%s/", rec.ID)
	fmt.Fprint(w, segment.VodPlaylist(base, segs, segment.TargetDuration(segs)))
}

func (s *Server) handleRecordingChunk(w http.ResponseWriter, r *http.Request) {
	rec, err := s.manager.Recording().LoadRecording(r.PathValue("id"))
	if err != nil {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown recording"})
		return
	}
	index, err := parseIndex(r.PathValue("index"))
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad chunk index"})
		return
	}
	data, ok := rec.ReadSegment(index)
	if !ok {
		s.writeJSON(w, http.StatusNotFound, map[string]string{"error": "unknown chunk"})
		return
	}
	writeTS(w, data)
}

func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		s.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "streaming unsupported"})
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	ch := make(chan string, 64)
	s.sseMu.Lock()
	s.sseSubs[ch] = struct{}{}
	s.sseMu.Unlock()
	defer func() {
		s.sseMu.Lock()
		delete(s.sseSubs, ch)
		s.sseMu.Unlock()
		close(ch)
	}()

	fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()

	keepalive := time.NewTicker(20 * time.Second)
	defer keepalive.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-keepalive.C:
			fmt.Fprint(w, ": keepalive\n\n")
			flusher.Flush()
		case msg := <-ch:
			fmt.Fprint(w, msg)
			flusher.Flush()
		}
	}
}

// --- helpers ----------------------------------------------------------------

func (s *Server) writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
}

func writeTS(w http.ResponseWriter, data []byte) {
	w.Header().Set("Content-Type", "video/mp2t")
	w.Header().Set("Cache-Control", "max-age=31536000, immutable")
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Write(data)
}

// removeAll deletes a directory tree, refusing empty paths.
func removeAll(path string) error {
	if path == "" {
		return fmt.Errorf("refusing to remove an empty path")
	}
	return os.RemoveAll(path)
}

func parseIndex(s string) (int, error) {
	s = strings.TrimSuffix(s, ".ts")
	n, err := strconv.Atoi(s)
	if err != nil || n < 0 {
		return 0, fmt.Errorf("invalid index %q", s)
	}
	return n, nil
}

// isListenerURL does a cheap scheme/query sniff so the manager picks the
// right mode; the full parse lives in srturl.Parse.
func isListenerURL(raw string) bool {
	for _, marker := range []string{"mode=listener", "mode%3Dlistener", "mode=listener&"} {
		if contains(lowerASCII(raw), marker) {
			return true
		}
	}
	return false
}

func lowerASCII(s string) string {
	out := []byte(s)
	for i := range out {
		if out[i] >= 'A' && out[i] <= 'Z' {
			out[i] += 'a' - 'A'
		}
	}
	return string(out)
}

func contains(haystack, needle string) bool {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return true
		}
	}
	return false
}
