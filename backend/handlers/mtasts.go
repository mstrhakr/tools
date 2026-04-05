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

type MTASTSResult struct {
	Domain            string   `json:"domain"`
	PolicyTXTFound    bool     `json:"policy_txt_found"`
	PolicyTXTValue    string   `json:"policy_txt_value,omitempty"`
	PolicyFileFound   bool     `json:"policy_file_found"`
	PolicyFileURL     string   `json:"policy_file_url"`
	PolicyVersion     string   `json:"policy_version,omitempty"`
	PolicyMode        string   `json:"policy_mode,omitempty"`
	PolicyMaxAge      string   `json:"policy_max_age,omitempty"`
	PolicyMXPatterns  []string `json:"policy_mx_patterns,omitempty"`
	Score             int      `json:"score"`
	MaxScore          int      `json:"max_score"`
	Observations      []string `json:"observations"`
	Error             string   `json:"error,omitempty"`
}

func MTASTS(w http.ResponseWriter, r *http.Request) {
	domain := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("domain")))
	if domain == "" {
		writeError(w, "domain parameter required", http.StatusBadRequest)
		return
	}
	if strings.Contains(domain, "/") || strings.Contains(domain, " ") {
		writeError(w, "invalid domain", http.StatusBadRequest)
		return
	}
	domain = strings.TrimSuffix(domain, ".")
	if domain == "" {
		writeError(w, "invalid domain", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 12*time.Second)
	defer cancel()
	resolver := net.Resolver{}

	out := MTASTSResult{
		Domain:        domain,
		PolicyFileURL: "https://mta-sts." + domain + "/.well-known/mta-sts.txt",
		MaxScore:      4,
	}

	txtName := "_mta-sts." + domain
	if txt, err := resolver.LookupTXT(ctx, txtName); err == nil {
		for _, rec := range txt {
			low := strings.ToLower(strings.TrimSpace(rec))
			if strings.Contains(low, "v=stsv1") {
				out.PolicyTXTFound = true
				out.PolicyTXTValue = rec
				break
			}
		}
	}

	policyHost := "mta-sts." + domain
	body := ""
	if pinnedIP, err := validateAndResolve(policyHost); err == nil {
		if policy, fetchErr := fetchMTASTSPolicy(policyHost, pinnedIP); fetchErr == nil {
			out.PolicyFileFound = true
			body = policy
		} else {
			out.Observations = append(out.Observations, "Policy file fetch failed.")
		}
	} else {
		out.Observations = append(out.Observations, "mta-sts host not resolvable or not public.")
	}

	if out.PolicyFileFound {
		v, mode, maxAge, mx := parseMTASTSPolicy(body)
		out.PolicyVersion = v
		out.PolicyMode = mode
		out.PolicyMaxAge = maxAge
		out.PolicyMXPatterns = mx
	}

	if out.PolicyTXTFound {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No valid _mta-sts TXT record found.")
	}

	if out.PolicyFileFound {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "Policy file not found at mta-sts host.")
	}

	if strings.EqualFold(out.PolicyVersion, "STSv1") {
		out.Score++
	} else if out.PolicyFileFound {
		out.Observations = append(out.Observations, "Policy version is missing or invalid.")
	}

	if strings.EqualFold(out.PolicyMode, "enforce") || strings.EqualFold(out.PolicyMode, "testing") || strings.EqualFold(out.PolicyMode, "none") {
		out.Score++
		if strings.EqualFold(out.PolicyMode, "none") {
			out.Observations = append(out.Observations, "Policy mode is none (no active TLS enforcement).")
		}
	} else if out.PolicyFileFound {
		out.Observations = append(out.Observations, "Policy mode is missing or invalid.")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func fetchMTASTSPolicy(host string, pinnedIP net.IP) (string, error) {
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

	u := (&url.URL{Scheme: "https", Host: host, Path: "/.well-known/mta-sts.txt"}).String()
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", errPolicyUnavailable
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
	if err != nil {
		return "", err
	}
	return string(body), nil
}

var errPolicyUnavailable = &policyError{msg: "policy unavailable"}

type policyError struct{ msg string }

func (e *policyError) Error() string { return e.msg }

func parseMTASTSPolicy(policy string) (version string, mode string, maxAge string, mx []string) {
	lines := strings.Split(policy, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		parts := strings.SplitN(trimmed, ":", 2)
		if len(parts) != 2 {
			continue
		}
		k := strings.ToLower(strings.TrimSpace(parts[0]))
		v := strings.TrimSpace(parts[1])
		switch k {
		case "version":
			version = strings.TrimPrefix(strings.TrimSpace(v), "=")
			version = strings.TrimSpace(version)
		case "mode":
			mode = v
		case "max_age":
			maxAge = v
		case "mx":
			mx = append(mx, v)
		}
	}
	if strings.EqualFold(version, "stsv1") {
		version = "STSv1"
	}
	return version, mode, maxAge, mx
}