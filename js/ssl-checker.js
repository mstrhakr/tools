(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function lookup() {
    var host = document.getElementById('ssl-host').value.trim()
      .replace(/^https?:\/\//, '').split('/')[0];
    var errorEl = document.getElementById('ssl-error');
    var resultsEl = document.getElementById('ssl-results');
    var btn = document.getElementById('ssl-btn');
    var loader = document.getElementById('ssl-loader');

    errorEl.style.display = 'none';
    resultsEl.innerHTML = '';

    if (!host) {
      errorEl.textContent = 'Enter a hostname';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    fetch(API_BASE + '/api/ssl?host=' + encodeURIComponent(host))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          errorEl.textContent = data.error;
          errorEl.style.display = 'block';
          return;
        }
        renderResults(data);
      })
      .catch(function (err) {
        errorEl.textContent = 'Request failed: ' + err.message;
        errorEl.style.display = 'block';
      })
      .finally(function () {
        btn.disabled = false;
        loader.style.display = 'none';
      });
  }

  function renderResults(data) {
    var el = document.getElementById('ssl-results');

    // Connection info
    var connDiv = document.createElement('div');
    connDiv.className = 'result mt-1';
    connDiv.innerHTML =
      '<div class="result-label">connection</div>' +
      '<div>' + data.tls_version + ' &middot; ' + data.cipher_suite + '</div>';
    el.appendChild(connDiv);

    // Certs
    (data.certs || []).forEach(function (cert, i) {
      var row = document.createElement('div');
      row.className = 'result mt-1';
      var expColor = cert.expired ? 'var(--error)' : (cert.days_left < 30 ? 'var(--warning)' : 'var(--success)');
      var sans = cert.sans && cert.sans.length
        ? '<div class="result-label mt-1">SANs</div><div style="font-size:0.8rem">' + cert.sans.join(', ') + '</div>'
        : '';
      row.innerHTML =
        '<div class="result-label">certificate ' + (i + 1) + (i === 0 ? ' (leaf)' : ' (chain)') + '</div>' +
        '<div><strong>' + (cert.subject || 'n/a') + '</strong></div>' +
        '<div style="font-size:0.8rem;color:var(--fg-muted)">issued by: ' + (cert.issuer || 'n/a') + '</div>' +
        '<div style="font-size:0.8rem;margin-top:0.35rem">' +
          'expires <span style="color:' + expColor + '">' + cert.not_after + '</span>' +
          (cert.expired ? ' <strong style="color:var(--error)">[EXPIRED]</strong>'
            : ' (' + cert.days_left + ' days left)') +
        '</div>' +
        sans;
      el.appendChild(row);
    });
  }

  function init() {
    document.getElementById('ssl-btn').addEventListener('click', lookup);
    document.getElementById('ssl-host').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') lookup();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
