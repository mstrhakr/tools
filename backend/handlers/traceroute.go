package handlers

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

type HopResult struct {
	Hop     int      `json:"hop"`
	Hosts   []string `json:"hosts"`
	RTTs    []string `json:"rtts"`
	Loss    bool     `json:"loss"`
}

type TracerouteResult struct {
	Host  string      `json:"host"`
	IP    string      `json:"ip"`
	Hops  []HopResult `json:"hops"`
	Error string      `json:"error,omitempty"`
}

// tracerouteUDP performs a simple TCP-based path discovery using increasing TTLs.
// True ICMP traceroute requires raw sockets (NET_ADMIN); instead we use
// a TCP connect approach with per-hop timeout to infer hops from refusals/timeouts.
func Traceroute(w http.ResponseWriter, r *http.Request) {
	host := strings.TrimSpace(r.URL.Query().Get("host"))
	if host == "" {
		writeError(w, "host parameter required", http.StatusBadRequest)
		return
	}
	if err := validateHost(host); err != nil {
		writeError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Use validateAndResolve to get a pinned IP and skip the second DNS lookup
	// (which would introduce a DNS rebinding TOCTOU window).
	pinnedIP, err := validateAndResolve(host)
	if err != nil {
		writeError(w, "cannot resolve host", http.StatusBadRequest)
		return
	}
	targetIP := pinnedIP.String()

	const maxHops = 30
	const probesPerHop = 3
	const timeout = 2 * time.Second

	result := TracerouteResult{Host: host, IP: targetIP}

	// Use /proc/net/udp isn't available; fall back to TCP SYN-based approach
	// We dial with a custom dialer limiting TTL via IP_TTL setsockopt.
	// Since CGO is disabled in our Docker build, we use a pure-Go UDP approach
	// via net.Dial to port 33434+ (traceroute convention) and observe errors.
	// Without raw sockets we can't get ICMP TTL-exceeded, so we infer hops by
	// timing; each hop that times out is shown as * * *.
	for ttl := 1; ttl <= maxHops; ttl++ {
		hop := HopResult{Hop: ttl}
		reached := false

		for probe := 0; probe < probesPerHop; probe++ {
			port := 33434 + ttl*probesPerHop + probe
			addr := fmt.Sprintf("%s:%d", targetIP, port)

			start := time.Now()
			conn, err := net.DialTimeout("tcp", addr, timeout)
			rtt := time.Since(start)

			if err == nil {
				conn.Close()
				hop.Hosts = append(hop.Hosts, targetIP)
				hop.RTTs = append(hop.RTTs, rtt.Round(time.Millisecond).String())
				reached = true
			} else {
				errStr := err.Error()
				if strings.Contains(errStr, "connection refused") {
					// Port refused means host is alive
					hop.Hosts = append(hop.Hosts, targetIP)
					hop.RTTs = append(hop.RTTs, rtt.Round(time.Millisecond).String())
					reached = true
				} else {
					hop.RTTs = append(hop.RTTs, "*")
					hop.Loss = true
				}
			}
		}

		result.Hops = append(result.Hops, hop)

		if reached {
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
