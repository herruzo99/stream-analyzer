package semver

import "testing"

func TestOrdering(t *testing.T) {
	// The classic semver.org precedence chain, lowest to highest.
	chain := []string{
		"1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-beta",
		"1.0.0-beta.2", "1.0.0-beta.11", "1.0.0-rc.1", "1.0.0",
	}
	for i := 0; i+1 < len(chain); i++ {
		a, err := Parse(chain[i])
		if err != nil {
			t.Fatalf("Parse(%s): %v", chain[i], err)
		}
		b, err := Parse(chain[i+1])
		if err != nil {
			t.Fatalf("Parse(%s): %v", chain[i+1], err)
		}
		if Compare(a, b) != -1 {
			t.Fatalf("expected %s < %s", chain[i], chain[i+1])
		}
		if Compare(b, a) != 1 {
			t.Fatalf("expected %s > %s", chain[i+1], chain[i])
		}
	}
}

func TestBuildMetadataIgnored(t *testing.T) {
	a, _ := Parse("1.2.3+abc")
	b, _ := Parse("1.2.3+xyz")
	if Compare(a, b) != 0 {
		t.Fatal("build metadata must not affect precedence")
	}
	base, _ := Parse("1.2.3")
	if Compare(a, base) != 0 {
		t.Fatal("build metadata must not affect precedence vs bare version")
	}
	if a.Core() != "1.2.3" {
		t.Fatalf("Core() = %s", a.Core())
	}
	if a.String() != "1.2.3+abc" {
		t.Fatalf("String() = %s", a.String())
	}
}

func TestCoreOrdering(t *testing.T) {
	pairs := [][2]string{
		{"1.0.0", "2.0.0"}, {"2.0.0", "2.1.0"}, {"2.1.0", "2.1.1"}, {"1.9.9", "1.10.0"},
	}
	for _, p := range pairs {
		a, _ := Parse(p[0])
		b, _ := Parse(p[1])
		if Compare(a, b) != -1 || !Less(a, b) {
			t.Fatalf("expected %s < %s", p[0], p[1])
		}
	}
}

func TestParseErrors(t *testing.T) {
	for _, bad := range []string{"", "1.0", "1.0.0-", "1.0.0+", "a.b.c", "1.0.0-01", "-1.0.0"} {
		if _, err := Parse(bad); err == nil {
			t.Fatalf("Parse(%q) unexpectedly succeeded", bad)
		}
	}
}
