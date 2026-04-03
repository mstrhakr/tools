package handlers

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

type PingResult struct {
	Host    string `json:"host"`
	Port    int    `json:"port"`
	Latency string `json:"latency"`
	Alive   bool   `json:"alive"`
	Error   string `json:"error,omitempty"`
}

func Ping(w http.ResponseWriter, r *http.Request) {
	host := strings.TrimSpace(r.URL.Query().Get("host"))
	if host == "" {
		writeError(w, "host parameter required", http.StatusBadRequest)
		return
	}
	if err := validateHost(host); err != nil {
		writeError(w, err.Error(), http.StatusBadRequest)
		return
	}

	result := PingResult{Host: host}

	// Try port 443 first, fall back to 80
	for _, port := range []int{443, 80} {
		addr := net.JoinHostPort(host, fmt.Sprintf("%d", port))
		start := time.Now()
		conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
		if err == nil {
			conn.Close()
			result.Alive = true
			result.Port = port
			result.Latency = time.Since(start).Round(time.Millisecond).String()
			break
		}
	}

	if !result.Alive {
		result.Error = "host unreachable on ports 80 and 443"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
