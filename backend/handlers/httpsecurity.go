package handlers

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type SecurityCheck struct {
	Name           string `json:"name"`
	Present        bool   `json:"present"`
	Value          string `json:"value,omitempty"`
	Recommendation string `json:"recommendation"`
}

type HTTPSecurityResult struct {
	URL        string          `json:"url"`
	StatusCode int             `json:"status_code"`
	Status     string          `json:"status"`
	Score      int             `json:"score"`
	MaxScore   int             `json:"max_score"`
	Checks     []SecurityCheck `json:"checks"`
	Error      string          `json:"error,omitempty"`
}

func HTTPSecurity(w http.ResponseWriter, r *http.Request) {
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
		json.NewEncoder(w).Encode(HTTPSecurityResult{URL: rawURL, Error: "request failed"})
		return
	}
	defer resp.Body.Close()

	h := normalizeHeaders(resp.Header)
	checks, score := scoreHeaders(h)

	result := HTTPSecurityResult{
		URL:        rawURL,
		StatusCode: resp.StatusCode,
		Status:     resp.Status,
		Score:      score,
		MaxScore:   len(checks),
		Checks:     checks,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func normalizeHeaders(h http.Header) map[string]string {
	out := make(map[string]string)
	for k, vals := range h {
		out[strings.ToLower(k)] = strings.Join(vals, ", ")
	}
	return out
}

func scoreHeaders(h map[string]string) ([]SecurityCheck, int) {
	checks := []SecurityCheck{
		{
			Name:           "Strict-Transport-Security",
			Present:        h["strict-transport-security"] != "",
			Value:          h["strict-transport-security"],
			Recommendation: "Enable HSTS with long max-age and includeSubDomains on HTTPS sites.",
		},
		{
			Name:           "Content-Security-Policy",
			Present:        h["content-security-policy"] != "",
			Value:          h["content-security-policy"],
			Recommendation: "Define a restrictive Content-Security-Policy to reduce XSS risk.",
		},
		{
			Name:           "X-Content-Type-Options",
			Present:        strings.Contains(strings.ToLower(h["x-content-type-options"]), "nosniff"),
			Value:          h["x-content-type-options"],
			Recommendation: "Set X-Content-Type-Options to nosniff.",
		},
		{
			Name:           "X-Frame-Options / frame-ancestors",
			Present:        h["x-frame-options"] != "" || strings.Contains(strings.ToLower(h["content-security-policy"]), "frame-ancestors"),
			Value:          firstNonEmpty(h["x-frame-options"], h["content-security-policy"]),
			Recommendation: "Set X-Frame-Options or CSP frame-ancestors to prevent clickjacking.",
		},
		{
			Name:           "Referrer-Policy",
			Present:        h["referrer-policy"] != "",
			Value:          h["referrer-policy"],
			Recommendation: "Set Referrer-Policy to control leaked URL metadata.",
		},
		{
			Name:           "Permissions-Policy",
			Present:        h["permissions-policy"] != "",
			Value:          h["permissions-policy"],
			Recommendation: "Set Permissions-Policy to limit sensitive browser APIs.",
		},
	}

	score := 0
	for _, c := range checks {
		if c.Present {
			score++
		}
	}
	return checks, score
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}