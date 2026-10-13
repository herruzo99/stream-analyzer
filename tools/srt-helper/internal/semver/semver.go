// Package semver implements the SemVer 2.0.0 precedence rules that the
// helper and the analyzer both need to decide "is the local helper older
// than the published manifest?". Only the subset used by our manifests is
// supported: MAJOR.MINOR.PATCH[-prerelease][+build]. Build metadata is
// parsed but ignored for precedence, per the spec.
package semver

import (
	"fmt"
	"strconv"
	"strings"
)

// Version is a parsed semantic version.
type Version struct {
	Major, Minor, Patch int
	Pre                 []string // prerelease identifiers, no leading '-'
	Build               string   // build metadata, no leading '+'
}

// Parse parses a SemVer string.
func Parse(s string) (Version, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return Version{}, fmt.Errorf("empty version")
	}
	if i := strings.IndexByte(s, '+'); i >= 0 {
		build := s[i+1:]
		if build == "" || strings.ContainsAny(build, "+") {
			return Version{}, fmt.Errorf("invalid build metadata")
		}
		s = s[:i]
		v, err := parseCore(s)
		if err != nil {
			return Version{}, err
		}
		v.Build = build
		return v, nil
	}
	return parseCore(s)
}

func parseCore(s string) (Version, error) {
	var v Version
	rest := s
	if i := strings.IndexByte(rest, '-'); i >= 0 {
		if i == len(rest)-1 {
			return Version{}, fmt.Errorf("empty prerelease identifier")
		}
		v.Pre = splitIds(rest[i+1:])
		rest = rest[:i]
		for _, id := range v.Pre {
			if id == "" {
				return Version{}, fmt.Errorf("empty prerelease identifier")
			}
			if isNumeric(id) && len(id) > 1 && id[0] == '0' {
				return Version{}, fmt.Errorf("numeric prerelease identifier must not have leading zeros")
			}
		}
	}
	parts := strings.Split(rest, ".")
	if len(parts) != 3 {
		return Version{}, fmt.Errorf("expected MAJOR.MINOR.PATCH")
	}
	nums := make([]int, 3)
	for i, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil || n < 0 || strings.ContainsAny(p, "+-") {
			return Version{}, fmt.Errorf("invalid %s number", []string{"major", "minor", "patch"}[i])
		}
		nums[i] = n
	}
	v.Major, v.Minor, v.Patch = nums[0], nums[1], nums[2]
	return v, nil
}

func splitIds(s string) []string {
	if s == "" {
		return nil
	}
	return strings.Split(s, ".")
}

func isNumeric(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// String renders the version (build metadata included, prerelease kept).
func (v Version) String() string {
	s := fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
	if len(v.Pre) > 0 {
		s += "-" + strings.Join(v.Pre, ".")
	}
	if v.Build != "" {
		s += "+" + v.Build
	}
	return s
}

// Core renders version without build metadata.
func (v Version) Core() string {
	s := fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
	if len(v.Pre) > 0 {
		s += "-" + strings.Join(v.Pre, ".")
	}
	return s
}

// Compare returns -1, 0, or 1 per SemVer 2.0.0 precedence (build ignored).
func Compare(a, b Version) int {
	if c := cmpInt(a.Major, b.Major); c != 0 {
		return c
	}
	if c := cmpInt(a.Minor, b.Minor); c != 0 {
		return c
	}
	if c := cmpInt(a.Patch, b.Patch); c != 0 {
		return c
	}
	// A version with prerelease has lower precedence than one without.
	ap, bp := len(a.Pre) > 0, len(b.Pre) > 0
	switch {
	case ap && !bp:
		return -1
	case !ap && bp:
		return 1
	case !ap && !bp:
		return 0
	}
	for i := 0; i < len(a.Pre) && i < len(b.Pre); i++ {
		if c := comparePreID(a.Pre[i], b.Pre[i]); c != 0 {
			return c
		}
	}
	return cmpInt(len(a.Pre), len(b.Pre))
}

func comparePreID(a, b string) int {
	an, bn := isNumeric(a), isNumeric(b)
	switch {
	case an && bn:
		ai, _ := strconv.Atoi(a)
		bi, _ := strconv.Atoi(b)
		return cmpInt(ai, bi)
	case an:
		return -1 // numeric identifiers are lower precedence
	case bn:
		return 1
	default:
		return strings.Compare(a, b)
	}
}

func cmpInt(a, b int) int {
	switch {
	case a < b:
		return -1
	case a > b:
		return 1
	default:
		return 0
	}
}

// Less reports whether a < b.
func Less(a, b Version) bool { return Compare(a, b) < 0 }
