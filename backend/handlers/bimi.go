package handlers

import (
	"context"
	"net"
	"net/http"
	"strings"
	"time"
)

type BIMIResult struct {
	Domain          string   `json:"domain"`
	Selector        string   `json:"selector"`
	RecordName      string   `json:"record_name"`
	RecordFound     bool     `json:"record_found"`
	RecordValue     string   `json:"record_value,omitempty"`
	Version         string   `json:"version,omitempty"`
	LogoURL         string   `json:"logo_url,omitempty"`
	VMCCertificate  string   `json:"vmc_certificate,omitempty"`
	Score           int      `json:"score"`
	MaxScore        int      `json:"max_score"`
	Observations    []string `json:"observations"`
	Error           string   `json:"error,omitempty"`
}

func BIMI(w http.ResponseWriter, r *http.Request) {
	domain := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("domain")))
	selector := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("selector")))
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
	if selector == "" {
		selector = "default"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	resolver := net.Resolver{}

	recordName := selector + "._bimi." + domain
	out := BIMIResult{
		Domain:     domain,
		Selector:   selector,
		RecordName: recordName,
		MaxScore:   3,
	}

	txt, err := resolver.LookupTXT(ctx, recordName)
	if err != nil || len(txt) == 0 {
		out.Observations = append(out.Observations, "No BIMI TXT record found for selector.")
		writeJSON(w, out)
		return
	}

	for _, rec := range txt {
		lower := strings.ToLower(strings.TrimSpace(rec))
		if strings.Contains(lower, "v=bimi1") {
			out.RecordFound = true
			out.RecordValue = rec
			break
		}
	}

	if !out.RecordFound {
		out.Observations = append(out.Observations, "TXT records exist but none look like BIMI (v=BIMI1).")
		writeJSON(w, out)
		return
	}

	out.Version, out.LogoURL, out.VMCCertificate = parseBIMIRecord(out.RecordValue)

	if strings.EqualFold(out.Version, "BIMI1") {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "BIMI version missing or invalid.")
	}

	if out.LogoURL != "" {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "BIMI logo URL (l=) is missing.")
	}

	if out.VMCCertificate != "" {
		out.Score++
		out.Observations = append(out.Observations, "VMC URL present (a=).")
	} else {
		out.Observations = append(out.Observations, "No VMC URL (a=). Some mailbox providers may not display BIMI logos.")
	}

	writeJSON(w, out)
}

func parseBIMIRecord(record string) (version, logoURL, vmcURL string) {
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
			version = strings.ToUpper(v)
		case "l":
			logoURL = v
		case "a":
			vmcURL = v
		}
	}
	return version, logoURL, vmcURL
}