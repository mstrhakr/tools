package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type DANERecord struct {
	Data string `json:"data"`
	TTL  int    `json:"ttl"`
}

type DANEResult struct {
	Host         string       `json:"host"`
	Port         int          `json:"port"`
	Protocol     string       `json:"protocol"`
	QueryName    string       `json:"query_name"`
	TLSAFound    bool         `json:"tlsa_found"`
	TLSARecords  []DANERecord `json:"tlsa_records,omitempty"`
	DNSStatus    int          `json:"dns_status"`
	Score        int          `json:"score"`
	MaxScore     int          `json:"max_score"`
	Observations []string     `json:"observations"`
	Error        string       `json:"error,omitempty"`
}

type dnsJSONAnswer struct {
	Data string `json:"data"`
	TTL  int    `json:"TTL"`
}

type daneJSONResponse struct {
	Status int             `json:"Status"`
	Answer []dnsJSONAnswer `json:"Answer"`
}

func DANE(w http.ResponseWriter, r *http.Request) {
	host := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("host")))
	if host == "" {
		writeError(w, "host parameter required", http.StatusBadRequest)
		return
	}
	if strings.Contains(host, "/") || strings.Contains(host, " ") {
		writeError(w, "invalid host", http.StatusBadRequest)
		return
	}
	host = strings.TrimSuffix(host, ".")
	if host == "" {
		writeError(w, "invalid host", http.StatusBadRequest)
		return
	}

	port := 25
	if p := strings.TrimSpace(r.URL.Query().Get("port")); p != "" {
		parsed, err := strconv.Atoi(p)
		if err != nil || parsed <= 0 || parsed > 65535 {
			writeError(w, "invalid port", http.StatusBadRequest)
			return
		}
		port = parsed
	}

	protocol := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("protocol")))
	if protocol == "" {
		protocol = "tcp"
	}
	if protocol != "tcp" && protocol != "udp" {
		writeError(w, "protocol must be tcp or udp", http.StatusBadRequest)
		return
	}

	queryName := "_" + strconv.Itoa(port) + "._" + protocol + "." + host
	out := DANEResult{
		Host:      host,
		Port:      port,
		Protocol:  protocol,
		QueryName: queryName,
		MaxScore:  2,
	}

	resp, err := dohLookup(queryName, 52)
	if err != nil {
		out.Error = "DANE lookup failed"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
		return
	}

	out.DNSStatus = resp.Status
	if resp.Status == 0 {
		out.Score++
	}

	for _, ans := range resp.Answer {
		if strings.TrimSpace(ans.Data) != "" {
			out.TLSARecords = append(out.TLSARecords, DANERecord{Data: ans.Data, TTL: ans.TTL})
		}
	}

	if len(out.TLSARecords) > 0 {
		out.TLSAFound = true
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No TLSA records found for this service endpoint.")
	}

	if out.DNSStatus == 3 {
		out.Observations = append(out.Observations, "Domain or TLSA owner name returned NXDOMAIN.")
	} else if out.DNSStatus != 0 {
		out.Observations = append(out.Observations, "DNS resolver returned non-zero status code.")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func dohLookup(name string, rrType int) (daneJSONResponse, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	q := "https://cloudflare-dns.com/dns-query?name=" + url.QueryEscape(name) + "&type=" + strconv.Itoa(rrType)
	req, err := http.NewRequest(http.MethodGet, q, nil)
	if err != nil {
		return daneJSONResponse{}, err
	}
	req.Header.Set("Accept", "application/dns-json")
	req.Header.Set("User-Agent", "mstrhakr-tools/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return daneJSONResponse{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		return daneJSONResponse{}, err
	}

	var out daneJSONResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return daneJSONResponse{}, err
	}
	return out, nil
}