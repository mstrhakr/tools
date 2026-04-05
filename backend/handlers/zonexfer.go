package handlers

import (
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

type ZoneTransferNSResult struct {
	NameServer   string `json:"name_server"`
	IP           string `json:"ip,omitempty"`
	ReachableTCP bool   `json:"reachable_tcp_53"`
	AXFRAllowed  bool   `json:"axfr_allowed"`
	Rcode        int    `json:"rcode"`
	Error        string `json:"error,omitempty"`
}

type ZoneTransferResult struct {
	Domain       string                 `json:"domain"`
	NameServers  []ZoneTransferNSResult `json:"name_servers"`
	AnyAllowed   bool                   `json:"any_axfr_allowed"`
	Score        int                    `json:"score"`
	MaxScore     int                    `json:"max_score"`
	Observations []string               `json:"observations"`
	Error        string                 `json:"error,omitempty"`
}

func ZoneTransferProbe(w http.ResponseWriter, r *http.Request) {
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

	result := ZoneTransferResult{Domain: domain, MaxScore: 2}

	nsRecords, err := net.LookupNS(domain)
	if err != nil || len(nsRecords) == 0 {
		result.Error = "failed to resolve NS records"
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
		return
	}

	for _, ns := range nsRecords {
		nsHost := strings.TrimSuffix(ns.Host, ".")
		entry := ZoneTransferNSResult{NameServer: nsHost}

		pinnedIP, ipErr := validateAndResolve(nsHost)
		if ipErr != nil {
			entry.Error = "resolver blocked or failed"
			result.NameServers = append(result.NameServers, entry)
			continue
		}
		entry.IP = pinnedIP.String()

		rcode, axfrAllowed, probeErr := probeAXFR(pinnedIP, domain)
		if probeErr != nil {
			entry.Error = probeErr.Error()
			entry.ReachableTCP = false
		} else {
			entry.ReachableTCP = true
			entry.Rcode = rcode
			entry.AXFRAllowed = axfrAllowed
			if axfrAllowed {
				result.AnyAllowed = true
			}
		}

		result.NameServers = append(result.NameServers, entry)
	}

	if len(result.NameServers) > 0 {
		result.Score++
	}
	if !result.AnyAllowed {
		result.Score++
		result.Observations = append(result.Observations, "No nameserver appeared to allow unauthenticated AXFR.")
	} else {
		result.Observations = append(result.Observations, "At least one nameserver appears to allow AXFR; investigate immediately.")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func probeAXFR(ip net.IP, domain string) (rcode int, allowed bool, err error) {
	addr := net.JoinHostPort(ip.String(), "53")
	conn, dialErr := net.DialTimeout("tcp", addr, 6*time.Second)
	if dialErr != nil {
		return 0, false, dialErr
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(8 * time.Second))

	msg, id := buildAXFRQuery(domain)
	frame := make([]byte, 2+len(msg))
	binary.BigEndian.PutUint16(frame[:2], uint16(len(msg)))
	copy(frame[2:], msg)

	if _, writeErr := conn.Write(frame); writeErr != nil {
		return 0, false, writeErr
	}

	lenBuf := make([]byte, 2)
	if _, readErr := io.ReadFull(conn, lenBuf); readErr != nil {
		return 0, false, readErr
	}
	n := int(binary.BigEndian.Uint16(lenBuf))
	if n < 12 {
		return 0, false, errShortDNSResponse
	}

	resp := make([]byte, n)
	if _, readErr := io.ReadFull(conn, resp); readErr != nil {
		return 0, false, readErr
	}

	respID := binary.BigEndian.Uint16(resp[0:2])
	if respID != id {
		return 0, false, errMismatchedDNSID
	}

	flags := binary.BigEndian.Uint16(resp[2:4])
	rcode = int(flags & 0x000F)
	ancount := int(binary.BigEndian.Uint16(resp[6:8]))

	// RCODE 0 + at least one answer strongly suggests AXFR not refused.
	if rcode == 0 && ancount > 0 {
		return rcode, true, nil
	}
	return rcode, false, nil
}

func buildAXFRQuery(domain string) ([]byte, uint16) {
	id := randomID()
	buf := make([]byte, 12)
	binary.BigEndian.PutUint16(buf[0:2], id)
	binary.BigEndian.PutUint16(buf[2:4], 0x0100) // standard query, RD=1
	binary.BigEndian.PutUint16(buf[4:6], 1)      // qdcount

	qname := encodeDNSName(domain)
	buf = append(buf, qname...)

	qtype := make([]byte, 2)
	binary.BigEndian.PutUint16(qtype, 252) // AXFR
	buf = append(buf, qtype...)

	qclass := make([]byte, 2)
	binary.BigEndian.PutUint16(qclass, 1) // IN
	buf = append(buf, qclass...)

	return buf, id
}

func encodeDNSName(name string) []byte {
	labels := strings.Split(strings.TrimSuffix(name, "."), ".")
	out := make([]byte, 0, len(name)+2)
	for _, label := range labels {
		if label == "" {
			continue
		}
		out = append(out, byte(len(label)))
		out = append(out, []byte(label)...)
	}
	out = append(out, 0)
	return out
}

func randomID() uint16 {
	var b [2]byte
	if _, err := rand.Read(b[:]); err != nil {
		return uint16(time.Now().UnixNano() & 0xffff)
	}
	return binary.BigEndian.Uint16(b[:])
}

var errShortDNSResponse = &zoneXferError{msg: "short DNS response"}
var errMismatchedDNSID = &zoneXferError{msg: "mismatched DNS response ID"}

type zoneXferError struct{ msg string }

func (e *zoneXferError) Error() string { return e.msg }