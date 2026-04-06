package handlers

import (
	"encoding/json"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

type ASNResult struct {
	IP           string `json:"ip"`
	ASN          int    `json:"asn"`
	ASNName      string `json:"asn_name"`
	Description  string `json:"description"`
	CountryCode  string `json:"country_code"`
	CountryName  string `json:"country_name"`
	Prefix       string `json:"prefix"`
	RIRName      string `json:"rir_name"`
	Allocation   string `json:"allocation_status"`
	ErrorMessage string `json:"error,omitempty"`
}

type bgpViewResponse struct {
	Status string `json:"status"`
	Data   struct {
		IP          string `json:"ip"`
		Prefix      string `json:"prefix"`
		RIRName     string `json:"rir_name"`
		Allocation  string `json:"allocation_status"`
		MaxMind     struct {
			CountryCode string `json:"country_code"`
			CountryName string `json:"country_name"`
		} `json:"maxmind"`
		ASN struct {
			ASN         int    `json:"asn"`
			Name        string `json:"name"`
			Description string `json:"description"`
		} `json:"asn"`
	} `json:"data"`
}

func ASNLookup(w http.ResponseWriter, r *http.Request) {
	ip := strings.TrimSpace(r.URL.Query().Get("ip"))
	if ip == "" {
		writeError(w, "ip parameter required", http.StatusBadRequest)
		return
	}

	parsed := net.ParseIP(ip)
	if parsed == nil {
		writeError(w, "invalid IP address", http.StatusBadRequest)
		return
	}

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Get("https://api.bgpview.io/ip/" + ip)
	if err != nil {
		writeError(w, "ASN lookup failed", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		writeError(w, "failed reading ASN response", http.StatusBadGateway)
		return
	}

	var parsedResp bgpViewResponse
	if err := json.Unmarshal(body, &parsedResp); err != nil {
		writeError(w, "invalid ASN response", http.StatusBadGateway)
		return
	}

	if resp.StatusCode >= 400 || parsedResp.Status != "ok" {
		writeError(w, "ASN data unavailable", http.StatusBadGateway)
		return
	}

	out := ASNResult{
		IP:          parsedResp.Data.IP,
		ASN:         parsedResp.Data.ASN.ASN,
		ASNName:     parsedResp.Data.ASN.Name,
		Description: parsedResp.Data.ASN.Description,
		CountryCode: parsedResp.Data.MaxMind.CountryCode,
		CountryName: parsedResp.Data.MaxMind.CountryName,
		Prefix:      parsedResp.Data.Prefix,
		RIRName:     parsedResp.Data.RIRName,
		Allocation:  parsedResp.Data.Allocation,
	}

	writeJSON(w, out)
}