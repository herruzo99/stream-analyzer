package rtmpurl

// RTMP URL contract (helper side), mirroring src/infrastructure/rtmp/urlContract.js
// so browser-side validation and helper-side parsing never disagree.

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// Limits mirrors the browser contract.
const (
	MaxChars       = 2048
	MaxApp         = 512
	MaxPlaypath    = 512
	DefaultPort    = 1935
	DefaultTLSPort = 443
)

// Parts is the parsed form of an rtmp:// or rtmps:// URL.
type Parts struct {
	Protocol string            `json:"protocol"` // rtmp | rtmps
	Host     string            `json:"host"`
	Port     int               `json:"port"`
	App      string            `json:"app"`
	Playpath string            `json:"playpath"`
	TcURL    string            `json:"tcUrl"`
	Params   map[string]string `json:"params"`
	Raw      string            `json:"raw"`
}

// Parse validates an rtmp:// or rtmps:// URL and extracts its parts.
func Parse(value string) (Parts, error) {
	var p Parts
	if value != strings.TrimSpace(value) {
		return p, fmt.Errorf("trim whitespace from the URL")
	}
	if value == "" {
		return p, fmt.Errorf("enter an RTMP URL")
	}
	if len(value) > MaxChars {
		return p, fmt.Errorf("RTMP URL too long (max %d)", MaxChars)
	}
	if strings.ContainsAny(value, " \t\r\n") {
		return p, fmt.Errorf("RTMP URL must not contain spaces")
	}
	if strings.Contains(value, "#") {
		return p, fmt.Errorf("RTMP URL must not contain a fragment")
	}
	if !strings.HasPrefix(value, "rtmp://") && !strings.HasPrefix(value, "rtmps://") {
		return p, fmt.Errorf("expected rtmp://host:port/app/playpath")
	}

	p.Protocol = value[:strings.Index(value, "://")]
	rest := value[len(p.Protocol)+3:]

	// Split authority / path / query without net/url's host canonicalization,
	// which would mangle percent-encoded playpaths.
	path := ""
	query := ""
	if i := strings.IndexAny(rest, "/?"); i >= 0 {
		authority := rest[:i]
		rest2 := rest[i:]
		if strings.HasPrefix(rest2, "?") {
			query = rest2[1:]
		} else if j := strings.Index(rest2, "?"); j >= 0 {
			path = rest2[:j]
			query = rest2[j+1:]
		} else {
			path = rest2
		}
		rest = authority
	}

	host, port, err := splitHostPort(rest, p.Protocol)
	if err != nil {
		return p, err
	}
	p.Host, p.Port = host, port

	path = strings.TrimPrefix(path, "/")
	if path == "" {
		return p, fmt.Errorf("missing application name (rtmp://host/app[/playpath])")
	}
	slash := strings.Index(path, "/")
	if slash == -1 {
		p.App = path
		p.Playpath = ""
	} else {
		p.App = path[:slash]
		p.Playpath = path[slash+1:]
	}
	if len(p.App) > MaxApp {
		return p, fmt.Errorf("app name too long (max %d)", MaxApp)
	}
	if len(p.Playpath) > MaxPlaypath {
		return p, fmt.Errorf("playpath too long (max %d)", MaxPlaypath)
	}

	p.Params = map[string]string{}
	if query != "" {
		for _, pair := range strings.Split(query, "&") {
			if pair == "" {
				continue
			}
			key, val := pair, ""
			if eq := strings.Index(pair, "="); eq >= 0 {
				key, val = pair[:eq], pair[eq+1:]
			}
			if key != "" {
				p.Params[key] = val
			}
		}
	}

	p.TcURL = fmt.Sprintf("%s://%s/%s", p.Protocol, joinHostPort(p.Host, p.Port), p.App)
	p.Raw = value
	return p, nil
}

func splitHostPort(authority, protocol string) (string, int, error) {
	if authority == "" {
		return "", 0, fmt.Errorf("missing host")
	}
	if strings.HasPrefix(authority, "[") {
		close := strings.Index(authority, "]")
		if close == -1 {
			return "", 0, fmt.Errorf("invalid IPv6 host")
		}
		host := authority[1:close]
		rest := authority[close+1:]
		if rest == "" {
			return host, defaultPort(protocol), nil
		}
		port, err := parsePort(strings.TrimPrefix(rest, ":"))
		if err != nil {
			return "", 0, err
		}
		return host, port, nil
	}
	if colon := strings.LastIndex(authority, ":"); colon >= 0 {
		host := authority[:colon]
		if host == "" {
			return "", 0, fmt.Errorf("missing host")
		}
		port, err := parsePort(authority[colon+1:])
		if err != nil {
			return "", 0, err
		}
		return host, port, nil
	}
	return authority, defaultPort(protocol), nil
}

func parsePort(s string) (int, error) {
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 || n > 65535 {
		return 0, fmt.Errorf("invalid port %q", s)
	}
	return n, nil
}

func defaultPort(protocol string) int {
	if protocol == "rtmps" {
		return DefaultTLSPort
	}
	return DefaultPort
}

func joinHostPort(host string, port int) string {
	if strings.Contains(host, ":") {
		return fmt.Sprintf("[%s]:%d", host, port)
	}
	return fmt.Sprintf("%s:%d", host, port)
}

// Addr is the dial address (host:port).
func (p Parts) Addr() string {
	return joinHostPort(p.Host, p.Port)
}

// Param returns a query parameter value.
func (p Parts) Param(key string) string {
	return p.Params[key]
}

// QueryString re-encodes the parameters for logging/telemetry.
func (p Parts) QueryString() string {
	if len(p.Params) == 0 {
		return ""
	}
	q := url.Values{}
	for k, v := range p.Params {
		q.Set(k, v)
	}
	return q.Encode()
}
