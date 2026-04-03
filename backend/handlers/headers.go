package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type HeadersResult struct {
	URL        string            `json:"url"`
	StatusCode int               `json:"status_code"`
	Status     string            `json:"status"`
	Headers    map[string]string `json:"headers"`
	Error      string            `json:"error,omitempty"`
}

func Headers(w http.ResponseWriter, r *http.Request) {
	rawURL := strings.TrimSpace(r.URL.Query().Get("url"))
	if rawURL == "" {
		writeError(w, "url parameter required", http.StatusBadRequest)
		return
	}

	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil {
		writeError(w, "invalid URL", http.StatusBadRequest)
		return
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		writeError(w, "only http and https URLs are allowed", http.StatusBadRequest)
		return
	}

	if err := validateHost(parsed.Hostname()); err != nil {
		writeError(w, err.Error(), http.StatusBadRequest)
		return
	}

	client := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Don't follow redirects — caller sees the redirect itself
			return http.ErrUseLastResponse
		},
	}

	req, err := http.NewRequest(http.MethodHead, rawURL, nil)
	if err != nil {
		writeError(w, "failed to build request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, err := client.Do(req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(HeadersResult{URL: rawURL, Error: err.Error()})
		return
	}
	defer resp.Body.Close()

	headers := make(map[string]string)
	for k, vals := range resp.Header {
		headers[k] = strings.Join(vals, ", ")
	}

	result := HeadersResult{
		URL:        rawURL,
		StatusCode: resp.StatusCode,
		Status:     resp.Status,
		Headers:    headers,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
