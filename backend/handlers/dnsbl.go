package handlers

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
)

// dnsblLists maps list name -> DNSBL zone
var dnsblLists = []struct {
	Name string
	Zone string
}{
	{"Spamhaus ZEN", "zen.spamhaus.org"},
	{"Spamhaus DBL", "dbl.spamhaus.org"},
	{"Barracuda", "b.barracudacentral.org"},
	{"SORBS SPAM", "spam.sorbs.net"},
	{"SORBS HTTP", "http.sorbs.net"},
	{"SpamCop", "bl.spamcop.net"},
	{"UCEPROTECT L1", "dnsbl-1.uceprotect.net"},
	{"invaluement ivmSIP", "sip.invaluement.com"},
	{"NordSpam", "bl.nordspam.com"},
	{"RATS-Dyna", "dyna.spamrats.com"},
}

type DNSBLEntry struct {
	Name    string `json:"name"`
	Zone    string `json:"zone"`
	Listed  bool   `json:"listed"`
	Details string `json:"details,omitempty"`
}

type DNSBLResult struct {
	IP      string       `json:"ip"`
	Listed  int          `json:"listed_count"`
	Checked int          `json:"checked_count"`
	Entries []DNSBLEntry `json:"entries"`
	Error   string       `json:"error,omitempty"`
}

// reverseIP reverses an IPv4 address for DNSBL lookups (e.g. 1.2.3.4 -> 4.3.2.1)
func reverseIP(ip string) (string, error) {
	parts := strings.Split(ip, ".")
	if len(parts) != 4 {
		return "", fmt.Errorf("not an IPv4 address")
	}
	return parts[3] + "." + parts[2] + "." + parts[1] + "." + parts[0], nil
}

func DNSBL(w http.ResponseWriter, r *http.Request) {
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

	ip4 := parsed.To4()
	if ip4 == nil {
		writeError(w, "only IPv4 addresses are supported for DNSBL lookups", http.StatusBadRequest)
		return
	}

	revIP, err := reverseIP(ip4.String())
	if err != nil {
		writeError(w, "failed to reverse IP", http.StatusBadRequest)
		return
	}

	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		entries []DNSBLEntry
		listed  int
	)

	for _, list := range dnsblLists {
		wg.Add(1)
		go func(name, zone string) {
			defer wg.Done()
			query := revIP + "." + zone
			addrs, err := net.LookupHost(query)
			entry := DNSBLEntry{Name: name, Zone: zone}
			if err == nil && len(addrs) > 0 {
				entry.Listed = true
				entry.Details = strings.Join(addrs, ", ")
			}
			mu.Lock()
			entries = append(entries, entry)
			if entry.Listed {
				listed++
			}
			mu.Unlock()
		}(list.Name, list.Zone)
	}

	wg.Wait()

	result := DNSBLResult{
		IP:      ip,
		Listed:  listed,
		Checked: len(entries),
		Entries: entries,
	}

	writeJSON(w, result)
}
