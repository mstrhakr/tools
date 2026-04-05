package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/mstrhakr/tools/backend/handlers"
)

// --- CORS allowed origins ---
// Accepts exact matches for mstrhakr.com and its subdomains, plus localhost.
// Uses proper URL parsing to prevent substring-bypass attacks such as
// https://evil.mstrhakr.com.attacker.com which would fool strings.Contains.
func isAllowedOrigin(origin string) bool {
	if origin == "" {
		return false
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	h := strings.ToLower(u.Hostname())
	return h == "mstrhakr.com" || strings.HasSuffix(h, ".mstrhakr.com") ||
		h == "localhost" || h == "127.0.0.1"
}

// --- Rate limiter ---
type rateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	go func() {
		ticker := time.NewTicker(window)
		for range ticker.C {
			rl.mu.Lock()
			cutoff := time.Now().Add(-window)
			for ip, times := range rl.requests {
				var valid []time.Time
				for _, t := range times {
					if t.After(cutoff) {
						valid = append(valid, t)
					}
				}
				if len(valid) == 0 {
					delete(rl.requests, ip)
				} else {
					rl.requests[ip] = valid
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-rl.window)
	var valid []time.Time
	for _, t := range rl.requests[ip] {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	if len(valid) >= rl.limit {
		rl.requests[ip] = valid
		return false
	}
	rl.requests[ip] = append(valid, now)
	return true
}

// --- Middleware ---
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if isAllowedOrigin(origin) {
			// Reflect the specific origin so credentials can work if ever needed
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		// Unknown origins get no CORS header — the browser will block the request.
		// A wildcard fallback would let any site make cross-origin requests on
		// behalf of a victim's browser (port-scan the victim's IP, etc.).
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		// Security headers applied to every response
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func rateLimitMiddleware(rl *rateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}
			// Only trust X-Forwarded-For when the TCP connection comes from a
			// loopback address (i.e. a trusted local reverse proxy). External
			// clients could otherwise spoof arbitrary IPs to bypass rate limiting.
			if parsed := net.ParseIP(ip); parsed != nil && parsed.IsLoopback() {
				if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
					ip = strings.TrimSpace(strings.SplitN(forwarded, ",", 2)[0])
				}
			}
			if !rl.allow(ip) {
				writeError(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Rate limiters: generous for most, strict for heavy ops
	defaultRL := newRateLimiter(60, time.Minute)
	heavyRL := newRateLimiter(20, time.Minute)

	mux := http.NewServeMux()

	// Health check (rate-limited to prevent DoS amplification)
	mux.Handle("GET /health", chain(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		}),
		rateLimitMiddleware(defaultRL),
	))

	// API routes
	mux.Handle("GET /api/ping", chain(
		http.HandlerFunc(handlers.Ping),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/ssl", chain(
		http.HandlerFunc(handlers.SSL),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/headers", chain(
		http.HandlerFunc(handlers.Headers),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/rdap", chain(
		http.HandlerFunc(handlers.RDAP),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/portscan", chain(
		http.HandlerFunc(handlers.PortScan),
		rateLimitMiddleware(heavyRL),
	))
	mux.Handle("GET /api/geoip", chain(
		http.HandlerFunc(handlers.GeoIP),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/reversedns", chain(
		http.HandlerFunc(handlers.ReverseDNS),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/whois", chain(
		http.HandlerFunc(handlers.WHOIS),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/dnsbl", chain(
		http.HandlerFunc(handlers.DNSBL),
		rateLimitMiddleware(heavyRL),
	))
	mux.Handle("GET /api/traceroute", chain(
		http.HandlerFunc(handlers.Traceroute),
		rateLimitMiddleware(heavyRL),
	))
	mux.Handle("GET /api/dnsinspect", chain(
		http.HandlerFunc(handlers.DNSInspect),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/asn", chain(
		http.HandlerFunc(handlers.ASNLookup),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/dnsprop", chain(
		http.HandlerFunc(handlers.DNSPropagation),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/redirects", chain(
		http.HandlerFunc(handlers.Redirects),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/httpsecurity", chain(
		http.HandlerFunc(handlers.HTTPSecurity),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/siteaudit", chain(
		http.HandlerFunc(handlers.SiteAudit),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/crawlcheck", chain(
		http.HandlerFunc(handlers.CrawlCheck),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/emailaudit", chain(
		http.HandlerFunc(handlers.EmailAudit),
		rateLimitMiddleware(defaultRL),
	))
	mux.Handle("GET /api/mtasts", chain(
		http.HandlerFunc(handlers.MTASTS),
		rateLimitMiddleware(defaultRL),
	))

	handler := corsMiddleware(mux)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
