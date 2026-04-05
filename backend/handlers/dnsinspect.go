package handlers

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type DNSInspectResult struct {
	Domain string   `json:"domain"`
	A      []string `json:"a"`
	AAAA   []string `json:"aaaa"`
	CNAME  string   `json:"cname,omitempty"`
	NS     []string `json:"ns"`
	MX     []string `json:"mx"`
	TXT    []string `json:"txt"`
	Errors []string `json:"errors,omitempty"`
}

func DNSInspect(w http.ResponseWriter, r *http.Request) {
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

	resolver := net.Resolver{}
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	out := DNSInspectResult{Domain: domain}

	if hosts, err := resolver.LookupHost(ctx, domain); err == nil {
		for _, host := range hosts {
			ip := net.ParseIP(host)
			if ip == nil {
				continue
			}
			if ip.To4() != nil {
				out.A = append(out.A, host)
			} else {
				out.AAAA = append(out.AAAA, host)
			}
		}
	} else {
		out.Errors = append(out.Errors, "A/AAAA lookup failed")
	}

	if cname, err := resolver.LookupCNAME(ctx, domain); err == nil {
		out.CNAME = strings.TrimSuffix(cname, ".")
	}

	if ns, err := resolver.LookupNS(ctx, domain); err == nil {
		for _, rec := range ns {
			out.NS = append(out.NS, strings.TrimSuffix(rec.Host, "."))
		}
	} else {
		out.Errors = append(out.Errors, "NS lookup failed")
	}

	if mx, err := resolver.LookupMX(ctx, domain); err == nil {
		for _, rec := range mx {
			out.MX = append(out.MX, strings.TrimSpace(strings.TrimSuffix(rec.Host, "."))+" (priority "+itoa(rec.Pref)+")")
		}
	} else {
		out.Errors = append(out.Errors, "MX lookup failed")
	}

	if txt, err := resolver.LookupTXT(ctx, domain); err == nil {
		for _, rec := range txt {
			trimmed := strings.TrimSpace(rec)
			if trimmed != "" {
				out.TXT = append(out.TXT, trimmed)
			}
		}
	} else {
		out.Errors = append(out.Errors, "TXT lookup failed")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func itoa(v uint16) string {
	return strconv.Itoa(int(v))
}