package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
)

type CAARecord struct {
	Raw string `json:"raw"`
	TTL int    `json:"ttl"`
}

type CAAResult struct {
	Domain       string      `json:"domain"`
	RecordFound  bool        `json:"record_found"`
	Records      []CAARecord `json:"records,omitempty"`
	IssueTags    []string    `json:"issue_tags,omitempty"`
	IssueWild    []string    `json:"issuewild_tags,omitempty"`
	IodefTargets []string    `json:"iodef_targets,omitempty"`
	Score        int         `json:"score"`
	MaxScore     int         `json:"max_score"`
	Observations []string    `json:"observations"`
	Error        string      `json:"error,omitempty"`
}

func CAA(w http.ResponseWriter, r *http.Request) {
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

	out := CAAResult{Domain: domain, MaxScore: 3}
	resp, err := dohLookup(domain, 257)
	if err != nil {
		out.Error = "CAA lookup failed"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
		return
	}

	for _, ans := range resp.Answer {
		raw := strings.TrimSpace(ans.Data)
		if raw == "" {
			continue
		}
		out.RecordFound = true
		out.Records = append(out.Records, CAARecord{Raw: raw, TTL: ans.TTL})

		tag, value := parseCAAData(raw)
		switch tag {
		case "issue":
			out.IssueTags = append(out.IssueTags, value)
		case "issuewild":
			out.IssueWild = append(out.IssueWild, value)
		case "iodef":
			out.IodefTargets = append(out.IodefTargets, value)
		}
	}

	if out.RecordFound {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No CAA records found.")
	}

	if len(out.IssueTags) > 0 || len(out.IssueWild) > 0 {
		out.Score++
	} else if out.RecordFound {
		out.Observations = append(out.Observations, "CAA exists but no issue/issuewild authorization tags found.")
	}

	if len(out.IodefTargets) > 0 {
		out.Score++
	} else {
		out.Observations = append(out.Observations, "No iodef reporting URI set for CAA incident reporting.")
	}

	if out.RecordFound && len(out.IssueTags) == 0 {
		out.Observations = append(out.Observations, "Empty issue policy may block certificate issuance depending on record semantics.")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func parseCAAData(raw string) (tag string, value string) {
	// Typical format from DoH JSON: 0 issue "letsencrypt.org"
	parts := strings.Fields(raw)
	if len(parts) < 3 {
		return "", ""
	}
	tag = strings.ToLower(strings.TrimSpace(parts[1]))
	value = strings.Trim(strings.Join(parts[2:], " "), "\"")
	return tag, value
}