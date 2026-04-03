# mstrhakr tools

A collection of useful developer and networking tools in one place. No frameworks, no build step -- just plain HTML, CSS, and JavaScript with a Solarized color theme.

**Live site:** [tools.mstrhakr.com](https://tools.mstrhakr.com)

## Tools

### Converters
- **Data Size Converter** -- bits, bytes, KB, MB, GB, TB, network units, binary vs decimal
- **Download Time Calculator** -- estimate download time from file size and connection speed
- **Unix Timestamp Converter** -- convert between Unix timestamps and human-readable dates
- **Color Picker** -- pick colors and convert between Hex, RGB, and HSL

### Text & Encoding
- **Base64 Encode / Decode** -- encode and decode Base64 with UTF-8 support
- **URL Encode / Decode** -- encode and decode URL components
- **JSON Formatter** -- format, minify, and validate JSON with syntax highlighting
- **Text Counter** -- count characters, words, sentences, paragraphs, and reading time

### Math
- **Calculator** -- basic calculator with keyboard support
- **Percentage Calculator** -- X% of Y, X is what % of Y, percentage change

### Generators
- **Password Generator** -- secure random passwords with configurable options and strength meter
- **UUID Generator** -- generate v4 UUIDs individually or in bulk

### Network
- **Subnet Calculator** -- calculate network, broadcast, host range from IP/CIDR
- **IP Address Info** -- look up your public IP and geolocation
- **MAC Address Lookup** -- identify manufacturer from MAC address OUI

## Development

This is a static site with no build step. Open `index.html` in a browser or serve locally:

```bash
python3 -m http.server 8000
# or
npx serve .
```

## Adding a New Tool

1. Create `tools/my-tool.html` using any existing tool page as a template
2. Create `js/my-tool.js` with the tool logic
3. Add a card to `index.html` in the tool grid
4. Commit and push -- GitHub Pages deploys automatically

## Deployment

Hosted on GitHub Pages with a custom domain. DNS: CNAME `tools` -> `mstrhakr.github.io`