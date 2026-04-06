package handlers

import (
	"context"
	"crypto/tls"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type SiteAuditResult struct {
	Host                  string   `json:"host"`
	HTTPStatus            string   `json:"http_status"`
	HTTPSTatus            string   `json:"https_status"`
	RedirectsToHTTPS      bool     `json:"redirects_to_https"`
	TLSVersion            string   `json:"tls_version"`
	CipherSuite           string   `json:"cipher_suite"`
	CertDaysLeft          int      `json:"cert_days_left"`
	CertExpired           bool     `json:"cert_expired"`
	HSTS                  bool     `json:"hsts"`
	CSP                   bool     `json:"csp"`
	NoSniff               bool     `json:"nosniff"`
	FrameProtection       bool     `json:"frame_protection"`
	ReferrerPolicy        bool     `json:"referrer_policy"`
	PermissionsPolicy     bool     `json:"permissions_policy"`
	Score                 int      `json:"score"`
	MaxScore              int      `json:"max_score"`
	Notices               []string `json:"notices,omitempty"`
	Error                 string   `json:"error,omitempty"`
}

func SiteAudit(w http.ResponseWriter, r *http.Request) {
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

	result := SiteAuditResult{Host: host, MaxScore: 8}

	httpStatus, location, httpErr := headPinned("http", host, pinnedIP)
	if httpErr != nil {
		result.Notices = append(result.Notices, "HTTP check: "+httpErr.Error())
	} else {
		result.HTTPStatus = httpStatus
		if strings.HasPrefix(strings.ToLower(location), "https://") {
			result.RedirectsToHTTPS = true
		}
	}

	httpsStatus, _, httpsHeaders, httpsErr := headPinnedWithHeaders("https", host, pinnedIP)
	if httpsErr != nil {
		result.Notices = append(result.Notices, "HTTPS check: "+httpsErr.Error())
	} else {
		result.HTTPSTatus = httpsStatus
		result.HSTS = strings.TrimSpace(httpsHeaders.Get("Strict-Transport-Security")) != ""
		result.CSP = strings.TrimSpace(httpsHeaders.Get("Content-Security-Policy")) != ""
		result.NoSniff = strings.Contains(strings.ToLower(httpsHeaders.Get("X-Content-Type-Options")), "nosniff")
		result.FrameProtection = strings.TrimSpace(httpsHeaders.Get("X-Frame-Options")) != "" || strings.Contains(strings.ToLower(httpsHeaders.Get("Content-Security-Policy")), "frame-ancestors")
		result.ReferrerPolicy = strings.TrimSpace(httpsHeaders.Get("Referrer-Policy")) != ""
		result.PermissionsPolicy = strings.TrimSpace(httpsHeaders.Get("Permissions-Policy")) != ""
	}

	if tlsVersion, cipher, daysLeft, expired, tlsErr := inspectTLS(host, pinnedIP); tlsErr != nil {
		result.Notices = append(result.Notices, "TLS inspection: "+tlsErr.Error())
	} else {
		result.TLSVersion = tlsVersion
		result.CipherSuite = cipher
		result.CertDaysLeft = daysLeft
		result.CertExpired = expired
	}

	result.Score = 0
	if result.RedirectsToHTTPS {
		result.Score++
	}
	if result.HSTS {
		result.Score++
	}
	if result.CSP {
		result.Score++
	}
	if result.NoSniff {
		result.Score++
	}
	if result.FrameProtection {
		result.Score++
	}
	if result.ReferrerPolicy {
		result.Score++
	}
	if result.PermissionsPolicy {
		result.Score++
	}
	if result.TLSVersion != "" && !result.CertExpired {
		result.Score++
	}

	writeJSON(w, result)
}

func normalizeHost(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "https://")
	raw = strings.TrimPrefix(raw, "http://")
	raw = strings.SplitN(raw, "/", 2)[0]
	if h, _, err := net.SplitHostPort(raw); err == nil {
		raw = h
	}
	return strings.TrimSpace(raw)
}

func headPinned(scheme, host string, pinnedIP net.IP) (status string, location string, err error) {
	status, location, _, err = headPinnedWithHeaders(scheme, host, pinnedIP)
	return status, location, err
}

func headPinnedWithHeaders(scheme, host string, pinnedIP net.IP) (status string, location string, headers http.Header, err error) {
	port := "80"
	if scheme == "https" {
		port = "443"
	}
	pinnedAddr := net.JoinHostPort(pinnedIP.String(), port)

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

	rawURL := (&url.URL{Scheme: scheme, Host: host, Path: "/"}).String()
	req, reqErr := http.NewRequest(http.MethodHead, rawURL, nil)
	if reqErr != nil {
		return "", "", nil, reqErr
	}
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, doErr := client.Do(req)
	if doErr != nil {
		return "", "", nil, doErr
	}
	defer resp.Body.Close()

	return resp.Status, resp.Header.Get("Location"), resp.Header, nil
}

func inspectTLS(host string, pinnedIP net.IP) (version string, cipher string, daysLeft int, expired bool, err error) {
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	conn, tlsErr := tls.DialWithDialer(dialer, "tcp", net.JoinHostPort(pinnedIP.String(), "443"), &tls.Config{ServerName: host})
	if tlsErr != nil {
		return "", "", 0, false, tlsErr
	}
	defer conn.Close()

	state := conn.ConnectionState()
	version = tlsVersionName(state.Version)
	cipher = tls.CipherSuiteName(state.CipherSuite)

	if len(state.PeerCertificates) == 0 {
		return version, cipher, 0, false, nil
	}

	now := time.Now()
	leaf := state.PeerCertificates[0]
	daysLeft = int(leaf.NotAfter.Sub(now).Hours() / 24)
	expired = now.After(leaf.NotAfter)
	return version, cipher, daysLeft, expired, nil
}