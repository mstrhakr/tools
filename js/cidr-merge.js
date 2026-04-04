(function () {
  'use strict';

  function ipToInt(ip) {
    var parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(function (p) { return isNaN(p) || p < 0 || p > 255; })) {
      throw new Error('Invalid IP: ' + ip);
    }
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  function intToIp(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  function parseCIDR(s) {
    var parts = s.trim().split('/');
    if (parts.length !== 2) throw new Error('Invalid CIDR: ' + s);
    var prefixLen = parseInt(parts[1], 10);
    if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) throw new Error('Invalid prefix length in: ' + s);
    var baseInt = ipToInt(parts[0]);
    var mask = prefixLen === 0 ? 0 : (0xFFFFFFFF << (32 - prefixLen)) >>> 0;
    var network = (baseInt & mask) >>> 0;
    return { network: network, prefixLen: prefixLen, size: 1 << (32 - prefixLen) };
  }

  function isContained(a, b) {
    // Is a contained within b?
    var maskB = b.prefixLen === 0 ? 0 : (0xFFFFFFFF << (32 - b.prefixLen)) >>> 0;
    return (a.network & maskB) >>> 0 === b.network && a.prefixLen >= b.prefixLen;
  }

  function mergePrefixes(prefixes) {
    if (prefixes.length === 0) return [];

    // Sort by network, then prefix length (shorter = larger block first)
    prefixes.sort(function (a, b) {
      return a.network !== b.network ? a.network - b.network : a.prefixLen - b.prefixLen;
    });

    // Remove subnets of already-included blocks
    var deduped = [];
    for (var i = 0; i < prefixes.length; i++) {
      var skip = false;
      for (var j = 0; j < deduped.length; j++) {
        if (isContained(prefixes[i], deduped[j])) { skip = true; break; }
      }
      if (!skip) deduped.push(prefixes[i]);
    }

    // Merge adjacent blocks of equal size repeatedly until stable
    var stable = false;
    while (!stable) {
      stable = true;
      var merged = [];
      for (var i = 0; i < deduped.length; i++) {
        var cur = deduped[i];
        if (merged.length === 0) { merged.push(cur); continue; }
        var prev = merged[merged.length - 1];
        // Two adjacent blocks can merge if same prefix length and prev.network ^ cur.network === size/2
        if (prev.prefixLen === cur.prefixLen && prev.prefixLen > 0) {
          var parentMask = (0xFFFFFFFF << (33 - prev.prefixLen)) >>> 0;
          if ((prev.network & parentMask) >>> 0 === (cur.network & parentMask) >>> 0) {
            // They're siblings — merge into parent
            merged[merged.length - 1] = { network: prev.network & parentMask, prefixLen: prev.prefixLen - 1, size: prev.size * 2 };
            stable = false;
            continue;
          }
        }
        merged.push(cur);
      }
      deduped = merged;
    }

    return deduped;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-merge').addEventListener('click', function () {
      var raw = document.getElementById('cidr-input').value;
      var errorEl = document.getElementById('cidr-error');
      var outputSection = document.getElementById('cidr-output-section');
      errorEl.style.display = 'none';
      outputSection.style.display = 'none';

      var lines = raw.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return;

      var prefixes = [];
      var errors = [];
      lines.forEach(function (l) {
        try { prefixes.push(parseCIDR(l)); }
        catch (e) { errors.push(e.message); }
      });

      if (errors.length) {
        errorEl.textContent = errors.join('; ');
        errorEl.style.display = 'block';
        return;
      }

      var result = mergePrefixes(prefixes);
      var output = result.map(function (p) { return intToIp(p.network) + '/' + p.prefixLen; }).join('\n');

      document.getElementById('cidr-output').value = output;
      document.getElementById('cidr-stats').textContent =
        'Input: ' + lines.length + ' prefixes  →  Output: ' + result.length + ' prefixes (' + (lines.length - result.length) + ' removed/merged)';
      outputSection.style.display = 'block';
    });

    document.getElementById('btn-clear').addEventListener('click', function () {
      document.getElementById('cidr-input').value = '';
      document.getElementById('cidr-output').value = '';
      document.getElementById('cidr-output-section').style.display = 'none';
      document.getElementById('cidr-error').style.display = 'none';
    });

    document.getElementById('btn-copy').addEventListener('click', function () {
      var val = document.getElementById('cidr-output').value;
      if (val) mtools.copyToClipboard(val, 'Copied');
    });
  });
})();
