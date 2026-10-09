'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { CATEGORY_ORDER, decodeEntities, parseToolHtml, buildManifest } = require('../scripts/generate-tools-manifest');

const ROOT = path.resolve(__dirname, '..');
const COMMON = fs.readFileSync(path.join(ROOT, 'js/common.js'), 'utf8');
const CACHE_KEY = 'mtools:catalog:v3';
const sampleTool = (slug, category = 'dev') => ({
  category, name: slug, url: '/tools/' + category + '/' + slug + '.html',
  tags: slug, description: slug + ' description'
});

test('extracts decoded title, first header paragraph, tags and category path', () => {
  const tool = parseToolHtml(`
    <!-- <title>Wrong title</title> -->
    <title> A &amp; B &#x2194; C - mstrhakr tools </title>
    <p>Not the tool description</p>
    <div class="tool-header-extra"><p>Also wrong</p></div>
    <div class='extra tool-header' id='header'>
      <h1>Heading</h1><p class='lead'>Use <strong>A &amp; B</strong><br>
      &lt;value&gt; &#39;quoted&#39;&nbsp;&mdash; &#128640;</p>
      <p>Ignore related-tool links</p>
    </div>`, 'encoding', 'a-b');
  assert.deepEqual(tool, {
    category: 'encoding', name: 'A & B ↔ C', url: '/tools/encoding/a-b.html',
    tags: 'a-b encoding a & b ↔ c', description: "Use A & B <value> 'quoted' — 🚀"
  });
});

test('decodes named and numeric entities once, preserving escaped markup', () => {
  assert.equal(decodeEntities('&quot;&apos;&lt;&gt;&amp;&copy;&times;&#8322;&#x1F680;'), '"\'<>&©×₂🚀');
  assert.equal(decodeEntities('&amp;lt; &unknown; &#x110000; &#55296;'), '&lt; &unknown; � �');
});

test('missing metadata falls back to slug without taking unrelated paragraphs', () => {
  assert.equal(parseToolHtml('<p>Outside header</p>', 'dev', 'some-tool').name, 'Some Tool');
  assert.equal(parseToolHtml('<div class=tool-header><h1>Only heading</h1></div><p>Outside</p>', 'dev', 'some-tool').description, '');
  assert.equal(parseToolHtml('<div class=tool-header><p>Unquoted class</p></div>', 'dev', 'some-tool').description, 'Unquoted class');
});

test('real catalog covers every category HTML file exactly once, with flat metadata', () => {
  const manifest = buildManifest();
  assert.deepEqual(Object.keys(manifest), ['tools']);
  const expected = fs.readdirSync(path.join(ROOT, 'tools'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(category => fs.readdirSync(path.join(ROOT, 'tools', category.name))
      .filter(file => file.endsWith('.html'))
      .map(file => '/tools/' + category.name + '/' + file));
  assert.deepEqual(manifest.tools.map(tool => tool.url).sort(), expected.sort());
  assert.equal(new Set(manifest.tools.map(tool => tool.url)).size, expected.length);
  let previousRank = -1;
  manifest.tools.forEach((tool, index) => {
    assert.ok(fs.statSync(path.join(ROOT, tool.url.slice(1))).isFile(), tool.url);
    assert.ok(tool.name && tool.description && tool.tags, tool.url);
    assert.ok(!tool.name.includes('mstrhakr tools'), tool.url);
    assert.ok(!/&(?:amp|lt|gt|quot|nbsp|mdash|#\d+|#x[0-9a-f]+);/i.test(tool.description), tool.url);
    assert.equal('subcategory' in tool, false);
    const rank = CATEGORY_ORDER.indexOf(tool.category);
    assert.ok(rank >= previousRank, tool.url);
    if (index && rank === previousRank) {
      assert.ok(manifest.tools[index - 1].name.localeCompare(tool.name, 'en') <= 0, tool.url);
    }
    previousRank = rank;
  });
  assert.ok(manifest.tools.some(tool => tool.url === '/tools/dev/regex-generator.html'));
  assert.ok(manifest.tools.some(tool => tool.url === '/tools/dev/regex-tester.html'));
});

test('generator CLI is deterministic and locates tools independently of cwd', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-catalog-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'manifest.json');
  const args = [path.join(ROOT, 'scripts/generate-tools-manifest.js'), output];
  execFileSync(process.execPath, args, { cwd: directory });
  const first = fs.readFileSync(output, 'utf8');
  assert.deepEqual(JSON.parse(first), buildManifest());
  execFileSync(process.execPath, args, { cwd: directory });
  assert.equal(fs.readFileSync(output, 'utf8'), first);
  assert.ok(first.endsWith('\n'));
});

// Minimal DOM harness: exercise shared browser code without third-party dependencies.
function element(tag) {
  const attributes = {};
  const classes = new Set();
  return {
    tag, children: [], events: {}, textContent: '',
    set innerHTML(value) { this.children = []; },
    setAttribute(name, value) { attributes[name] = value; },
    getAttribute(name) { return attributes[name]; },
    appendChild(child) {
      if (child.tag === 'fragment') this.children.push(...child.children);
      else this.children.push(child);
    },
    addEventListener(name, callback) { this.events[name] = callback; },
    querySelectorAll() { return []; },
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name) {
        if (classes.has(name)) { classes.delete(name); return false; }
        classes.add(name); return true;
      }
    }
  };
}

