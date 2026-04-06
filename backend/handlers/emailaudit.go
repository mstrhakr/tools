package handlers

import (
	"context"
	"net"
	"net/http"
	"strings"
	"time"
)

type EmailAuditResult struct {
	Domain        string   `json:"domain"`
	MXFound       bool     `json:"mx_found"`
	MXRecords     []string `json:"mx_records"`
	SPFFound      bool     `json:"spf_found"`
	SPFRecord     string   `json:"spf_record,omitempty"`
	DMARCFound    bool     `json:"dmarc_found"`
	DMARCRecord   string   `json:"dmarc_record,omitempty"`
	DMARCPolicy   string   `json:"dmarc_policy,omitempty"`
	DKIMFound     bool     `json:"dkim_found"`
	DKIMSelector  string   `json:"dkim_selector"`
	DKIMRecord    string   `json:"dkim_record,omitempty"`
	Score         int      `json:"score"`
	MaxScore      int      `json:"max_score"`
	Observations  []string `json:"observations"`
	Error         string   `json:"error,omitempty"`
}

func EmailAudit(w http.ResponseWriter, r *http.Request) {
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

	out := EmailAuditResult{
		Domain:       domain,
		DKIMSelector: "default",
		MaxScore:     5,
	}

	if mx, err := resolver.LookupMX(ctx, domain); err == nil && len(mx) > 0 {
		out.MXFound = true
		for _, rec := range mx {
			host := strings.TrimSuffix(rec.Host, ".")
			out.MXRecords = append(out.MXRecords, host+" (priority "+itoa(rec.Pref)+")")
		}
	}

	if txt, err := resolver.LookupTXT(ctx, domain); err == nil {
		for _, rec := range txt {
			if strings.HasPrefix(strings.ToLower(strings.TrimSpace(rec)), "v=spf1") {
				out.SPFFound = true
				out.SPFRecord = rec
				break
			}
		}
	}

	dmarcName := "_dmarc." + domain
	if txt, err := resolver.LookupTXT(ctx, dmarcName); err == nil {
		for _, rec := range txt {
			if strings.HasPrefix(strings.ToLower(strings.TrimSpace(rec)), "v=dmarc1") {
				out.DMARCFound = true
				out.DMARCRecord = rec
				out.DMARCPolicy = extractDMARCPolicy(rec)
				break
			}
		}
	}

	dkimName := out.DKIMSelector + "._domainkey." + domain
	if txt, err := resolver.LookupTXT(ctx, dkimName); err == nil {
		for _, rec := range txt {
			low := strings.ToLower(strings.TrimSpace(rec))
			if strings.Contains(low, "v=dkim1") || strings.Contains(low, "k=rsa") || strings.Contains(low, "p=") {
				out.DKIMFound = true
				out.DKIMRecord = rec
				break
			}
		}
	}

	if out.MXFound {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No MX records found.")
	}

	if out.SPFFound {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No SPF record found.")
	}

	if out.DMARCFound {
		out.Score++
		switch strings.ToLower(out.DMARCPolicy) {
		case "reject":
			out.Score++
			out.Observations = append(out.Observations, "DMARC policy is reject (strongest enforcement).")
		case "quarantine":
			out.Observations = append(out.Observations, "DMARC policy is quarantine (moderate enforcement).")
		case "none":
			out.Observations = append(out.Observations, "DMARC policy is none (monitor-only).")
		default:
			out.Observations = append(out.Observations, "DMARC policy missing or non-standard.")
		}
	} else {
		out.Observations = append(out.Observations, "No DMARC record found.")
	}

	if out.DKIMFound {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No DKIM record found for selector 'default'.")
	}

	writeJSON(w, out)
}

func extractDMARCPolicy(record string) string {
	parts := strings.Split(record, ";")
	for _, part := range parts {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		if strings.ToLower(strings.TrimSpace(kv[0])) == "p" {
			return strings.TrimSpace(kv[1])
		}
	}
	return ""
}