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
	// IPv6 loopback / ULA
	if ip.Equal(net.IPv6loopback) {
		return true
	}
	if len(ip) == 16 && ip[0] == 0xfc || (len(ip) == 16 && ip[0] == 0xfd) {
		return true
	}
	return false
}

// validateHost resolves the hostname and rejects private/loopback IPs (SSRF protection).
func validateHost(host string) error {
	// Strip port if present
	h, _, err := net.SplitHostPort(host)
	if err != nil {
		h = host
	}
	if h == "" {
		return errors.New("empty host")
	}

	addrs, err := net.LookupHost(h)
	if err != nil {
		return fmt.Errorf("cannot resolve host: %v", err)
	}
	for _, addr := range addrs {
		ip := net.ParseIP(addr)
		if ip == nil {
			continue
		}
		if isPrivateIP(ip) {
			return errors.New("private/reserved IP addresses are not allowed")
		}
	}
	return nil
}

func writeError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
