package handlers

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"time"
)

type TLSRPTResult struct {
	Domain       string   `json:"domain"`
	RecordName   string   `json:"record_name"`
	RecordFound  bool     `json:"record_found"`
	RecordValue  string   `json:"record_value,omitempty"`
	Version      string   `json:"version,omitempty"`
	ReportURIs   []string `json:"report_uris,omitempty"`
	Score        int      `json:"score"`
	MaxScore     int      `json:"max_score"`
	Observations []string `json:"observations"`
	Error        string   `json:"error,omitempty"`
}

func TLSRPT(w http.ResponseWriter, r *http.Request) {
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

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	resolver := net.Resolver{}

	recordName := "_smtp._tls." + domain
	out := TLSRPTResult{
		Domain:     domain,
		RecordName: recordName,
		MaxScore:   2,
	}

	txt, err := resolver.LookupTXT(ctx, recordName)
	if err != nil || len(txt) == 0 {
		out.Observations = append(out.Observations, "No TLS-RPT TXT record found.")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
		return
	}

	for _, rec := range txt {
		lower := strings.ToLower(strings.TrimSpace(rec))
		if strings.Contains(lower, "v=tlsrptv1") {
			out.RecordFound = true
			out.RecordValue = rec
			break
		}
	}

	if !out.RecordFound {
		out.Observations = append(out.Observations, "TXT records exist but none look like TLS-RPT (v=TLSRPTv1).")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
		return
	}

	out.Version, out.ReportURIs = parseTLSRPTRecord(out.RecordValue)
	if strings.EqualFold(out.Version, "TLSRPTv1") {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "TLS-RPT version missing or invalid.")
	}

	if len(out.ReportURIs) > 0 {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No rua reporting URI found.")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func parseTLSRPTRecord(record string) (version string, uris []string) {
	parts := strings.Split(record, ";")
	for _, part := range parts {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		k := strings.ToLower(strings.TrimSpace(kv[0]))
		v := strings.TrimSpace(kv[1])
		switch k {
		case "v":
			version = strings.TrimSpace(v)
		case "rua":
			items := strings.Split(v, ",")
			for _, item := range items {
				trimmed := strings.TrimSpace(item)
				if trimmed != "" {
					uris = append(uris, trimmed)
				}
			}
		}
	}
	return version, uris
}