(function () {
  'use strict';

  var QUALIFIERS = {
    '+': 'Pass',
    '-': 'Fail',
    '~': 'SoftFail',
    '?': 'Neutral'
  };

  var DNS_LOOKUP_MECHANISMS = {
    include: true,
    a: true,
    mx: true,
    exists: true,
    ptr: true,
    redirect: true
  };

  function esc(v) {
    return window.mtools.escapeHtml(String(v));
  }

  function parseToken(token) {
    var qualifier = '+';
    var first = token.charAt(0);
    if (QUALIFIERS[first]) {
      qualifier = first;
      token = token.slice(1);
    }

    var mechanism = token;
    var value = '';

    if (token.indexOf('=') !== -1) {
      var partsEq = token.split('=');
      mechanism = partsEq[0];
      value = partsEq.slice(1).join('=');
    } else if (token.indexOf(':') !== -1) {
      var partsColon = token.split(':');
      mechanism = partsColon[0];
      value = partsColon.slice(1).join(':');
    }

    mechanism = mechanism.toLowerCase();
    return {
      qualifier: qualifier,
      outcome: QUALIFIERS[qualifier],
      mechanism: mechanism,
      value: value
    };
  }

  function parseSPF(input) {
    var cleaned = input.trim().replace(/^"|"$/g, '');
    if (!cleaned) throw new Error('SPF record is empty.');

    var tokens = cleaned.split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens[0].toLowerCase() !== 'v=spf1') {
      throw new Error('SPF must start with v=spf1.');
    }

    var entries = [];
    for (var i = 1; i < tokens.length; i += 1) {
      entries.push(parseToken(tokens[i]));
    }
    return entries;
  }

  function estimateLookups(entries) {
    var count = 0;
    entries.forEach(function (entry) {
      if (DNS_LOOKUP_MECHANISMS[entry.mechanism]) count += 1;
    });
    return count;
  }

  function render(entries, lookupCount) {
    var html = '';

    html += '<div class="tool-section"><h2>Mechanisms</h2>';
    if (!entries.length) {
      html += '<div class="result">No mechanisms found after v=spf1.</div>';
    } else {
      html += '<div class="result" style="overflow:auto">';
      html += '<table style="width:100%;border-collapse:collapse">';
      html += '<thead><tr><th style="text-align:left;padding:0.4rem 0.2rem">Qualifier</th><th style="text-align:left;padding:0.4rem 0.2rem">Mechanism</th><th style="text-align:left;padding:0.4rem 0.2rem">Value</th><th style="text-align:left;padding:0.4rem 0.2rem">DNS lookup</th></tr></thead><tbody>';
      entries.forEach(function (entry) {
        html += '<tr>' +
          '<td style="padding:0.35rem 0.2rem">' + esc(entry.qualifier + ' (' + entry.outcome + ')') + '</td>' +
          '<td style="padding:0.35rem 0.2rem">' + esc(entry.mechanism) + '</td>' +
          '<td style="padding:0.35rem 0.2rem;word-break:break-word">' + esc(entry.value || '-') + '</td>' +
          '<td style="padding:0.35rem 0.2rem">' + (DNS_LOOKUP_MECHANISMS[entry.mechanism] ? 'yes' : 'no') + '</td>' +
          '</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    html += '<div class="tool-section mt-2"><h2>Lookup budget</h2>';
    html += '<div class="result">Estimated DNS lookups: <strong>' + esc(lookupCount) + '/10</strong></div>';
    if (lookupCount > 10) {
      html += '<div class="result mt-1"><span class="text-error">This record likely exceeds the RFC lookup limit and may fail SPF checks.</span></div>';
    } else if (lookupCount >= 8) {
      html += '<div class="result mt-1"><span style="color:#f59e0b">Close to the DNS lookup limit. Consider reducing nested includes.</span></div>';
    } else {
      html += '<div class="result mt-1"><span class="text-success">Within typical lookup budget.</span></div>';
    }
    html += '</div>';

    return html;
  }

  function run() {
    var statusEl = document.getElementById('spf-status');
    var resultsEl = document.getElementById('spf-results');
    var input = document.getElementById('spf-input').value;

    try {
      var entries = parseSPF(input);
      var lookups = estimateLookups(entries);
      statusEl.className = 'mt-1 text-success';
      statusEl.textContent = 'SPF parsed successfully.';
      resultsEl.innerHTML = render(entries, lookups);
    } catch (err) {
      statusEl.className = 'mt-1 text-error';
      statusEl.textContent = err.message || 'Failed to parse SPF.';
      resultsEl.innerHTML = '';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sample = 'v=spf1 ip4:203.0.113.0/24 include:_spf.google.com include:mail.example.net a mx ~all';
    document.getElementById('spf-input').value = sample;
    document.getElementById('btn-spf-parse').addEventListener('click', run);
    document.getElementById('btn-spf-sample').addEventListener('click', function () {
      document.getElementById('spf-input').value = sample;
      run();
    });
    document.getElementById('spf-input').addEventListener('input', run);
    run();
  });
})();