package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

type dnsProvider struct {
	Name string
	URL  string
}

type dnsAnswer struct {
	Data string `json:"data"`
}

type dnsJSONResponse struct {
	Status int         `json:"Status"`
	Answer []dnsAnswer `json:"Answer"`
}

type DNSPropagationItem struct {
	Resolver string   `json:"resolver"`
	Status   int      `json:"status"`
	Records  []string `json:"records"`
	Error    string   `json:"error,omitempty"`
}

type DNSPropagationResult struct {
	Domain    string               `json:"domain"`
	Type      string               `json:"type"`
	Resolvers []DNSPropagationItem `json:"resolvers"`
}

var dohProviders = []dnsProvider{
	{Name: "Cloudflare", URL: "https://cloudflare-dns.com/dns-query"},
	{Name: "Google", URL: "https://dns.google/resolve"},
	{Name: "Quad9", URL: "https://dns.quad9.net/dns-query"},
}

var dnsTypeMap = map[string]int{
	"A": 1, "AAAA": 28, "CNAME": 5, "MX": 15, "NS": 2, "TXT": 16,
}

func DNSPropagation(w http.ResponseWriter, r *http.Request) {
	domain := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("domain")))
	typeName := strings.TrimSpace(strings.ToUpper(r.URL.Query().Get("type")))
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
	if typeName == "" {
		typeName = "A"
	}
	typeCode, ok := dnsTypeMap[typeName]
	if !ok {
		writeError(w, "unsupported record type", http.StatusBadRequest)
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	results := make([]DNSPropagationItem, len(dohProviders))
	var wg sync.WaitGroup

	for i, p := range dohProviders {
		wg.Add(1)
		go func(idx int, provider dnsProvider) {
			defer wg.Done()

			queryURL := provider.URL + "?name=" + url.QueryEscape(domain) + "&type=" + strconv.Itoa(typeCode)
			req, err := http.NewRequest(http.MethodGet, queryURL, nil)
			if err != nil {
				results[idx] = DNSPropagationItem{Resolver: provider.Name, Error: "request build failed"}
				return
			}
			req.Header.Set("Accept", "application/dns-json")

			resp, err := client.Do(req)
			if err != nil {
				results[idx] = DNSPropagationItem{Resolver: provider.Name, Error: "request failed"}
				return
			}
			defer resp.Body.Close()

			body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
			if err != nil {
				results[idx] = DNSPropagationItem{Resolver: provider.Name, Error: "read failed"}
				return
			}

			var parsed dnsJSONResponse
			if err := json.Unmarshal(body, &parsed); err != nil {
				results[idx] = DNSPropagationItem{Resolver: provider.Name, Error: "invalid response"}
				return
			}

			item := DNSPropagationItem{Resolver: provider.Name, Status: parsed.Status}
			for _, ans := range parsed.Answer {
				if ans.Data != "" {
					item.Records = append(item.Records, ans.Data)
				}
			}
			results[idx] = item
		}(i, p)
	}

	wg.Wait()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(DNSPropagationResult{
		Domain:    domain,
		Type:      typeName,
		Resolvers: results,
	})
}