# mstrhakr tools

A collection of developer and networking tools with a static frontend plus a Go API backend for network operations that browsers cannot safely do directly.

**Live frontend:** [tools.mstrhakr.com](https://tools.mstrhakr.com)

## Architecture

- Frontend: static HTML/CSS/JavaScript (no build step), hosted on GitHub Pages
- Backend: Go API in `backend/`, container image `ghcr.io/mstrhakr/tools-api:latest`
- Live API base URL used by network tools: `https://api.tools.mstrhakr.com`

The backend currently exposes:

- `GET /health`
- `GET /api/ping`
- `GET /api/ssl`
- `GET /api/headers`
- `GET /api/rdap`
- `GET /api/portscan`
- `GET /api/geoip`
- `GET /api/reversedns`
- `GET /api/whois`
- `GET /api/dnsbl`
- `GET /api/traceroute`

## API-backed Tools

These frontend tools call the Go backend:

- Ping
- SSL Cert Checker
- HTTP Headers Inspector
- Port Scanner
- GeoIP Lookup
- Reverse DNS Lookup
- WHOIS Lookup
- Traceroute
- DNSBL Check
- IP Address Info

All other tools run client-side in the browser.

## Local Development

### Frontend only

```bash
python3 -m http.server 8000
# or
npx serve .
```

### Backend only

Run from `backend/`:

```bash
go run .
```

Backend listens on `:8080` by default (`PORT` env var supported).

### Backend with Docker

Run from `backend/`:

```bash
docker compose up -d
```

This starts `tools-api` bound to `127.0.0.1:8080`.

### Full local stack

1. Start backend (`go run .` or `docker compose up -d` in `backend/`)
2. Serve frontend from repo root (`python3 -m http.server 8000`)
3. Open `http://localhost:8000`

Note: API-backed tool scripts currently point to the production API hostname. For local end-to-end testing, update those tool scripts to use your local API origin.

## Adding a New Tool

1. Create `tools/my-tool.html` using an existing page as a template
2. Create `js/my-tool.js` with tool logic
3. Add the tool to the `TOOLS` catalog in `js/common.js` (navigation/search)
4. Ensure the tool appears on `index.html` if needed
5. If server-side networking is required, add a backend handler and route in `backend/main.go`

## Deployment

- Frontend: GitHub Pages with custom domain (`tools.mstrhakr.com`)
- Backend: containerized Go API image (`ghcr.io/mstrhakr/tools-api:latest`), deployed separately
