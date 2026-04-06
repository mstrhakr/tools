package handlers

import (
	"net"
	"net/http"
	"strings"
)

type ReverseDNSResult struct {
	IP      string   `json:"ip"`
	Hosts   []string `json:"hosts"`
	Error   string   `json:"error,omitempty"`
}

func ReverseDNS(w http.ResponseWriter, r *http.Request) {
	ip := strings.TrimSpace(r.URL.Query().Get("ip"))
	if ip == "" {
		writeError(w, "ip parameter required", http.StatusBadRequest)
		return
	}

	parsed := net.ParseIP(ip)
	if parsed == nil {
		writeError(w, "invalid IP address", http.StatusBadRequest)
		return
	}

	hosts, err := net.LookupAddr(ip)
	result := ReverseDNSResult{IP: ip}
	if err != nil {
		result.Error = "reverse DNS lookup failed"
	} else {
		// Strip trailing dots from PTR records
		for i, h := range hosts {
			hosts[i] = strings.TrimSuffix(h, ".")
		}
		result.Hosts = hosts
	}

	writeJSON(w, result)
}
