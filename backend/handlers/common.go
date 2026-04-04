package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
)

// private IP ranges to block SSRF
var privateRanges = []net.IPNet{
	parseCIDR("10.0.0.0/8"),
	parseCIDR("172.16.0.0/12"),
	parseCIDR("192.168.0.0/16"),
	parseCIDR("127.0.0.0/8"),
	parseCIDR("169.254.0.0/16"),
	parseCIDR("0.0.0.0/8"),
	parseCIDR("100.64.0.0/10"),
}

func parseCIDR(s string) net.IPNet {
	_, n, err := net.ParseCIDR(s)
	if err != nil {
		panic(fmt.Sprintf("bad CIDR %s: %v", s, err))
	}
	return *n
}

func isPrivateIP(ip net.IP) bool {
	for _, r := range privateRanges {
		if r.Contains(ip) {
			return true
		}
	}
	// IPv6 loopback
	if ip.Equal(net.IPv6loopback) {
		return true
	}
	// ULA fc00::/7
	if len(ip) == 16 && (ip[0] == 0xfc || ip[0] == 0xfd) {
		return true
	}
	// Link-local fe80::/10
	if len(ip) == 16 && ip[0] == 0xfe && ip[1]&0xc0 == 0x80 {
		return true
	}
	return false
}

// validateAndResolve resolves host exactly once, validates every returned IP
// against the SSRF blocklist, and returns one pinned public IP.
//
// Callers must use the returned IP for all subsequent network connections
// instead of re-resolving the hostname. This prevents DNS rebinding attacks
// (TOCTOU) where a short-TTL record could return a private IP on the second
// lookup that happens at actual connection time.
func validateAndResolve(host string) (net.IP, error) {
	// Strip port if present
	h, _, err := net.SplitHostPort(host)
	if err != nil {
		h = host
	}
	if h == "" {
		return nil, errors.New("empty host")
	}

	// If the input is already a bare IP, validate it directly — no DNS needed.
	if ip := net.ParseIP(h); ip != nil {
		if isPrivateIP(ip) {
			return nil, errors.New("private/reserved IP addresses are not allowed")
		}
		return ip, nil
	}

	addrs, err := net.LookupHost(h)
	if err != nil {
		return nil, fmt.Errorf("cannot resolve host: %v", err)
	}

	var firstPublic net.IP
	for _, addr := range addrs {
		ip := net.ParseIP(addr)
		if ip == nil {
			continue
		}
		if isPrivateIP(ip) {
			return nil, errors.New("private/reserved IP addresses are not allowed")
		}
		if firstPublic == nil {
			firstPublic = ip
		}
	}
	if firstPublic == nil {
		return nil, errors.New("no valid public IP addresses found")
	}
	return firstPublic, nil
}

// validateHost is a convenience wrapper for callers that only need to verify
// a host is safe without requiring the pinned IP (e.g. CheckRedirect callbacks).
func validateHost(host string) error {
	_, err := validateAndResolve(host)
	return err
}

func writeError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
