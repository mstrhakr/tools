package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
)

type DNSSECResult struct {
	Domain            string   `json:"domain"`
	ParentZone        string   `json:"parent_zone"`
	DSFound           bool     `json:"ds_found"`
	DNSKEYFound       bool     `json:"dnskey_found"`
	DSCount           int      `json:"ds_count"`
	DNSKEYCount       int      `json:"dnskey_count"`
	ParentDSQuery     string   `json:"parent_ds_query"`
	ChildDNSKEYQuery  string   `json:"child_dnskey_query"`
	Score             int      `json:"score"`
	MaxScore          int      `json:"max_score"`
	Observations      []string `json:"observations"`
	Error             string   `json:"error,omitempty"`
}

func DNSSEC(w http.ResponseWriter, r *http.Request) {
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

	parent := parentZone(domain)
	out := DNSSECResult{
		Domain:           domain,
		ParentZone:       parent,
		ParentDSQuery:    domain,
		ChildDNSKEYQuery: domain,
		MaxScore:         2,
	}

	dsResp, err := dohLookup(domain, 43)
	if err != nil {
		out.Error = "DS lookup failed"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
		return
	}
	for _, ans := range dsResp.Answer {
		if strings.TrimSpace(ans.Data) != "" {
			out.DSCount++
		}
	}
	out.DSFound = out.DSCount > 0

	dnskeyResp, err := dohLookup(domain, 48)
	if err != nil {
		out.Error = "DNSKEY lookup failed"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
		return
	}
	for _, ans := range dnskeyResp.Answer {
		if strings.TrimSpace(ans.Data) != "" {
			out.DNSKEYCount++
		}
	}
	out.DNSKEYFound = out.DNSKEYCount > 0

	if out.DSFound {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No DS records found; delegation may be unsigned.")
	}

	if out.DNSKEYFound {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No DNSKEY records found at child zone apex.")
	}

	if out.DSFound && !out.DNSKEYFound {
		out.Observations = append(out.Observations, "DS exists but DNSKEY not found; configuration may be broken.")
	}

	if !out.DSFound && out.DNSKEYFound {
		out.Observations = append(out.Observations, "DNSKEY exists without DS in parent; chain of trust is incomplete.")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func parentZone(domain string) string {
	parts := strings.Split(domain, ".")
	if len(parts) < 2 {
		return domain
	}
	return strings.Join(parts[1:], ".")
}