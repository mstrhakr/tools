(function () {
  'use strict';

  function parse(version) {
    var m = String(version || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
    if (!m) throw new Error('Invalid semver: ' + version);
    return {
      major: parseInt(m[1], 10),
      minor: parseInt(m[2], 10),
      patch: parseInt(m[3], 10),
      prerelease: m[4] ? m[4].split('.') : []
    };
  }

  function cmpIdentifiers(a, b) {
    var aNum = /^\d+$/.test(a);
    var bNum = /^\d+$/.test(b);
    if (aNum && bNum) return parseInt(a, 10) - parseInt(b, 10);
    if (aNum) return -1;
    if (bNum) return 1;
    return a < b ? -1 : (a > b ? 1 : 0);
  }

  function compare(aRaw, bRaw) {
    var a = parse(aRaw);
    var b = parse(bRaw);
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;

    var ap = a.prerelease;
    var bp = b.prerelease;
    if (!ap.length && !bp.length) return 0;
    if (!ap.length) return 1;
    if (!bp.length) return -1;

    var len = Math.max(ap.length, bp.length);
    for (var i = 0; i < len; i++) {
      if (ap[i] === undefined) return -1;
      if (bp[i] === undefined) return 1;
      var c = cmpIdentifiers(ap[i], bp[i]);
      if (c !== 0) return c;
    }
    return 0;
  }

  function tokenizeRange(range) {
    return range.trim().split(/\s+/).filter(Boolean);
  }

  function compareOp(version, op, rhs) {
    var c = compare(version, rhs);
    if (op === '>') return c > 0;
    if (op === '>=') return c >= 0;
    if (op === '<') return c < 0;
    if (op === '<=') return c <= 0;
    return c === 0;
  }

  function satisfiesCaret(version, base) {
    var b = parse(base);
    var upper;
    if (b.major > 0) upper = (b.major + 1) + '.0.0';
    else if (b.minor > 0) upper = '0.' + (b.minor + 1) + '.0';
    else upper = '0.0.' + (b.patch + 1);
    return compare(version, base) >= 0 && compare(version, upper) < 0;
  }

  function satisfiesTilde(version, base) {
    var b = parse(base);
    var upper = b.major + '.' + (b.minor + 1) + '.0';
    return compare(version, base) >= 0 && compare(version, upper) < 0;
  }

  function satisfiesWildcard(version, expr) {
    var m = expr.match(/^v?(\d+|x|\*)\.(\d+|x|\*)(?:\.(\d+|x|\*))?$/i);
    if (!m) return false;
    var v = parse(version);
    var parts = [m[1], m[2], m[3] || 'x'];
    if (parts[0] !== 'x' && parts[0] !== '*' && v.major !== parseInt(parts[0], 10)) return false;
    if (parts[1] !== 'x' && parts[1] !== '*' && v.minor !== parseInt(parts[1], 10)) return false;
    if (parts[2] !== 'x' && parts[2] !== '*' && v.patch !== parseInt(parts[2], 10)) return false;
    return true;
  }

  function satisfies(version, range) {
    var tokens = tokenizeRange(range);
    if (!tokens.length) throw new Error('Range is empty.');

    return tokens.every(function (token) {
      if (token.charAt(0) === '^') return satisfiesCaret(version, token.slice(1));
      if (token.charAt(0) === '~') return satisfiesTilde(version, token.slice(1));
      if (/x|\*/i.test(token)) return satisfiesWildcard(version, token);

      var m = token.match(/^(>=|<=|>|<|=)?(.+)$/);
      var op = m[1] || '=';
      var rhs = m[2];
      return compareOp(version, op, rhs);
    });
  }

  function render() {
    var a = document.getElementById('sv-a').value.trim();
    var b = document.getElementById('sv-b').value.trim();
    var version = document.getElementById('sv-version').value.trim();
    var range = document.getElementById('sv-range').value.trim();
    var compareEl = document.getElementById('sv-compare-result');
    var rangeEl = document.getElementById('sv-range-result');
    var statusEl = document.getElementById('sv-status');

    try {
      var cmp = compare(a, b);
      if (cmp < 0) compareEl.textContent = 'A < B';
      else if (cmp > 0) compareEl.textContent = 'A > B';
      else compareEl.textContent = 'A = B';

      var ok = satisfies(version, range);
      rangeEl.textContent = ok ? 'MATCH' : 'NO MATCH';
      rangeEl.style.color = ok ? 'var(--success)' : 'var(--error)';
      statusEl.className = 'mt-1 text-success';
      statusEl.textContent = 'Parsed successfully.';
    } catch (error) {
      compareEl.textContent = '--';
      rangeEl.textContent = '--';
      statusEl.className = 'mt-1 text-error';
      statusEl.textContent = error.message || 'Failed to parse semver input.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['sv-a', 'sv-b', 'sv-version', 'sv-range'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', render);
    });
    render();
  });
})();