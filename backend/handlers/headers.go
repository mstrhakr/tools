package handlers

import (
	"context"
	"log"
	"net"
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

	// Resolve once and pin the IP to prevent DNS rebinding on the actual
	// TCP connection (TOCTOU). We use a custom DialContext that always
	// connects to the pinned IP; the Host header is still set correctly
	// from the original URL by net/http, so TLS SNI works as expected.
	pinnedIP, err := validateAndResolve(parsed.Hostname())
	if err != nil {
		writeError(w, err.Error(), http.StatusBadRequest)
		return
	}

	port := parsed.Port()
	if port == "" {
		if parsed.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}
	pinnedAddr := net.JoinHostPort(pinnedIP.String(), port)

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
			return (&net.Dialer{Timeout: 10 * time.Second}).DialContext(ctx, network, pinnedAddr)
		},
	}

	client := &http.Client{
		Timeout:   15 * time.Second,
		Transport: transport,
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
		log.Printf("headers: request to %s failed: %v", rawURL, err)
		writeError(w, "request failed", http.StatusBadGateway)
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

	writeJSON(w, result)
}
