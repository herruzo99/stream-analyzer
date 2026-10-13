package srturl

import "testing"

func TestParseValid(t *testing.T) {
	cases := []struct {
		url    string
		mode   string
		host   string
		port   int
		sid    string
		pass   bool
		lat    int
		bindOK bool
	}{
		{"srt://10.0.0.5:9000", "caller", "10.0.0.5", 9000, "", false, 0, false},
		{"srt://ingest.example.com:1234?streamid=live/abc&latency=300&passphrase=0123456789", "caller", "ingest.example.com", 1234, "live/abc", true, 300, false},
		{"srt://:9000?mode=listener", "listener", "", 9000, "", false, 0, true},
		{"srt://0.0.0.0:9000?mode=listener&enforcedencryption=true&passphrase=0123456789&pbkeylen=32", "listener", "0.0.0.0", 9000, "", true, 0, true},
	}
	for _, c := range cases {
		o, err := Parse(c.url)
		if err != nil {
			t.Fatalf("Parse(%q) failed: %v", c.url, err)
		}
		if o.Mode != c.mode || o.Host != c.host || o.Port != c.port || o.StreamID != c.sid || o.HasPassphrase != c.pass || o.LatencyMS != c.lat {
			t.Fatalf("Parse(%q) = %+v", c.url, o)
		}
		if c.bindOK {
			addr, err := o.ListenAddr()
			if err != nil || addr == "" {
				t.Fatalf("ListenAddr(%q) failed: %v %q", c.url, err, addr)
			}
		}
		if c.url[len(c.url)-1] == '9' && o.HasPassphrase {
			norm := o.Normalized()
			if containsStr(norm, "0123456789") {
				t.Fatalf("Normalized leaked passphrase: %s", norm)
			}
			if !containsStr(norm, "redacted") {
				t.Fatalf("Normalized missing redaction marker: %s", norm)
			}
		}
	}
}

func TestParseInvalid(t *testing.T) {
	bad := []string{
		"",
		"http://host:9000",
		"srt://host",
		"srt://host:0",
		"srt://host:99999",
		"srt://host:9000?mode=rendezvous",
		"srt://host:9000?passphrase=short",
		"srt://host:9000?latency=-5",
		"srt://user:pass@host:9000",
		"srt://host:9000?messageapi=true",
		"srt://host:9000?pbkeylen=17",
		"srt://host:9000?congestion=file",
		"  srt://host:9000  ",
	}
	for _, url := range bad {
		if o, err := Parse(url); err == nil {
			t.Fatalf("Parse(%q) unexpectedly succeeded: %+v", url, o)
		}
	}
}

func TestDialAndListenAddr(t *testing.T) {
	o, err := Parse("srt://example.com:7777?streamid=x")
	if err != nil {
		t.Fatal(err)
	}
	if o.DialAddr() != "example.com:7777" {
		t.Fatalf("DialAddr = %q", o.DialAddr())
	}
	o2, err := Parse("srt://:0?mode=listener")
	if err == nil {
		t.Fatalf("port 0 should fail: %+v", o2)
	}
}

func containsStr(h, n string) bool {
	for i := 0; i+len(n) <= len(h); i++ {
		if h[i:i+len(n)] == n {
			return true
		}
	}
	return false
}
