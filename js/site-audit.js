(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function passFail(v) {
    return v
      ? '<span class="text-success">pass</span>'
      : '<span class="text-error">fail</span>';
  }

  function render(data) {
    var html = '';
    html += '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">Audit score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.host) + '</div><div class="stat-label">Host</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem">' + esc(data.tls_version || 'N/A') + '</div><div class="stat-label">TLS version</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Transport</h2>';
    html += '<div class="result mt-1"><strong>HTTP status:</strong> ' + esc(data.http_status || 'N/A') + '</div>';
    html += '<div class="result mt-1"><strong>HTTPS status:</strong> ' + esc(data.https_status || 'N/A') + '</div>';
    html += '<div class="result mt-1"><strong>HTTP redirects to HTTPS:</strong> ' + passFail(data.redirects_to_https) + '</div>';
    html += '<div class="result mt-1"><strong>TLS cipher:</strong> ' + esc(data.cipher_suite || 'N/A') + '</div>';
    html += '<div class="result mt-1"><strong>Certificate:</strong> ' + (data.cert_expired ? '<span class="text-error">expired</span>' : '<span class="text-success">valid</span>') + ' (' + esc(data.cert_days_left) + ' days left)</div>';
    html += '</div>';

    html += '<div class="tool-section mt-2"><h2>Security Headers</h2>';
    html += '<div class="result mt-1"><strong>HSTS:</strong> ' + passFail(data.hsts) + '</div>';
    html += '<div class="result mt-1"><strong>CSP:</strong> ' + passFail(data.csp) + '</div>';
    html += '<div class="result mt-1"><strong>X-Content-Type-Options nosniff:</strong> ' + passFail(data.nosniff) + '</div>';
    html += '<div class="result mt-1"><strong>Frame protection:</strong> ' + passFail(data.frame_protection) + '</div>';
    html += '<div class="result mt-1"><strong>Referrer-Policy:</strong> ' + passFail(data.referrer_policy) + '</div>';
    html += '<div class="result mt-1"><strong>Permissions-Policy:</strong> ' + passFail(data.permissions_policy) + '</div>';
    html += '</div>';

    var notices = [data.http_security_error, data.https_connection_error, data.tls_inspection_error].filter(Boolean);
    if (notices.length) {
      html += '<div class="tool-section mt-2"><h2>Notices</h2><div class="result">';
      notices.forEach(function (n) {
        html += '<div class="text-muted">' + esc(n) + '</div>';
      });
      html += '</div></div>';
    }

    return html;
  }

  function run() {
    var host = document.getElementById('audit-host').value.trim();
    var loader = document.getElementById('audit-loader');
    var errEl = document.getElementById('audit-error');
    var outEl = document.getElementById('audit-results');
    var btn = document.getElementById('audit-btn');

    errEl.style.display = 'none';
    errEl.textContent = '';
    outEl.innerHTML = '';

    if (!host) {
      errEl.textContent = 'Enter a host or URL.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    fetch(API_BASE + '/api/siteaudit?host=' + encodeURIComponent(host))
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (resp) {
        if (!resp.ok || resp.body.error) {
          throw new Error(resp.body.error || 'Audit failed');
        }
        outEl.innerHTML = render(resp.body);
      })
      .catch(function (err) {
        errEl.textContent = err.message || 'Request failed.';
        errEl.style.display = 'block';
      })
      .finally(function () {
        btn.disabled = false;
        loader.style.display = 'none';
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('audit-btn').addEventListener('click', run);
    document.getElementById('audit-host').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('audit-host').value = 'example.com';
    run();
  });
})();