function browser({ fetch, cached, storageThrows = false } = {}) {
  const grid = element('div');
  const nav = element('ul');
  const theme = element('button');
  const documentElement = element('html');
  const documentEvents = {};
  const mediaEvents = {};
  const storage = new Map(cached ? [[CACHE_KEY, JSON.stringify(cached)]] : []);
  const window = {
    location: { pathname: '/' }, addEventListener() {},
    matchMedia(query) {
      return { matches: false, addEventListener(name, callback) { mediaEvents[query] = callback; } };
    }
  };
  const document = {
    documentElement, head: element('head'), body: element('body'),
    createElement: element, createDocumentFragment: () => element('fragment'),
    createTextNode: text => ({ tag: 'text', textContent: text }),
    querySelector: selector => ({ '.tool-grid': grid, '.nav-links': nav, '.theme-toggle': theme })[selector] || null,
    querySelectorAll: () => [], getElementById: () => null,
    addEventListener(name, callback) { documentEvents[name] = callback; }
  };
  const localStorage = {
    getItem(key) {
      if (storageThrows) throw new Error('Storage blocked');
      return storage.get(key) || null;
    },
    setItem(key, value) {
      if (storageThrows) throw new Error('Storage blocked');
      storage.set(key, value);
    }
  };
  vm.runInNewContext(COMMON, { window, document, localStorage, fetch, setTimeout, clearTimeout });
  return {
    window, grid, nav, theme, documentElement, storage, mediaEvents,
    async start() {
      documentEvents.DOMContentLoaded();
      await new Promise(setImmediate);
    }
  };
}

test('fresh fetch wins over valid cached tools and refreshes flat nav and cache', async () => {
  const fresh = [sampleTool('new-tool')];
  let requests = 0;
  const page = browser({
    cached: { updatedAt: Date.now(), tools: [sampleTool('old-tool')] },
    fetch: async (url, options) => {
      requests++;
      assert.equal(url, '/tools-manifest.json');
      assert.equal(options.cache, 'no-store');
      return { ok: true, json: async () => ({ tools: fresh }) };
    }
  });
  await page.start();
  assert.equal(requests, 1);
  assert.equal(page.grid.children[0].href, fresh[0].url);
  assert.deepEqual(JSON.parse(page.storage.get(CACHE_KEY)).tools, fresh);
  const dropdown = page.nav.children.find(child => child.className === 'nav-has-dropdown');
  assert.equal(dropdown.children[1].children[0].children[0].href, fresh[0].url);
});

