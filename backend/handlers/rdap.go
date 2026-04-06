package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
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

	client := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return errors.New("too many redirects")
			}
			// Validate each redirect target so rdap.org can't redirect us to an
			// internal address (SSRF via open redirect chain).
			if err := validateHost(req.URL.Hostname()); err != nil {
				return fmt.Errorf("redirect blocked: %w", err)
			}
			return nil
		},
	}
	req, err := http.NewRequest(http.MethodGet, rdapURL, nil)
	if err != nil {
		writeError(w, "failed to build RDAP request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Accept", "application/rdap+json, application/json")
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("rdap: lookup for %q failed: %v", query, err)
		writeError(w, "RDAP lookup failed", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		writeError(w, "failed to read RDAP response", http.StatusBadGateway)
		return
	}

	if resp.StatusCode >= 400 {
		writeError(w, "RDAP lookup returned "+resp.Status, http.StatusBadGateway)
		return
	}

	var parsed interface{}
	if err := json.Unmarshal(body, &parsed); err != nil {
		writeError(w, "invalid RDAP response", http.StatusBadGateway)
		return
	}

	writeJSON(w, parsed)
}

// isIPAddress uses net.ParseIP for reliable IP detection.
// The previous heuristic (counting dots or looking for colons) falsely matched
// domains like a.b.c.d or example.com:8080.
func isIPAddress(s string) bool {
	return net.ParseIP(s) != nil
}
