(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function state(ok) {
    return ok ? '<span class="text-success">present</span>' : '<span class="text-error">missing</span>';
  }

  function render(data) {
    var html = '';
    html += '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">TLS-RPT score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.record_name) + '</div><div class="stat-label">Record name</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Record</h2>';
    html += '<div class="result mt-1"><strong>TLS-RPT TXT:</strong> ' + state(data.record_found) + '</div>';
    if (data.record_value) {
      html += '<div class="result mt-1" style="word-break:break-word">' + esc(data.record_value) + '</div>';
    }
    html += '<div class="result mt-1"><strong>Version:</strong> ' + esc(data.version || 'N/A') + '</div>';
    html += '</div>';

    if (Array.isArray(data.report_uris) && data.report_uris.length) {
      html += '<div class="tool-section mt-2"><h2>Reporting URIs</h2><div class="result">';
      data.report_uris.forEach(function (u) {
        html += '<div style="word-break:break-word">' + esc(u) + '</div>';
      });
      html += '</div></div>';
    }

    if (Array.isArray(data.observations) && data.observations.length) {
      html += '<div class="tool-section mt-2"><h2>Observations</h2><div class="result">';
      data.observations.forEach(function (o) {
        html += '<div>' + esc(o) + '</div>';
      });
      html += '</div></div>';
    }

    return html;
  }

  function run() {
    var domain = document.getElementById('tlsrpt-domain').value.trim();
    var loader = document.getElementById('tlsrpt-loader');
    var errEl = document.getElementById('tlsrpt-error');
    var outEl = document.getElementById('tlsrpt-results');
    var btn = document.getElementById('tlsrpt-btn');

    errEl.style.display = 'none';
    errEl.textContent = '';
    outEl.innerHTML = '';

    if (!domain) {
      errEl.textContent = 'Enter a domain.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    fetch(API_BASE + '/api/tlsrpt?domain=' + encodeURIComponent(domain))
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (resp) {
        if (!resp.ok || resp.body.error) {
          throw new Error(resp.body.error || 'TLS-RPT check failed');
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
    document.getElementById('tlsrpt-btn').addEventListener('click', run);
    document.getElementById('tlsrpt-domain').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('tlsrpt-domain').value = 'example.com';
    run();
  });
})();