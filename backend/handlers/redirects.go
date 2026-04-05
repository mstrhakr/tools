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

type RedirectStep struct {
	URL        string `json:"url"`
	StatusCode int    `json:"status_code"`
	Status     string `json:"status"`
	Location   string `json:"location,omitempty"`
}

type RedirectResult struct {
	StartURL       string         `json:"start_url"`
	FinalURL       string         `json:"final_url"`
	Redirects      int            `json:"redirects"`
	Chain          []RedirectStep `json:"chain"`
	StoppedByLimit bool           `json:"stopped_by_limit,omitempty"`
	Error          string         `json:"error,omitempty"`
}

func Redirects(w http.ResponseWriter, r *http.Request) {
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

	const maxHops = 8
	result := RedirectResult{StartURL: rawURL}
	current := parsed

	for i := 0; i <= maxHops; i++ {
		step, nextURL, err := inspectSingleHop(current.String())
		if err != nil {
			result.Error = err.Error()
			break
		}
		result.Chain = append(result.Chain, step)

		if nextURL == nil {
			result.FinalURL = current.String()
			result.Redirects = len(result.Chain) - 1
			break
		}

		current = nextURL
		if i == maxHops {
			result.FinalURL = current.String()
			result.Redirects = len(result.Chain) - 1
			result.StoppedByLimit = true
		}
	}

	if result.FinalURL == "" {
		result.FinalURL = current.String()
		if len(result.Chain) > 0 {
			result.Redirects = len(result.Chain) - 1
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func inspectSingleHop(rawURL string) (RedirectStep, *url.URL, error) {
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return RedirectStep{}, nil, err
	}

	if err := validateHost(parsed.Hostname()); err != nil {
		return RedirectStep{}, nil, err
	}

	pinnedIP, err := validateAndResolve(parsed.Hostname())
	if err != nil {
		return RedirectStep{}, nil, err
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

	req, err := http.NewRequest(http.MethodHead, parsed.String(), nil)
	if err != nil {
		return RedirectStep{}, nil, err
	}
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return RedirectStep{}, nil, err
	}
	defer resp.Body.Close()

	step := RedirectStep{
		URL:        parsed.String(),
		StatusCode: resp.StatusCode,
		Status:     resp.Status,
	}

	if resp.StatusCode < 300 || resp.StatusCode >= 400 {
		return step, nil, nil
	}

	loc := strings.TrimSpace(resp.Header.Get("Location"))
	if loc == "" {
		return step, nil, nil
	}

	nextURL, err := parsed.Parse(loc)
	if err != nil {
		return step, nil, err
	}
	if nextURL.Scheme != "http" && nextURL.Scheme != "https" {
		return step, nil, nil
	}

	step.Location = nextURL.String()
	return step, nextURL, nil
}