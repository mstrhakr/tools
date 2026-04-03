package handlers

import (
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func RDAP(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeError(w, "query parameter required", http.StatusBadRequest)
		return
	}

	// Determine if query is an IP or domain
	var rdapURL string
	if isIPAddress(query) {
		rdapURL = "https://rdap.org/ip/" + url.PathEscape(query)
	} else {
		// Treat as domain — strip leading dot
		domain := strings.TrimLeft(query, ".")
		rdapURL = "https://rdap.org/domain/" + url.PathEscape(domain)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest(http.MethodGet, rdapURL, nil)
	if err != nil {
		writeError(w, "failed to build RDAP request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Accept", "application/rdap+json, application/json")
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, err := client.Do(req)
	if err != nil {
		writeError(w, "RDAP lookup failed: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		writeError(w, "failed to read RDAP response", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}

func isIPAddress(s string) bool {
	// IPv4 or IPv6
	return strings.Count(s, ".") == 3 || strings.Contains(s, ":")
}
