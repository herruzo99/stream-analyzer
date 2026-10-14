package rtmpurl

import "testing"

func TestParseDefaults(t *testing.T) {
	p, err := Parse("rtmp://live.example.com/app/streamkey")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if p.Protocol != "rtmp" || p.Host != "live.example.com" || p.Port != DefaultPort {
		t.Fatalf("unexpected: %+v", p)
	}
	if p.App != "app" || p.Playpath != "streamkey" {
		t.Fatalf("app/playpath: %+v", p)
	}
	if p.TcURL != "rtmp://live.example.com:1935/app" {
		t.Fatalf("tcUrl: %q", p.TcURL)
	}
	if p.Addr() != "live.example.com:1935" {
		t.Fatalf("addr: %q", p.Addr())
	}
}

func TestParseParamsAndTLS(t *testing.T) {
	p, err := Parse("rtmps://edge.example.com:443/live/chan%201?token=abc&live=1")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if p.Protocol != "rtmps" || p.Port != 443 || p.App != "live" {
		t.Fatalf("unexpected: %+v", p)
	}
	if p.Playpath != "chan%201" {
		t.Fatalf("playpath: %q", p.Playpath)
	}
	if p.Params["token"] != "abc" || p.Params["live"] != "1" {
		t.Fatalf("params: %+v", p.Params)
	}
	if p.TcURL != "rtmps://edge.example.com:443/live" {
		t.Fatalf("tcUrl: %q", p.TcURL)
	}
}

func TestParseAppOnly(t *testing.T) {
	p, err := Parse("rtmp://127.0.0.1:1935/live")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if p.App != "live" || p.Playpath != "" {
		t.Fatalf("unexpected: %+v", p)
	}
}

func TestParseRejections(t *testing.T) {
	cases := []string{
		"",
		"   ",
		"rtmp://",
		"rtmp://host/",
		"rtmp://:1935/app",
		"http://host/app/key",
		"rtmp://host/app/key#frag",
		"rtmp://host/app/key with spaces",
		"rtmp://host:notaport/app",
		"rtmp://host:99999/app",
	}
	for _, c := range cases {
		if _, err := Parse(c); err == nil {
			t.Errorf("expected %q to be rejected", c)
		}
	}
}

func TestParseIPv6(t *testing.T) {
	p, err := Parse("rtmp://[::1]:1935/live/key")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if p.Host != "::1" || p.Port != 1935 || p.Addr() != "[::1]:1935" {
		t.Fatalf("unexpected: %+v", p)
	}
}

func TestParseLengthLimits(t *testing.T) {
	longApp := "rtmp://host/" + repeat("a", MaxApp+1) + "/key"
	if _, err := Parse(longApp); err == nil {
		t.Error("expected long app to be rejected")
	}
	longKey := "rtmp://host/app/" + repeat("k", MaxPlaypath+1)
	if _, err := Parse(longKey); err == nil {
		t.Error("expected long playpath to be rejected")
	}
}

func repeat(s string, n int) string {
	out := make([]byte, 0, len(s)*n)
	for i := 0; i < n; i++ {
		out = append(out, s...)
	}
	return string(out)
}
