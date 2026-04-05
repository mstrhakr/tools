(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function render(data) {
    var html = '';
    html += '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">Header score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.status) + '</div><div class="stat-label">HTTP status</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.url) + '</div><div class="stat-label">URL</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Checks</h2>';
    (data.checks || []).forEach(function (check) {
      var state = check.present
        ? '<span class="text-success">present</span>'
        : '<span class="text-error">missing</span>';
      html += '<div class="result mt-1">';
      html += '<div class="result-label">' + esc(check.name) + ' - ' + state + '</div>';
      if (check.value) {
        html += '<div style="font-size:0.82rem;word-break:break-word;color:var(--fg-muted)">' + esc(check.value) + '</div>';
      }
      if (!check.present) {
        html += '<div style="margin-top:0.35rem">' + esc(check.recommendation) + '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function run() {
    var input = document.getElementById('hsa-url').value.trim();
    var loader = document.getElementById('hsa-loader');
    var errEl = document.getElementById('hsa-error');
    var outEl = document.getElementById('hsa-results');
    var btn = document.getElementById('hsa-btn');

    errEl.style.display = 'none';
    errEl.textContent = '';
    outEl.innerHTML = '';

    if (!input) {
      errEl.textContent = 'Enter a URL.';
      errEl.style.display = 'block';
      return;
    }
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;

    btn.disabled = true;
    loader.style.display = 'inline';

    fetch(API_BASE + '/api/httpsecurity?url=' + encodeURIComponent(input))
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (resp) {
        if (!resp.ok || resp.body.error) {
          throw new Error(resp.body.error || 'Security analysis failed');
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
    document.getElementById('hsa-btn').addEventListener('click', run);
    document.getElementById('hsa-url').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('hsa-url').value = 'https://example.com';
    run();
  });
})();