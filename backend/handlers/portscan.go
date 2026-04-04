package handlers

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Common ports with service names
var commonPorts = []struct {
	Port    int
	Service string
}{
	{21, "FTP"}, {22, "SSH"}, {23, "Telnet"}, {25, "SMTP"},
	{53, "DNS"}, {80, "HTTP"}, {110, "POP3"}, {143, "IMAP"},
	{443, "HTTPS"}, {445, "SMB"}, {993, "IMAPS"}, {995, "POP3S"},
	{1433, "MSSQL"}, {1521, "Oracle"}, {3306, "MySQL"},
	{3389, "RDP"}, {5432, "PostgreSQL"}, {5900, "VNC"},
	{6379, "Redis"}, {8080, "HTTP-alt"}, {8443, "HTTPS-alt"},
	{8888, "HTTP-alt2"}, {9200, "Elasticsearch"}, {27017, "MongoDB"},
}

type PortResult struct {
	Port    int    `json:"port"`
	Service string `json:"service"`
	Open    bool   `json:"open"`
}

type PortScanResult struct {
	Host  string       `json:"host"`
	Ports []PortResult `json:"ports"`
	Error string       `json:"error,omitempty"`
}

func PortScan(w http.ResponseWriter, r *http.Request) {
	host := strings.TrimSpace(r.URL.Query().Get("host"))
	if host == "" {
		writeError(w, "host parameter required", http.StatusBadRequest)
		return
	}
	pinnedIP, err := validateAndResolve(host)
	if err != nil {
		writeError(w, err.Error(), http.StatusBadRequest)
		return
	}

	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		results []PortResult
	)

	// Semaphore: limit to 50 concurrent dials
	sem := make(chan struct{}, 50)

	for _, p := range commonPorts {
		wg.Add(1)
		go func(port int, service string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			// Dial the pinned IP directly to prevent DNS rebinding.
			addr := net.JoinHostPort(pinnedIP.String(), fmt.Sprintf("%d", port))
			conn, err := net.DialTimeout("tcp", addr, 3*time.Second)
			open := false
			if err == nil {
				conn.Close()
				open = true
			}
			mu.Lock()
			results = append(results, PortResult{Port: port, Service: service, Open: open})
			mu.Unlock()
		}(p.Port, p.Service)
	}

	wg.Wait()

	// Sort by port number
	sortPorts(results)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(PortScanResult{Host: host, Ports: results})
}

func sortPorts(ports []PortResult) {
	// Simple insertion sort (small slice)
	for i := 1; i < len(ports); i++ {
		for j := i; j > 0 && ports[j].Port < ports[j-1].Port; j-- {
			ports[j], ports[j-1] = ports[j-1], ports[j]
		}
	}
}
