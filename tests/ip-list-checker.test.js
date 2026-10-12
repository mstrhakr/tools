'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../js/ip-list-core');
const { toCSV } = require('../js/ip-list-checker');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'tools/network/ip-list-checker.html'), 'utf8');
const SOURCE = fs.readFileSync(path.join(ROOT, 'js/ip-list-checker.js'), 'utf8');

// Parse actual markup rather than inventing the UI's IDs or initial state.
function attributes(text) {
  const result = {};
  for (const match of text.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return result;
}

function element(tag, attrs = {}) {
  let text = '';
  return {
    tag, children: [], events: {}, value: '', files: [],
    hidden: 'hidden' in attrs, disabled: 'disabled' in attrs,
    checked: 'checked' in attrs, open: 'open' in attrs,
    get textContent() { return text + this.children.map(child => child.textContent).join(''); },
    set textContent(value) { text = String(value); this.children = []; },
    appendChild(child) {
      if (child.tag === 'fragment') {
        this.children.push(...child.children);
        child.children = [];
      } else this.children.push(child);
      return child;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      assert.notEqual(index, -1, 'removeChild requires an attached node');
      return this.children.splice(index, 1)[0];
    },
    addEventListener(name, callback) { (this.events[name] ||= []).push(callback); },
    dispatch(name) {
      for (const callback of this.events[name] || []) callback.call(this, { type: name, target: this });
    },
    click() { if (!this.disabled) this.dispatch('click'); }
  };
}

function browser() {
  const nodes = new Map();
  for (const match of HTML.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const attrs = attributes(match[2]);
    if (!attrs.id) continue;
    assert.ok(!nodes.has(attrs.id), 'duplicate HTML ID: ' + attrs.id);
    const node = element(match[1].toLowerCase(), attrs);
    if (node.tag === 'select') {
      const options = HTML.slice(match.index + match[0].length).split('</select>')[0];
      const option = options.match(/<option\b([^>]*)>/i);
      node.value = option ? attributes(option[1]).value || '' : '';
    }
    nodes.set(attrs.id, node);
  }
  const documentEvents = {};
  const copies = [];
  const readers = [];
  const downloads = [];
  const blobs = [];
  const revoked = [];
  const timers = [];
  class FileReader {
    constructor() { readers.push(this); this.aborted = false; }
    readAsText(file) { this.file = file; }
    succeed(text) { this.result = text; this.onload(); }
    fail() { this.onerror(); }
    abort() { this.aborted = true; if (this.onabort) this.onabort(); }
  }
  const document = {
    body: element('body'),
    getElementById(id) {
      assert.ok(nodes.has(id), 'JS requests missing HTML ID: ' + id);
      return nodes.get(id);
    },
    createElement(tag) {
      const node = element(tag);
      if (tag === 'a') node.addEventListener('click', () => {
        assert.ok(document.body.children.includes(node), 'download link must be attached');
        downloads.push({ href: node.href, filename: node.download });
      });
      return node;
    },
    createDocumentFragment: () => element('fragment'),
    createTextNode(text) { const node = element('text'); node.textContent = text; return node; },
    addEventListener(name, callback) { (documentEvents[name] ||= []).push(callback); }
  };
  const window = {
    IPListCore: core,
    mtools: { copyToClipboard(text, message) { copies.push({ text, message }); } }
  };
  vm.runInNewContext(SOURCE, {
    document, window, FileReader, Blob,
    URL: {
      createObjectURL(blob) { blobs.push(blob); return 'blob:local/' + blobs.length; },
      revokeObjectURL(url) { revoked.push(url); }
    },
    setTimeout(callback, delay) { timers.push({ callback, delay }); }
  }, { filename: 'ip-list-checker.js' });
  assert.equal(documentEvents.DOMContentLoaded.length, 1);
  documentEvents.DOMContentLoaded[0]();
  const el = id => document.getElementById('ip-' + id);
  return {
    el, copies, readers, downloads, blobs, revoked, timers, document,
    click(id) { el(id).click(); },
    edit(id, value) { el(id).value = value; el(id).dispatch('input'); },
    filter(value) { el('filter').value = value; el('filter').dispatch('change'); },
    skip(value) { el('skip-invalid').checked = value; el('skip-invalid').dispatch('change'); },
    check(reference, queries) {
      this.edit('reference', reference);
      this.edit('queries', queries);
      this.click('check');
    },
    rows() { return el('result-rows').children.map(row => row.children.map(cell => cell.textContent)); },
    counts() { return el('counts').children.map(span => Number(span.children[0].textContent.replace(/\D/g, ''))); },
    import(id, text, size = Buffer.byteLength(text)) {
      const input = el(id);
      input.files = [{ name: id + '.txt', size }];
      input.value = 'C:\\fakepath\\' + id + '.txt';
      const before = readers.length;
      input.dispatch('change');
      return readers.length > before ? readers.at(-1) : null;
    }
  };
}

function assertInvalidated(page) {
  assert.equal(page.el('results').hidden, true);
  assert.deepEqual(page.rows(), []);
  for (const id of ['copy-included', 'copy-excluded', 'export']) assert.equal(page.el(id).disabled, true, id);
  assert.equal(page.el('diagnostics').hidden, true);
}

function assertImportFinished(page, id) {
  assert.equal(page.el(id).value, '');
  for (const control of ['check', 'reference-file', 'query-file']) assert.equal(page.el(control).disabled, false, control);
}

test('actual HTML IDs satisfy JS selectors; local script sources exist in dependency order', () => {
  const page = browser();
  for (const match of SOURCE.matchAll(/\bel\('([^']+)'\)/g)) assert.ok(page.el(match[1]));
  const scripts = [...HTML.matchAll(/<script\b([^>]*)>/gi)].map(match => attributes(match[1]).src);
  assert.deepEqual(scripts, ['/js/common.js', '/js/ip-list-core.js', '/js/ip-list-checker.js']);
  for (const src of scripts) assert.ok(fs.statSync(path.join(ROOT, src.slice(1))).isFile(), src);
  for (const id of ['reference', 'queries', 'skip-invalid', 'check', 'example', 'clear', 'filter',
    'prev', 'next', 'copy-included', 'copy-excluded', 'export', 'reference-file', 'query-file']) {
    assert.ok(Object.keys(page.el(id).events).length, 'missing UI listener: ' + id);
  }
  assert.equal(page.el('filter').value, 'all');
  assertInvalidated(page);
});

test('example renders mixed-family results, inclusive boundaries and normalized CIDR diagnostics', () => {
  const page = browser();
  page.click('example');
  assert.equal(page.el('results').hidden, false);
  assert.deepEqual(page.counts(), [5, 3, 1]);
  assert.deepEqual(page.rows().map(row => row.slice(0, 2)), [
    ['192.168.1.0', 'Included'], ['192.168.1.255', 'Included'], ['10.0.0.50', 'Included'],
    ['10.0.0.51', 'Not included'], ['203.0.113.7', 'Included'], ['8.8.8.8', 'Not included'],
    ['2001:db8::1', 'Included'], ['2001:db9::1', 'Not included'], ['not-an-ip', 'Invalid IP']
  ]);
  assert.equal(page.rows()[0][2], '192.168.1.23/24 (reference line 2) → 192.168.1.0/24');
  assert.equal(page.rows()[2][2], '10.0.0.10 - 10.0.0.50 (reference line 3)');
  assert.equal(page.rows()[6][2], '2001:db8::/32 (reference line 5)');
  assert.equal(page.rows()[3][2], '—');
  assert.ok(page.rows()[8][2].length > 0);
  assert.equal(page.el('diagnostics').hidden, false);
  assert.equal(page.el('diagnostics').open, false);
  assert.equal(page.el('diagnostics-summary').textContent, '0 invalid reference entries; 1 normalized CIDRs');
  assert.equal(page.el('diagnostics-text').textContent, 'Line 2: 192.168.1.23/24 → 192.168.1.0/24');
  assert.equal(page.el('page').textContent, '1–9 of 9 results');
  assert.match(page.el('message').textContent, /Checked 9 IP entries against 4 valid reference entries/);
  assert.equal(page.el('error').hidden, true);
});

test('invalid references block until explicitly skipped, with line diagnostics and warning', () => {
  const page = browser();
  page.check('192.0.2.129/24\nbad', '192.0.2.0,198.51.100.1,bad');
  assert.equal(page.el('results').hidden, true);
  assert.deepEqual(page.rows(), []);
  assert.equal(page.el('export').disabled, true);
  assert.equal(page.el('error').hidden, false);
  assert.match(page.el('error').textContent, /Invalid reference entries block comparison/);
  assert.equal(page.el('diagnostics').open, true);
  assert.match(page.el('diagnostics-text').textContent, /Line 2: bad —/);
  assert.match(page.el('diagnostics-text').textContent, /Line 1: 192\.0\.2\.129\/24 → 192\.0\.2\.0\/24/);
  page.skip(true);
  assertInvalidated(page);
  page.click('check');
  assert.deepEqual(page.counts(), [1, 1, 1]);
  assert.match(page.el('message').textContent, /WARNING: 1 invalid reference entries skipped/);
  assert.equal(page.el('error').hidden, true);
  page.skip(false);
  page.click('check');
  assert.equal(page.el('results').hidden, true);
});

test('zero valid references still block when skipped; empty queries show no results', () => {
  const page = browser();
  page.skip(true);
  page.check('# comment\nbad', '::1');
  assert.match(page.el('error').textContent, /at least one valid reference/);
  assert.equal(page.el('results').hidden, true);
  page.check('::1', '# no queries\n,');
  assert.match(page.el('error').textContent, /at least one IP to check/);
  assert.equal(page.el('results').hidden, true);
  assert.equal(page.el('export').disabled, true);
});

test('invalid query IPs remain distinct from exclusions; order, duplicates and literal text survive', () => {
  const page = browser();
  page.check('::1', '::1,::2,::1/128,::1-::2,<img src=x onerror=alert(1)>,::1');
  assert.deepEqual(page.counts(), [2, 1, 3]);
  assert.deepEqual(page.rows().map(row => row[1]), ['Included', 'Not included', 'Invalid IP', 'Invalid IP', 'Invalid IP', 'Included']);
  assert.equal(page.rows()[4][0], '<img src=x onerror=alert(1)>');
  assert.equal(page.el('result-rows').children[4].children[0].children.length, 0);
  assert.equal(page.el('result-rows').children[2].children[1].className, 'ip-invalid');
  page.click('copy-excluded');
  assert.equal(page.copies[0].text, '::2');
  page.filter('invalid');
  assert.equal(page.rows().length, 3);
  assert.ok(page.rows().every(row => row[1] === 'Invalid IP' && row[2] !== '—'));
});

for (const id of ['reference', 'queries', 'skip-invalid']) {
  test(id + ' edits invalidate results and prevent stale copy/export', () => {
    const page = browser();
    page.click('example');
    if (id === 'skip-invalid') page.skip(true);
    else page.edit(id, '::1');
    assertInvalidated(page);
    assert.equal(page.el('error').hidden, true);
    assert.match(page.el('message').textContent, /Inputs changed/);
    // Invoke listeners directly too: guards must not rely only on disabled buttons.
    for (const control of ['copy-included', 'copy-excluded', 'export']) page.el(control).dispatch('click');
    assert.deepEqual(page.copies, []);
    assert.deepEqual(page.downloads, []);
  });
}

test('450 results paginate at 200; filters reset page, counts stay global, copy/export use all rows', async () => {
  const page = browser();
  const included = Array.from({ length: 250 }, (_, i) => '10.0.0.' + i);
  const excluded = Array.from({ length: 150 }, (_, i) => '192.0.2.' + i);
  const invalid = Array.from({ length: 50 }, (_, i) => 'bad-' + i);
  const queries = [...included, ...excluded, ...invalid];
  page.check('10.0.0.0/24', queries.join('\n'));
  assert.deepEqual(page.counts(), [250, 150, 50]);
  assert.equal(page.rows().length, 200);
  assert.equal(page.el('page').textContent, '1–200 of 450 results');
  assert.equal(page.el('prev').disabled, true);
  assert.equal(page.el('next').disabled, false);
  page.click('next');
  assert.equal(page.rows().length, 200);
  assert.equal(page.rows()[0][0], queries[200]);
  assert.equal(page.el('page').textContent, '201–400 of 450 results');
  page.click('next');
  assert.equal(page.rows().length, 50);
  assert.equal(page.el('page').textContent, '401–450 of 450 results');
  assert.equal(page.el('next').disabled, true);
  page.el('next').dispatch('click');
  assert.equal(page.rows()[0][0], queries[400]);
  page.click('prev');
  assert.equal(page.el('page').textContent, '201–400 of 450 results');
  page.filter('included');
  assert.equal(page.el('page').textContent, '1–200 of 250 results');
  page.click('next');
  assert.equal(page.rows().length, 50);
  assert.equal(page.el('page').textContent, '201–250 of 250 results');
  page.click('copy-included');
  assert.deepEqual(page.copies[0], { text: included.join('\n'), message: 'Copied 250 IPs' });
  page.filter('invalid');
  assert.equal(page.el('page').textContent, '1–50 of 50 results');
  page.click('copy-excluded');
  assert.deepEqual(page.copies[1], { text: excluded.join('\n'), message: 'Copied 150 IPs' });
  page.filter('excluded');
  assert.equal(page.rows().length, 150);
  assert.equal(page.rows()[0][0], excluded[0]);
  assert.deepEqual(page.counts(), [250, 150, 50]);
  page.click('export');
  assert.deepEqual(page.downloads, [{ href: 'blob:local/1', filename: 'ip-list-results.csv' }]);
  assert.equal(page.blobs[0].type, 'text/csv;charset=utf-8');
  const csv = await page.blobs[0].text();
  assert.equal(csv, toCSV(core.compare('10.0.0.0/24', queries.join('\n')).results));
  assert.equal(csv.split('\r\n').length, 452); // Header + 450 rows + trailing newline.
  assert.equal(page.document.body.children.length, 0);
  assert.deepEqual(page.revoked, []);
  assert.equal(page.timers[0].delay, 1000);
  page.timers[0].callback();
  assert.deepEqual(page.revoked, ['blob:local/1']);
});

test('empty filter renders no rows with pager disabled and global counts intact', () => {
  const page = browser();
  page.check('::1', '::1,::1');
  assert.equal(page.el('copy-included').disabled, false);
  assert.equal(page.el('copy-excluded').disabled, true);
  page.filter('excluded');
  assert.deepEqual(page.rows(), []);
  assert.equal(page.el('page').textContent, 'No results for this filter.');
  assert.equal(page.el('prev').disabled, true);
  assert.equal(page.el('next').disabled, true);
  assert.deepEqual(page.counts(), [2, 0, 0]);
});

test('clear resets inputs, skip, filter, diagnostics and copy/export state', () => {
  const page = browser();
  page.click('example');
  page.filter('invalid');
  page.el('skip-invalid').checked = true;
  page.click('clear');
  assert.equal(page.el('reference').value, '');
  assert.equal(page.el('queries').value, '');
  assert.equal(page.el('skip-invalid').checked, false);
  assert.equal(page.el('filter').value, 'all');
  assertInvalidated(page);
  assert.equal(page.el('error').hidden, true);
  assert.match(page.el('message').textContent, /^Cleared\./);
});

test('CommonJS toCSV quotes every cell, doubles quotes, keeps CRLF and neutralizes formulas in every column', () => {
  assert.equal(toCSV([]), '"IP","Result","Matching reference","Reference line","Normalized CIDR","Error"\r\n');
  assert.equal(toCSV([{
    ip: 'a,"b"\nnext', status: 'excluded', match: null, message: 'plain,"quoted"'
  }]), '"IP","Result","Matching reference","Reference line","Normalized CIDR","Error"\r\n' +
    '"a,""b""\nnext","Not included","","","","plain,""quoted"""\r\n');
  for (const value of ['=1+1', '+SUM(A1)', '-1', '@cmd', '  =1', '\tplain', '\rplain', '\nplain']) {
    const escaped = '"\'' + value + '"';
    const csv = toCSV([{ ip: value, status: 'invalid',
      match: { entry: value, line: value, normalized: value }, message: value }]);
    assert.equal(csv, '"IP","Result","Matching reference","Reference line","Normalized CIDR","Error"\r\n' +
      [escaped, '"invalid"', escaped, escaped, escaped, escaped].join(',') + '\r\n', JSON.stringify(value));
  }
  assert.match(toCSV([{ ip: null, status: 'included', match: { entry: undefined, line: 2, normalized: null } }]),
    /"","included","","2","",""\r\n$/);
});

for (const [input, target] of [['reference-file', 'reference'], ['query-file', 'queries']]) {
  test(input + ' appends local text in order, strips BOM, preserves comments/commas and avoids extra newline', () => {
    const page = browser();
    page.check('::1,::2,::3', '::1');
    const original = page.el(target).value;
    const text = '\uFEFF# imported\r\n::2,::3 # trailing comment\r\n::2';
    const reader = page.import(input, text);
    assert.equal(reader.file.name, input + '.txt');
    assertInvalidated(page);
    for (const id of ['check', 'reference-file', 'query-file']) assert.equal(page.el(id).disabled, true);
    page.el('check').dispatch('click');
    assert.equal(page.el('results').hidden, true);
    reader.succeed(text);
    assert.equal(page.el(target).value, original + '\n' + text.slice(1));
    assertImportFinished(page, input);
    assert.match(page.el('message').textContent, /^Appended /);
    page.click('check');
    if (target === 'queries') assert.deepEqual(page.rows().map(row => row[0]), ['::1', '::2', '::3', '::2']);
    else {
      page.edit('queries', '::3');
      page.click('check');
      assert.equal(page.rows()[0][1], 'Included');
    }
    page.edit(target, '::1\r\n');
    page.import(input, '::2').succeed('::2');
    assert.equal(page.el(target).value, '::1\r\n::2');
    page.edit(target, '');
    page.import(input, '::3').succeed('::3');
    assert.equal(page.el(target).value, '::3');
  });
}

test('import keeps syntax errors editable for subsequent reference/query diagnostics', () => {
  const page = browser();
  page.check('::1', '::1');
  page.import('reference-file', 'bad').succeed('bad');
  assert.equal(page.el('reference').value, '::1\nbad');
  page.click('check');
  assert.match(page.el('error').textContent, /Invalid reference entries block/);
  page.skip(true);
  page.import('query-file', 'bad').succeed('bad');
  page.click('check');
  assert.deepEqual(page.counts(), [1, 0, 1]);
});

for (const [input, target] of [['reference-file', 'reference'], ['query-file', 'queries']]) {
  for (const kind of ['file size', 'combined text size', 'entry count', 'binary data', 'read error']) {
    test(input + ' rejects ' + kind + ' without mutating either list', () => {
      const page = browser();
      page.check('::1', '::2');
      let text = '::3';
      let size;
      let expected;
      if (kind === 'file size') { size = core.MAX_TEXT_LENGTH + 1; expected = /File exceeds the 5 MiB limit/; }
      if (kind === 'combined text size') {
        text = '#' + 'x'.repeat(core.MAX_TEXT_LENGTH - 1);
        expected = /List exceeds the 5 MiB character limit/;
      }
      if (kind === 'entry count') { text = Array(core.MAX_ENTRIES).fill('::3').join(','); expected = /100000 entry limit/; }
      if (kind === 'binary data') { text = '::3\0'; expected = /binary data/; }
      if (kind === 'read error') expected = /Could not read this file/;
      const before = [page.el('reference').value, page.el('queries').value];
      const reader = page.import(input, text, size);
      if (kind === 'file size') { assert.equal(reader, null); assert.equal(page.readers.length, 0); }
      else if (kind === 'read error') reader.fail();
      else reader.succeed(text);
      assert.deepEqual([page.el('reference').value, page.el('queries').value], before, target);
      assert.equal(page.el('error').hidden, false);
      assert.match(page.el('error').textContent, expected);
      assertImportFinished(page, input);
      assertInvalidated(page);
    });
  }
}

for (const edit of ['reference', 'queries', 'skip-invalid']) {
  test(edit + ' edit during read prevents append without reverting user changes', () => {
    const page = browser();
    page.check('::1', '::2');
    const reader = page.import('query-file', '::3');
    if (edit === 'skip-invalid') page.skip(true);
    else page.edit(edit, '::4');
    const before = [page.el('reference').value, page.el('queries').value, page.el('skip-invalid').checked];
    reader.succeed('::3');
    assert.deepEqual([page.el('reference').value, page.el('queries').value, page.el('skip-invalid').checked], before);
    assert.match(page.el('error').textContent, /Inputs changed while reading/);
    assertImportFinished(page, 'query-file');
    assertInvalidated(page);
  });
}

for (const action of ['clear', 'example']) {
  for (const input of ['reference-file', 'query-file']) {
    test(action + ' cancels stale ' + input + ' callbacks, including while a newer import is active', () => {
      const page = browser();
      page.check('::1', '::2');
      const stale = page.import(input, '::3');
      page.click(action);
      assert.equal(stale.aborted, true);
      assertImportFinished(page, input);
      assert.equal(page.el('reference-file').value, '');
      assert.equal(page.el('query-file').value, '');
      const before = [page.el('reference').value, page.el('queries').value, page.el('message').textContent, page.rows()];
      stale.succeed('::3');
      stale.fail();
      stale.onabort();
      assert.deepEqual([page.el('reference').value, page.el('queries').value, page.el('message').textContent, page.rows()], before);
      if (action === 'clear') assertInvalidated(page);
      else assert.deepEqual(page.counts(), [5, 3, 1]);
      const fresh = page.import('query-file', '::4');
      stale.succeed('::3');
      stale.fail();
      stale.onabort();
      assert.equal(page.el('check').disabled, true);
      assert.notEqual(page.el('query-file').value, '');
      fresh.succeed('::4');
      assert.equal(page.el('queries').value, before[1] + (before[1] ? '\n' : '') + '::4');
      assertImportFinished(page, 'query-file');
    });
  }
}