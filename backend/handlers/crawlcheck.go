package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type CrawlResource struct {
	URL        string   `json:"url"`
	StatusCode int      `json:"status_code"`
	Status     string   `json:"status"`
	Exists     bool     `json:"exists"`
	SizeBytes  int      `json:"size_bytes"`
	Hints      []string `json:"hints,omitempty"`
	Error      string   `json:"error,omitempty"`
}

type CrawlCheckResult struct {
	Host      string        `json:"host"`
	Robots    CrawlResource `json:"robots"`
	Sitemap   CrawlResource `json:"sitemap"`
	Error     string        `json:"error,omitempty"`
	Score     int           `json:"score"`
	MaxScore  int           `json:"max_score"`
	RobotsRaw string        `json:"robots_raw,omitempty"`
}

func CrawlCheck(w http.ResponseWriter, r *http.Request) {
	rawHost := strings.TrimSpace(r.URL.Query().Get("host"))
	if rawHost == "" {
		writeError(w, "host parameter required", http.StatusBadRequest)
		return
	}

	host := normalizeHost(rawHost)
	if host == "" {
		writeError(w, "invalid host", http.StatusBadRequest)
		return
	}

	pinnedIP, err := validateAndResolve(host)
	if err != nil {
		writeError(w, err.Error(), http.StatusBadRequest)
		return
	}

	result := CrawlCheckResult{Host: host, MaxScore: 3}

	robots, robotsBody := fetchPinnedResource(host, pinnedIP, "/robots.txt", 256*1024)
	result.Robots = robots
	if robots.Exists {
		result.Score++
		if robotsBody != "" {
			result.RobotsRaw = robotsBody
			result.Robots.Hints = parseRobotsHints(robotsBody)
		}
	}

	sitemap, _ := fetchPinnedResource(host, pinnedIP, "/sitemap.xml", 1024*1024)
	result.Sitemap = sitemap
	if sitemap.Exists {
		result.Score++
	}

	if hasSitemapHint(result.Robots.Hints) {
		result.Score++
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func fetchPinnedResource(host string, pinnedIP net.IP, path string, maxBytes int64) (CrawlResource, string) {
	resourceURL := (&url.URL{Scheme: "https", Host: host, Path: path}).String()
	res := CrawlResource{URL: resourceURL}

	pinnedAddr := net.JoinHostPort(pinnedIP.String(), "443")
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
			return (&net.Dialer{Timeout: 10 * time.Second}).DialContext(ctx, network, pinnedAddr)
		},
	}

	client := &http.Client{
		Timeout:   12 * time.Second,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	req, err := http.NewRequest(http.MethodGet, resourceURL, nil)
	if err != nil {
		res.Error = "request build failed"
		return res, ""
	}
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, err := client.Do(req)
	if err != nil {
		res.Error = "request failed"
		return res, ""
	}
	defer resp.Body.Close()

	res.StatusCode = resp.StatusCode
	res.Status = resp.Status
	res.Exists = resp.StatusCode >= 200 && resp.StatusCode < 300

	body, readErr := io.ReadAll(io.LimitReader(resp.Body, maxBytes))
	if readErr != nil {
		res.Error = "read failed"
		return res, ""
	}
	res.SizeBytes = len(body)

	return res, string(body)
}

func parseRobotsHints(robots string) []string {
	lines := strings.Split(robots, "\n")
	hints := []string{}
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		low := strings.ToLower(trimmed)
		if strings.HasPrefix(low, "sitemap:") {
			hints = append(hints, trimmed)
		}
		if strings.HasPrefix(low, "user-agent:") || strings.HasPrefix(low, "allow:") || strings.HasPrefix(low, "disallow:") {
			hints = append(hints, trimmed)
		}
	}
	return hints
}

func hasSitemapHint(hints []string) bool {
	for _, h := range hints {
		if strings.HasPrefix(strings.ToLower(h), "sitemap:") {
			return true
		}
	}
	return false
}
