(function () {
  'use strict';

  // Security headers to call out specifically
  var SECURITY_HEADERS = [
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'X-XSS-Protection'
  ];

  function check() {
    var url = document.getElementById('headers-url').value.trim();
    var errorEl = document.getElementById('headers-error');
    var resultsEl = document.getElementById('headers-results');
    var btn = document.getElementById('headers-btn');
    var loader = document.getElementById('headers-loader');

    errorEl.style.display = 'none';
    resultsEl.innerHTML = '';

    if (!url) {
      errorEl.textContent = 'Enter a URL';
      errorEl.style.display = 'block';
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    btn.disabled = true;
    loader.style.display = 'inline';

    mtools.apiFetch('/api/headers?url=' + encodeURIComponent(url))
      .then(function (data) {
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
    var el = document.getElementById('headers-results');
    var e = window.mtools.escapeHtml;

    // Status
    var statusRow = document.createElement('div');
    statusRow.className = 'result mt-1';
    var statusColor = data.status_code < 400 ? 'var(--success)' : 'var(--error)';
    statusRow.innerHTML =
      '<div class="result-label">response</div>' +
      '<div style="color:' + statusColor + ';font-weight:700">' + e(data.status) + '</div>' +
      '<div style="font-size:0.8rem;color:var(--fg-muted)">' + e(data.url) + '</div>';
    el.appendChild(statusRow);

    // Security headers summary
    var secRow = document.createElement('div');
    secRow.className = 'result mt-1';
    secRow.innerHTML = '<div class="result-label">security headers</div>';
    SECURITY_HEADERS.forEach(function (h) {
      var found = Object.keys(data.headers).find(function (k) {
        return k.toLowerCase() === h.toLowerCase();
      });
      var val = found ? data.headers[found] : null;
      var icon = val
        ? '<span style="color:var(--success)">present</span>'
        : '<span style="color:var(--error)">missing</span>';
      secRow.innerHTML +=
        '<div style="font-size:0.82rem;margin-top:0.35rem">' +
          '<strong>' + e(h) + '</strong>: ' + icon +
          (val ? '<div style="font-size:0.78rem;color:var(--fg-muted);word-break:break-all">' + e(val) + '</div>' : '') +
        '</div>';
    });
    el.appendChild(secRow);

    // All headers
    var allRow = document.createElement('div');
    allRow.className = 'result mt-1';
    allRow.innerHTML = '<div class="result-label">all headers</div>';
    Object.keys(data.headers).sort().forEach(function (k) {
      allRow.innerHTML +=
        '<div style="margin-top:0.35rem;font-size:0.82rem">' +
          '<span style="color:var(--accent)">' + e(k) + '</span>: ' +
          '<span style="word-break:break-all">' + e(data.headers[k]) + '</span>' +
        '</div>';
    });
    el.appendChild(allRow);
  }

  function init() {
    document.getElementById('headers-btn').addEventListener('click', check);
    document.getElementById('headers-url').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') check();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
