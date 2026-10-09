# mstrhakr tools

A collection of developer and networking tools with a static frontend plus a Go API backend for network operations that browsers cannot safely do directly.

**Live frontend:** [tools.mstrhakr.com](https://tools.mstrhakr.com)

## Architecture

- Frontend: static HTML/CSS/JavaScript, hosted on GitHub Pages; a dependency-free Node script generates the flat tool catalog from category HTML files
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

From the repo root, use Node.js 24 (matching CI) to generate the catalog before
starting the static server:

```bash
node scripts/generate-tools-manifest.js
python3 -m http.server 8000
# or
npx serve .
```

Regenerate after adding, removing, or changing tool metadata. The generated
`tools-manifest.json` is local/deployment output, not a hand-maintained catalog;
do not commit it. No npm install is required. The browser fetches the latest
catalog on each page load, using a cached copy only if the fetch fails. If
neither is available, the homepage shows an error instead of loading forever.

Run catalog and shared-helper regression tests with:

```bash
node --test tests/catalog.test.js
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
2. Generate the catalog from repo root (`node scripts/generate-tools-manifest.js`)
3. Serve frontend from repo root (`python3 -m http.server 8000`)
4. Open `http://localhost:8000`

Note: API-backed tool scripts currently point to the production API hostname. For local end-to-end testing, update those tool scripts to use your local API origin.

## Adding a New Tool

1. Create `tools/<category>/my-tool.html` using an existing page as a template. Categories: `converter`, `encoding`, `text`, `math`, `generator`, `network`, `security`, `dev`
2. Create `js/my-tool.js` with tool logic
3. Set the page `<title>` to `My Tool - mstrhakr tools` and put its description in the first `<p>` inside `.tool-header`. Use real category paths for links
4. Regenerate the catalog and run the tests above. Navigation, homepage cards, and search discover the tool automatically; no catalog entries or homepage cards need to be edited
5. If server-side networking is required, add a backend handler and route in `backend/main.go`

## Deployment

- Frontend: GitHub Pages with custom domain (`tools.mstrhakr.com`). The Pages workflow tests and generates the manifest before uploading the deployment artifact; it never commits generated files or pushes to the repository. Frontend, generator, test, and Pages workflow changes trigger deployment
- Backend: containerized Go API image (`ghcr.io/mstrhakr/tools-api:latest`), deployed separately
