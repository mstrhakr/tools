(function () {
  'use strict';

  var TAG_INFO = {
    v: 'Protocol version, must be DMARC1.',
    p: 'Policy for the organizational domain (none, quarantine, reject).',
    sp: 'Policy for subdomains (defaults to p if omitted).',
    rua: 'Aggregate report URIs.',
    ruf: 'Forensic/failure report URIs.',
    adkim: 'DKIM alignment mode (r relaxed, s strict).',
    aspf: 'SPF alignment mode (r relaxed, s strict).',
    pct: 'Percentage of mail subject to policy.',
    fo: 'Failure reporting options.',
    ri: 'Aggregate report interval in seconds.'
  };

  function esc(v) {
    return window.mtools.escapeHtml(String(v));
  }

  function parseDMARC(input) {
    var cleaned = input.trim().replace(/^"|"$/g, '');
    if (!cleaned) throw new Error('DMARC record is empty.');

    var segments = cleaned.split(';').map(function (s) { return s.trim(); }).filter(Boolean);
    var tags = {};

    segments.forEach(function (segment) {
      var idx = segment.indexOf('=');
      if (idx === -1) {
        throw new Error('Invalid tag format: ' + segment);
      }
      var key = segment.slice(0, idx).trim().toLowerCase();
      var value = segment.slice(idx + 1).trim();
      if (!key) throw new Error('Found empty tag key.');
      tags[key] = value;
    });

    if ((tags.v || '').toUpperCase() !== 'DMARC1') {
      throw new Error('DMARC must include v=DMARC1.');
    }
    if (!tags.p) {
      throw new Error('DMARC must include policy tag p=.');
    }

    return tags;
  }

  function findings(tags) {
    var out = [];
    var p = (tags.p || '').toLowerCase();
    var pct = Number(tags.pct || '100');

    if (p === 'none') {
      out.push({ level: 'warn', text: 'Policy is monitor-only (p=none). Consider staged rollout to quarantine/reject.' });
    } else if (p === 'quarantine') {
      out.push({ level: 'info', text: 'Policy is quarantine. Some failing mail may still reach spam folders.' });
    } else if (p === 'reject') {
      out.push({ level: 'ok', text: 'Policy is reject. This is strongest anti-spoofing posture.' });
    } else {
      out.push({ level: 'warn', text: 'Unknown p= value: ' + tags.p });
    }

    if (!tags.rua) {
      out.push({ level: 'warn', text: 'No rua= aggregate reporting URI found.' });
    }

    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      out.push({ level: 'warn', text: 'pct should be between 0 and 100.' });
    } else if (pct < 100) {
      out.push({ level: 'info', text: 'pct=' + pct + ' means policy is partially enforced.' });
    }

    return out;
  }

  function renderTags(tags) {
    var html = '<div class="tool-section"><h2>Tags</h2><div class="result" style="overflow:auto">';
    html += '<table style="width:100%;border-collapse:collapse">';
    html += '<thead><tr><th style="text-align:left;padding:0.4rem 0.2rem">Tag</th><th style="text-align:left;padding:0.4rem 0.2rem">Value</th><th style="text-align:left;padding:0.4rem 0.2rem">Meaning</th></tr></thead><tbody>';
    Object.keys(tags).forEach(function (key) {
      html += '<tr>' +
        '<td style="padding:0.35rem 0.2rem">' + esc(key) + '</td>' +
        '<td style="padding:0.35rem 0.2rem;word-break:break-word">' + esc(tags[key]) + '</td>' +
        '<td style="padding:0.35rem 0.2rem">' + esc(TAG_INFO[key] || 'Non-standard/custom tag.') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  function renderFindings(items) {
    var html = '<div class="tool-section mt-2"><h2>Findings</h2>';
    if (!items.length) {
      html += '<div class="result"><span class="text-success">No immediate issues found.</span></div>';
    } else {
      items.forEach(function (item) {
        var cls = item.level === 'warn' ? 'text-error' : (item.level === 'ok' ? 'text-success' : 'text-muted');
        html += '<div class="result mt-1"><span class="' + cls + '">' + esc(item.text) + '</span></div>';
      });
    }
    html += '</div>';
    return html;
  }

  function run() {
    var input = document.getElementById('dmarc-input').value;
    var statusEl = document.getElementById('dmarc-status');
    var resultsEl = document.getElementById('dmarc-results');

    try {
      var tags = parseDMARC(input);
      var notes = findings(tags);
      statusEl.className = 'mt-1 text-success';
      statusEl.textContent = 'DMARC parsed successfully.';
      resultsEl.innerHTML = renderTags(tags) + renderFindings(notes);
    } catch (err) {
      statusEl.className = 'mt-1 text-error';
      statusEl.textContent = err.message || 'Failed to parse DMARC.';
      resultsEl.innerHTML = '';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sample = 'v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; adkim=s; aspf=s; pct=100';
    document.getElementById('dmarc-input').value = sample;
    document.getElementById('btn-dmarc-parse').addEventListener('click', run);
    document.getElementById('btn-dmarc-sample').addEventListener('click', function () {
      document.getElementById('dmarc-input').value = sample;
      run();
    });
    document.getElementById('dmarc-input').addEventListener('input', run);
    run();
  });
})();