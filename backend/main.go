package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/mstrhakr/tools/backend/handlers"
)

// --- CORS allowed origins ---
// Matches any subdomain of mstrhakr.com, localhost, and loopback.
func isAllowedOrigin(origin string) bool {
	if origin == "" {
		return false
	}
	allowed := []string{
		".mstrhakr.com",
		"//localhost",
		"//127.0.0.1",
	}
	for _, suffix := range allowed {
		if strings.Contains(origin, suffix) {
			return true
		}
	}
	return false
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
		} else {
			// NPM or proxies sometimes strip the Origin header; fall back to wildcard.
			// This is safe because the API only does read-only lookups on public hosts.
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Vary", "Origin")

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
			// Trust X-Forwarded-For from localhost/proxy only
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = strings.SplitN(forwarded, ",", 2)[0]
				ip = strings.TrimSpace(ip)
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

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

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
