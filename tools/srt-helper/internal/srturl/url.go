// Package srturl parses and validates SRT URLs of the form
//
//	srt://host:port?mode=listener|caller&streamid=...&passphrase=...&latency=250
//
// The query options mirror the libSRT/gosrt option surface. Everything in this
// package is pure so it can be exhaustively contract-tested.
package srturl

import (
	"fmt"
	"net"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

// Option limits enforced at parse time.
const (
	MaxURLChars     = 2048
	MaxStreamIDSize = 512 // SRT handshake extension limit
	MinPassphrase   = 10  // libSRT enforces this minimum for encryption
	MaxPassphrase   = 80
	MinLatencyMS    = 0
	MaxLatencyMS    = 60000
	MaxFC           = 1 << 20
	MaxMSS          = 1500
	MinMSS          = 76
)

// Options is the validated representation of an srt:// URL.
type Options struct {
	Host string // host part, may be empty for listener binds ("srt://:9000?mode=listener")
	Port int    // 1..65535

	Mode string // "caller" (default) or "listener"

	StreamID      string
	Passphrase    string
	HasPassphrase bool
	PBKeylen      int // 0, 16, 24, or 32 (bytes); 0 = library default
	LatencyMS     int // 0 = library default
	ReceiverLatMS int // 0 = default
	PeerLatencyMS int // 0 = default
	FC            int // 0 = default
	MSS           int // 0 = default
	MaxBW         int64
	InputBW       int64
	OverheadBWPct int
	Congestion    string
	TooLateDrop   bool
	TSBPDMode     bool
	PeriodicNAK   bool
	MinVersion    uint32
	KMRefreshRate uint64
	KMPreAnnounce uint64
	LossMaxTTL    int
	EnforcedEncr  bool
	ConnectionMS  int
	PeerIdleMS    int
	DriftTracer   bool
	Filter        string
	PayloadSize   int
	RawQuery      string // original query string (never rendered with the passphrase)
	Warnings      []string
}

// Parse validates an srt:// URL and returns its options.
func Parse(raw string) (*Options, error) {
	if len(raw) > MaxURLChars {
		return nil, fmt.Errorf("SRT URL too long (max %d characters)", MaxURLChars)
	}
	if strings.TrimSpace(raw) != raw {
		return nil, fmt.Errorf("SRT URL must not contain leading or trailing whitespace")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid SRT URL: %w", err)
	}
	if u.Scheme != "srt" {
		return nil, fmt.Errorf("use the srt:// scheme")
	}
	if u.User != nil {
		return nil, fmt.Errorf("remove embedded credentials; use the streamid/passphrase options")
	}

	o := &Options{
		Congestion: "live",
		RawQuery:   u.RawQuery,
	}

	host := u.Hostname()
	portStr := u.Port()
	switch {
	case portStr == "" && host != "":
		return nil, fmt.Errorf("SRT URL requires an explicit port")
	case portStr == "" && host == "":
		return nil, fmt.Errorf("SRT URL requires a host and port, or :port for listener mode")
	}
	p, err := strconv.Atoi(portStr)
	if err != nil || p < 1 || p > 65535 {
		return nil, fmt.Errorf("invalid SRT port %q", portStr)
	}
	o.Host = host
	o.Port = p

	// Enum-ish options first so validation errors are stable.
	q := u.Query()
	if v := strings.ToLower(strings.TrimSpace(q.Get("mode"))); v != "" {
		switch v {
		case "caller", "listener":
			o.Mode = v
		default:
			return nil, fmt.Errorf("mode must be caller or listener")
		}
	} else {
		o.Mode = "caller"
	}

	o.StreamID = q.Get("streamid")
	if len(o.StreamID) > MaxStreamIDSize {
		return nil, fmt.Errorf("streamid exceeds %d bytes", MaxStreamIDSize)
	}

	if v, ok := q["passphrase"]; ok {
		o.HasPassphrase = true
		o.Passphrase = v[0]
		if len(o.Passphrase) < MinPassphrase || len(o.Passphrase) > MaxPassphrase {
			return nil, fmt.Errorf("passphrase must be %d-%d characters", MinPassphrase, MaxPassphrase)
		}
	}

	if err := o.parseBoundedInts(q); err != nil {
		return nil, err
	}
	if err := o.parseStringOpts(q); err != nil {
		return nil, err
	}
	o.parseBools(q)

	if o.EnforcedEncr && !o.HasPassphrase {
		o.Warnings = append(o.Warnings, "enforcedencryption is set but no passphrase was provided")
	}
	if o.Mode == "caller" && o.Host == "" {
		return nil, fmt.Errorf("caller mode requires a host")
	}

	return o, nil
}

func (o *Options) parseBoundedInts(q url.Values) error {
	var err error
	intOpts := []struct {
		key string
		dst *int
		min int
		max int
	}{
		{"latency", &o.LatencyMS, MinLatencyMS, MaxLatencyMS},
		{"rcvlatency", &o.ReceiverLatMS, MinLatencyMS, MaxLatencyMS},
		{"peerlatency", &o.PeerLatencyMS, MinLatencyMS, MaxLatencyMS},
		{"fc", &o.FC, 0, MaxFC},
		{"mss", &o.MSS, 0, MaxMSS},
		{"payloadsize", &o.PayloadSize, 0, MaxMSS},
		{"oheadbw", &o.OverheadBWPct, 0, 100},
		{"pbkeylen", &o.PBKeylen, 0, 32},
		{"lossmaxttl", &o.LossMaxTTL, 0, 1 << 20},
		{"conntimeo", &o.ConnectionMS, 0, 60000},
		{"peeridletimeo", &o.PeerIdleMS, 0, 60000},
	}
	for _, opt := range intOpts {
		v := q.Get(opt.key)
		if v == "" {
			continue
		}
		n, perr := strconv.Atoi(v)
		if perr != nil || n < opt.min || n > opt.max {
			return fmt.Errorf("%s must be an integer in [%d, %d]", opt.key, opt.min, opt.max)
		}
		*opt.dst = n
	}
	if o.PBKeylen != 0 && o.PBKeylen != 16 && o.PBKeylen != 24 && o.PBKeylen != 32 {
		return fmt.Errorf("pbkeylen must be 16, 24, or 32")
	}
	if o.MSS != 0 && o.MSS < MinMSS {
		return fmt.Errorf("mss must be at least %d", MinMSS)
	}

	int64Opts := []struct {
		key string
		dst *int64
	}{
		{"maxbw", &o.MaxBW},
		{"inputbw", &o.InputBW},
	}
	for _, opt := range int64Opts {
		v := q.Get(opt.key)
		if v == "" {
			continue
		}
		n, perr := strconv.ParseInt(v, 10, 64)
		if perr != nil || n < 0 {
			return fmt.Errorf("%s must be a non-negative byte count", opt.key)
		}
		*opt.dst = n
	}

	u64Opts := []struct {
		key string
		dst *uint64
	}{
		{"kmrefreshrate", &o.KMRefreshRate},
		{"kmpreannounce", &o.KMPreAnnounce},
	}
	for _, opt := range u64Opts {
		v := q.Get(opt.key)
		if v == "" {
			continue
		}
		n, perr := strconv.ParseUint(v, 10, 64)
		if perr != nil {
			return fmt.Errorf("%s must be a non-negative packet count", opt.key)
		}
		*opt.dst = n
	}

	if v := q.Get("minversion"); v != "" {
		n, perr := strconv.ParseUint(v, 10, 32)
		if perr != nil {
			return fmt.Errorf("minversion must be a 32-bit integer")
		}
		o.MinVersion = uint32(n)
	}
	return err
}

func (o *Options) parseStringOpts(q url.Values) error {
	if v := strings.ToLower(q.Get("congestion")); v != "" {
		switch v {
		case "live", "file":
			if v == "file" {
				return fmt.Errorf("congestion=file is not supported for live analysis")
			}
			o.Congestion = v
		default:
			return fmt.Errorf("congestion must be live")
		}
	}
	if v := strings.ToLower(q.Get("packetfilter")); v != "" {
		if v != "fec" && v != "" {
			return fmt.Errorf("packetfilter must be fec when provided")
		}
		o.Filter = v
	}
	if q.Get("messageapi") != "" {
		b, err := strconv.ParseBool(q.Get("messageapi"))
		if err != nil {
			return fmt.Errorf("messageapi must be true or false")
		}
		if b {
			return fmt.Errorf("message mode is not supported; SRT analysis uses buffer mode")
		}
	}
	return nil
}

func (o *Options) parseBools(q url.Values) {
	boolOpts := []struct {
		key string
		dst *bool
	}{
		{"tlpktdrop", &o.TooLateDrop},
		{"tsbpdmode", &o.TSBPDMode},
		{"nakreport", &o.PeriodicNAK},
		{"enforcedencryption", &o.EnforcedEncr},
		{"drifttracer", &o.DriftTracer},
	}
	for _, opt := range boolOpts {
		if v := q.Get(opt.key); v != "" {
			if b, err := strconv.ParseBool(v); err == nil {
				*opt.dst = b
			} else {
				o.Warnings = append(o.Warnings, fmt.Sprintf("ignoring %s=%q", opt.key, v))
			}
		}
	}
}

// ListenAddr returns the bind address for listener mode (e.g. ":9000").
func (o *Options) ListenAddr() (string, error) {
	if o.Mode != "listener" {
		return "", fmt.Errorf("not a listener URL")
	}
	host := o.Host
	if host == "" || host == "*" {
		host = ""
	}
	return net.JoinHostPort(host, strconv.Itoa(o.Port)), nil
}

// DialAddr returns the "host:port" address for caller mode.
func (o *Options) DialAddr() string {
	return net.JoinHostPort(o.Host, strconv.Itoa(o.Port))
}

// Normalized renders a safe, canonical URL with the passphrase redacted. The
// result is suitable for UI display and logs.
func (o *Options) Normalized() string {
	q := url.Values{}
	q.Set("mode", o.Mode)
	if o.StreamID != "" {
		q.Set("streamid", o.StreamID)
	}
	if o.HasPassphrase {
		q.Set("passphrase", "redacted")
	}
	if o.LatencyMS > 0 {
		q.Set("latency", strconv.Itoa(o.LatencyMS))
	}
	if o.FC > 0 {
		q.Set("fc", strconv.Itoa(o.FC))
	}
	if o.MSS > 0 {
		q.Set("mss", strconv.Itoa(o.MSS))
	}
	if o.PBKeylen > 0 {
		q.Set("pbkeylen", strconv.Itoa(o.PBKeylen))
	}
	u := url.URL{Scheme: "srt", Host: net.JoinHostPort(o.Host, strconv.Itoa(o.Port)), RawQuery: q.Encode()}
	return u.String()
}

// SortedKeys returns query keys in stable order (diagnostics/tests).
func (o *Options) SortedKeys() []string {
	keys := make([]string, 0, 8)
	for _, k := range []string{"streamid", "passphrase", "latency", "mode"} {
		if q := parseQuerySilently(o.RawQuery); q.Get(k) != "" {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)
	return keys
}

func parseQuerySilently(raw string) url.Values {
	v, err := url.ParseQuery(raw)
	if err != nil {
		return url.Values{}
	}
	return v
}
