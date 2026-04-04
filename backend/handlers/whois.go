package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type WHOISResult struct {
	Query  string `json:"query"`
	Source string `json:"source"`
	Raw    string `json:"raw"`
	Error  string `json:"error,omitempty"`
}

// WHOIS proxies a WHOIS-like lookup via whois.arin.net REST API (for IPs)
// and rdap.org (for domains). For raw text WHOIS we use the whois.iana.org
// REST endpoint where available.
func WHOIS(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeError(w, "query parameter required", http.StatusBadRequest)
		return
	}

	// Strip leading dot from domains
	query = strings.TrimLeft(query, ".")

	client := &http.Client{Timeout: 15 * time.Second}

	var apiURL, source string

	if isIPAddress(query) {
		// ARIN WHOIS REST for IPs
		apiURL = "https://whois.arin.net/rest/ip/" + url.PathEscape(query) + ".txt"
		source = "ARIN"

		if err := validateHost(query); err == nil {
			// only allow public IPs
		} else {
			writeError(w, err.Error(), http.StatusBadRequest)
			return
		}
	} else {
		// IANA WHOIS for domains
		apiURL = "https://www.iana.org/whois?q=" + url.QueryEscape(query)
		source = "IANA"

		if err := validateHost(query); err != nil {
			writeError(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err != nil {
		writeError(w, "failed to build request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Accept", "text/plain, */*")
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("whois: lookup for %q failed: %v", query, err)
		writeError(w, "WHOIS lookup failed", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
	if err != nil {
		writeError(w, "failed to read response", http.StatusBadGateway)
		return
	}

	result := WHOISResult{
		Query:  query,
		Source: source,
		Raw:    string(body),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