test('failed fetch uses valid cached tools', async () => {
  const page = browser({
    cached: { updatedAt: Date.now(), tools: [sampleTool('cached-tool')] },
    fetch: async () => { throw new Error('Offline'); }
  });
  await page.start();
  assert.equal(page.grid.children[0].href, '/tools/dev/cached-tool.html');
});

test('network, HTTP, JSON and manifest failures without usable cache show homepage error', async t => {
  for (const [name, fetch] of [
    ['network', async () => { throw new Error('Offline'); }],
    ['HTTP', async () => ({ ok: false })],
    ['JSON', async () => ({ ok: true, json: async () => { throw new Error('Invalid JSON'); } })],
    ['format', async () => ({ ok: true, json: async () => ({ tools: null }) })],
    ['empty', async () => ({ ok: true, json: async () => ({ tools: [] }) })]
  ]) {
    await t.test(name, async () => {
      const page = browser({ fetch, cached: { updatedAt: Date.now() - 13 * 60 * 60 * 1000, tools: [sampleTool('expired')] } });
      await page.start();
      assert.equal(page.grid.children[0].getAttribute('role'), 'status');
      assert.match(page.grid.children[0].textContent, /Unable to load tools/);
      assert.equal(page.grid.children[0].className, undefined); // Search cannot hide this message.
    });
  }
});

test('blocked localStorage does not prevent catalog rendering or theme switching', async () => {
  const page = browser({ storageThrows: true, fetch: async () => ({ ok: true, json: async () => ({ tools: [sampleTool('fresh')] }) }) });
  await page.start();
  assert.equal(page.grid.children[0].href, '/tools/dev/fresh.html');
  assert.equal(page.documentElement.getAttribute('data-theme'), 'dark');
  page.theme.events.click();
  assert.equal(page.documentElement.getAttribute('data-theme'), 'light');
  page.mediaEvents['(prefers-color-scheme: dark)']({ matches: true });
  assert.equal(page.documentElement.getAttribute('data-theme'), 'dark');
});

test('apiFetch export retains backend URL, envelope unwrapping and error behavior', async t => {
  const cases = [
    ['envelope', true, 'application/json', { ok: true, data: { answer: 42 } }, { answer: 42 }],
    ['legacy JSON', true, 'application/json', { answer: 42 }, { answer: 42 }],
    ['false data', true, 'application/json', { ok: true, data: false }, false],
    ['API error', true, 'application/json', { ok: false, error: 'Denied' }, /Denied/],
    ['HTTP JSON error', false, 'application/json', { ok: true }, /HTTP 502/],
    ['proxy error', false, 'text/html', 'Bad gateway', /Bad gateway/],
    ['empty proxy error', false, '', '', /HTTP 502/]
  ];
  for (const [name, ok, type, body, expected] of cases) {
    await t.test(name, async () => {
      const page = browser({ fetch: async url => {
        assert.equal(url, 'https://api.tools.mstrhakr.com/api/ping?host=example.com');
        return { ok, status: 502, headers: { get: () => type }, json: async () => body, text: async () => body };
      } });
      assert.equal(typeof page.window.mtools.apiFetch, 'function');
      const result = page.window.mtools.apiFetch('/api/ping?host=example.com');
      if (expected instanceof RegExp) await assert.rejects(result, expected);
      else assert.deepEqual(await result, expected);
    });
  }
  const page = browser({ fetch: async () => { throw new Error('Network failed'); } });
  await assert.rejects(page.window.mtools.apiFetch('/api/ping'), /Network failed/);
});

test('allowed HTML fallback and related-tool links resolve without catalog JS', () => {
  for (const file of ['index.html', 'tools/dev/regex-generator.html', 'tools/dev/regex-tester.html']) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const match of html.matchAll(/href=["'](\/tools\/[^"']+)["']/g)) {
      const url = match[1].split(/[?#]/)[0];
      assert.match(url, /^\/tools\/[^/]+\/[^/]+\.html$/);
      assert.ok(fs.existsSync(path.join(ROOT, url.slice(1))), file + ': ' + url);
    }
  }
});