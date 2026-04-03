(function () {
  'use strict';

  var DOH_URL = 'https://cloudflare-dns.com/dns-query';

  var RECORD_TYPES = {
    A: 1, AAAA: 28, CNAME: 5, MX: 15, NS: 2,
    TXT: 16, SOA: 6, PTR: 12, SRV: 33, CAA: 257
  };

  function dohQuery(name, type) {
    var typeNum = RECORD_TYPES[type] || 1;
    var url = DOH_URL + '?name=' + encodeURIComponent(name) + '&type=' + typeNum;
    return fetch(url, {
      headers: { 'Accept': 'application/dns-json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('DNS query failed: ' + r.status);
      return r.json();
    });
  }

  function rcodeToText(rcode) {
    var codes = { 0: 'NOERROR', 1: 'FORMERR', 2: 'SERVFAIL', 3: 'NXDOMAIN', 5: 'REFUSED' };
    return codes[rcode] || 'RCODE ' + rcode;
  }

  function typeToName(t) {
    var rev = {};
    Object.keys(RECORD_TYPES).forEach(function (k) { rev[RECORD_TYPES[k]] = k; });
    return rev[t] || 'TYPE' + t;
  }

  function formatData(answer) {
    switch (answer.type) {
      case 15: // MX: priority + exchange
        // data format: "10 mail.example.com."
        return answer.data;
      case 16: // TXT: strip quotes
        return answer.data.replace(/^"|"$/g, '');
      default:
        return answer.data;
    }
  }

  function renderResults(data, type) {
    var container = document.getElementById('dns-results');
    var statusEl = document.getElementById('dns-status');

    var status = rcodeToText(data.Status);
    statusEl.textContent = 'Status: ' + status;
    statusEl.style.color = data.Status === 0 ? 'var(--success)' : 'var(--error)';

    container.innerHTML = '';

    if (!data.Answer || data.Answer.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'result mt-1';
      empty.style.color = 'var(--fg-muted)';
      empty.textContent = 'No ' + type + ' records found';
      container.appendChild(empty);
      return;
    }

    data.Answer.forEach(function (ans) {
      var row = document.createElement('div');
      row.className = 'result mt-1';
      row.innerHTML =
        '<div class="result-label">' + typeToName(ans.type) + ' &middot; TTL ' + ans.TTL + 's</div>' +
        '<div style="word-break:break-all">' + formatData(ans) + '</div>' +
        '<button class="btn btn-secondary btn-sm mt-1" data-val="' + formatData(ans).replace(/"/g, '&quot;') + '">copy</button>';
      row.querySelector('button').addEventListener('click', function (e) {
        window.mtools.copyToClipboard(e.currentTarget.dataset.val);
      });
      container.appendChild(row);
    });
  }

  function lookup() {
    var name = document.getElementById('dns-name').value.trim();
    var type = document.getElementById('dns-type').value;
    var errorEl = document.getElementById('dns-error');
    var resultsEl = document.getElementById('dns-results');
    var statusEl = document.getElementById('dns-status');
    var btn = document.getElementById('dns-btn');
    var loader = document.getElementById('dns-loader');

    errorEl.style.display = 'none';
    resultsEl.innerHTML = '';
    statusEl.textContent = '';

    if (!name) {
      errorEl.textContent = 'Enter a domain name';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    dohQuery(name, type)
      .then(function (data) {
        renderResults(data, type);
      })
      .catch(function (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      })
      .finally(function () {
        btn.disabled = false;
        loader.style.display = 'none';
      });
  }

  function checkEmailSecurity() {
    var name = document.getElementById('dns-name').value.trim();
    if (!name) return;

    var container = document.getElementById('dns-results');
    var statusEl = document.getElementById('dns-status');
    container.innerHTML = '';
    statusEl.textContent = '';

    var checks = [
      { label: 'SPF', query: name, type: 'TXT', filter: function (r) { return r.data.includes('v=spf1'); } },
      { label: 'DMARC', query: '_dmarc.' + name, type: 'TXT', filter: function (r) { return r.data.includes('v=DMARC1'); } },
      { label: 'MX', query: name, type: 'MX', filter: null },
      { label: 'DKIM (default selector)', query: 'default._domainkey.' + name, type: 'TXT', filter: null }
    ];

    var promises = checks.map(function (c) {
      return dohQuery(c.query, c.type).then(function (data) {
        var answers = data.Answer || [];
        if (c.filter) answers = answers.filter(c.filter);
        return { label: c.label, found: answers.length > 0, data: answers };
      }).catch(function () {
        return { label: c.label, found: false, data: [] };
      });
    });

    document.getElementById('dns-loader').style.display = 'inline';
    document.getElementById('dns-btn').disabled = true;

    Promise.all(promises).then(function (results) {
      statusEl.textContent = 'Email security check for ' + name;
      results.forEach(function (res) {
        var row = document.createElement('div');
        row.className = 'result mt-1';
        var icon = res.found ? '<span style="color:var(--success)">pass</span>' : '<span style="color:var(--error)">not found</span>';
        var records = res.data.map(function (a) {
          return '<div style="font-size:0.8rem;word-break:break-all;margin-top:0.25rem">' + formatData(a) + '</div>';
        }).join('');
        row.innerHTML = '<div class="result-label">' + res.label + ' &middot; ' + icon + '</div>' + records;
        container.appendChild(row);
      });
    }).finally(function () {
      document.getElementById('dns-loader').style.display = 'none';
      document.getElementById('dns-btn').disabled = false;
    });
  }

  function init() {
    document.getElementById('dns-btn').addEventListener('click', lookup);
    document.getElementById('email-check-btn').addEventListener('click', checkEmailSecurity);
    document.getElementById('dns-name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') lookup();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
