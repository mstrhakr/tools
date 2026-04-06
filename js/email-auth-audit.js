(function () {
  'use strict';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function badge(ok) {
    return ok ? '<span class="text-success">present</span>' : '<span class="text-error">missing</span>';
  }

  function render(data) {
    var html = '';
    html += '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">Email auth score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.domain) + '</div><div class="stat-label">Domain</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Checks</h2>';
    html += '<div class="result mt-1"><strong>MX:</strong> ' + badge(data.mx_found) + '</div>';
    html += '<div class="result mt-1"><strong>SPF:</strong> ' + badge(data.spf_found) + (data.spf_record ? '<div style="font-size:0.82rem;word-break:break-word">' + esc(data.spf_record) + '</div>' : '') + '</div>';
    html += '<div class="result mt-1"><strong>DMARC:</strong> ' + badge(data.dmarc_found) + (data.dmarc_record ? '<div style="font-size:0.82rem;word-break:break-word">' + esc(data.dmarc_record) + '</div>' : '') + '</div>';
    html += '<div class="result mt-1"><strong>DKIM (selector ' + esc(data.dkim_selector) + '):</strong> ' + badge(data.dkim_found) + (data.dkim_record ? '<div style="font-size:0.82rem;word-break:break-word">' + esc(data.dkim_record) + '</div>' : '') + '</div>';
    html += '</div>';

    if (Array.isArray(data.mx_records) && data.mx_records.length) {
      html += '<div class="tool-section mt-2"><h2>MX Records</h2><div class="result">';
      data.mx_records.forEach(function (mx) {
        html += '<div style="word-break:break-word">' + esc(mx) + '</div>';
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
    var domain = document.getElementById('ema-domain').value.trim();
    var loader = document.getElementById('ema-loader');
    var errEl = document.getElementById('ema-error');
    var outEl = document.getElementById('ema-results');
    var btn = document.getElementById('ema-btn');

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

    mtools.apiFetch('/api/emailaudit?domain=' + encodeURIComponent(domain))
      .then(function (data) {
        outEl.innerHTML = render(data);
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
    document.getElementById('ema-btn').addEventListener('click', run);
    document.getElementById('ema-domain').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('ema-domain').value = 'example.com';
    run();
  });
})();