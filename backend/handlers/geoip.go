package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// GeoIP proxies a request to ip-api.com for the given IP/hostname.
// We proxy rather than redirect so the browser never touches ip-api.com directly
// and we can apply SSRF/rate-limit controls here.
func GeoIP(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("ip"))

	// When no IP is provided (or "self"), detect the client's real IP so the
	// frontend can show "my IP" info without the browser ever touching the
	// plaintext http://ip-api.com endpoint directly.
	if query == "" || query == "self" {
		query = clientIP(r)
	}

	// ip-api accepts hostnames too, but we only validate if it looks like a host
	// (skip validation for bare IPs — ip-api handles those itself)
	if !isIPAddress(query) {
		if err := validateHost(query); err != nil {
			writeError(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	fields := "status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query"
	apiURL := "http://ip-api.com/json/" + url.PathEscape(query) + "?fields=" + fields

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodGet, apiURL, nil)
	if err != nil {
		writeError(w, "failed to build request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("geoip: lookup for %q failed: %v", query, err)
		writeError(w, "GeoIP lookup failed", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		writeError(w, "failed to read response", http.StatusBadGateway)
		return
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(body, &parsed); err != nil {
		writeError(w, "invalid upstream response", http.StatusBadGateway)
		return
	}

	// ip-api.com returns {"status":"fail","message":"..."} on error
	if status, _ := parsed["status"].(string); status == "fail" {
		msg, _ := parsed["message"].(string)
		if msg == "" {
			msg = "GeoIP lookup failed"
		}
		writeError(w, msg, http.StatusBadGateway)
		return
	}

	writeJSON(w, parsed)
}

// clientIP extracts the real client IP from the request.
// Trusts X-Forwarded-For only when the direct connection is from loopback
// (i.e. a trusted local reverse proxy), mirroring main.go's rate-limiter logic.
func clientIP(r *http.Request) string {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	if parsed := net.ParseIP(ip); parsed != nil && parsed.IsLoopback() {
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			return strings.TrimSpace(strings.SplitN(forwarded, ",", 2)[0])
		}
	}
	return ip
}
