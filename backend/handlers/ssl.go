package handlers

import (
	"crypto/tls"
	"net"
	"net/http"
	"strings"
	"time"
)

type CertInfo struct {
	Subject      string   `json:"subject"`
	Issuer       string   `json:"issuer"`
	SANs         []string `json:"sans"`
	NotBefore    string   `json:"not_before"`
	NotAfter     string   `json:"not_after"`
	DaysLeft     int      `json:"days_left"`
	Expired      bool     `json:"expired"`
	SerialHex    string   `json:"serial_hex"`
	SignatureAlg string   `json:"signature_alg"`
}

type SSLResult struct {
	Host        string     `json:"host"`
	TLSVersion  string     `json:"tls_version"`
	CipherSuite string     `json:"cipher_suite"`
	Certs       []CertInfo `json:"certs"`
	Error       string     `json:"error,omitempty"`
}

func SSL(w http.ResponseWriter, r *http.Request) {
	host := strings.TrimSpace(r.URL.Query().Get("host"))
	if host == "" {
		writeError(w, "host parameter required", http.StatusBadRequest)
		return
	}
	// Strip scheme if user pastes a URL
	host = strings.TrimPrefix(host, "https://")
	host = strings.TrimPrefix(host, "http://")
	host = strings.SplitN(host, "/", 2)[0]
	// Strip port — SSL check always uses 443; keeps host clean for TLS SNI.
	if h, _, e := net.SplitHostPort(host); e == nil {
		host = h
	}

	pinnedIP, err := validateAndResolve(host)
	if err != nil {
		writeError(w, err.Error(), http.StatusBadRequest)
		return
	}

	dialer := &net.Dialer{Timeout: 10 * time.Second}
	// Connect to the pinned IP to prevent DNS rebinding; host is used only for TLS SNI.
	conn, err := tls.DialWithDialer(dialer, "tcp", net.JoinHostPort(pinnedIP.String(), "443"), &tls.Config{
		ServerName: host,
	})
	if err != nil {
		writeError(w, "TLS connection failed", http.StatusBadGateway)
		return
	}
	defer conn.Close()

	state := conn.ConnectionState()
	result := SSLResult{
		Host:        host,
		TLSVersion:  tlsVersionName(state.Version),
		CipherSuite: tls.CipherSuiteName(state.CipherSuite),
	}

	now := time.Now()
	for _, cert := range state.PeerCertificates {
		daysLeft := int(cert.NotAfter.Sub(now).Hours() / 24)
		info := CertInfo{
			Subject:      cert.Subject.CommonName,
			Issuer:       cert.Issuer.CommonName,
			SANs:         cert.DNSNames,
			NotBefore:    cert.NotBefore.UTC().Format(time.RFC3339),
			NotAfter:     cert.NotAfter.UTC().Format(time.RFC3339),
			DaysLeft:     daysLeft,
			Expired:      now.After(cert.NotAfter),
			SerialHex:    cert.SerialNumber.Text(16),
			SignatureAlg: cert.SignatureAlgorithm.String(),
		}
		result.Certs = append(result.Certs, info)
	}

	writeJSON(w, result)
}

func tlsVersionName(v uint16) string {
	switch v {
	case tls.VersionTLS10:
		return "TLS 1.0"
	case tls.VersionTLS11:
		return "TLS 1.1"
	case tls.VersionTLS12:
		return "TLS 1.2"
	case tls.VersionTLS13:
		return "TLS 1.3"
	default:
		return "unknown"
	}
}
