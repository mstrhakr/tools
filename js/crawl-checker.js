(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function yesNo(ok) {
    return ok ? '<span class="text-success">yes</span>' : '<span class="text-error">no</span>';
  }

  function renderResource(title, r) {
    var html = '<div class="tool-section mt-2"><h2>' + esc(title) + '</h2>';
    html += '<div class="result"><div><strong>URL:</strong> ' + esc(r.url) + '</div>';
    html += '<div><strong>Status:</strong> ' + esc((r.status || 'n/a') + (r.status_code ? ' (' + r.status_code + ')' : '')) + '</div>';
    html += '<div><strong>Exists:</strong> ' + yesNo(r.exists) + '</div>';
    html += '<div><strong>Size:</strong> ' + esc(r.size_bytes || 0) + ' bytes</div>';
    if (r.error) {
      html += '<div class="text-error" style="margin-top:0.35rem">' + esc(r.error) + '</div>';
    }
    if (Array.isArray(r.hints) && r.hints.length) {
      html += '<div style="margin-top:0.5rem"><strong>Hints:</strong>';
      r.hints.forEach(function (h) {
        html += '<div style="font-size:0.82rem;word-break:break-word">' + esc(h) + '</div>';
      });
      html += '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function render(data) {
    var html = '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">Crawl score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.host) + '</div><div class="stat-label">Host</div></div>';
    html += '</div></div>';

    html += renderResource('robots.txt', data.robots || {});
    html += renderResource('sitemap.xml', data.sitemap || {});

    if (data.robots_raw) {
      html += '<div class="tool-section mt-2"><h2>robots.txt preview</h2>';
      html += '<pre style="white-space:pre-wrap;word-break:break-word;max-height:260px;overflow:auto">' + esc(data.robots_raw) + '</pre>';
      html += '</div>';
    }

    return html;
  }

  function run() {
    var host = document.getElementById('crawl-host').value.trim();
    var loader = document.getElementById('crawl-loader');
    var errEl = document.getElementById('crawl-error');
    var outEl = document.getElementById('crawl-results');
    var btn = document.getElementById('crawl-btn');

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

    fetch(API_BASE + '/api/crawlcheck?host=' + encodeURIComponent(host))
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (resp) {
        if (!resp.ok || resp.body.error) {
          throw new Error(resp.body.error || 'Crawl check failed');
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
    document.getElementById('crawl-btn').addEventListener('click', run);
    document.getElementById('crawl-host').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('crawl-host').value = 'example.com';
    run();
  });
})();