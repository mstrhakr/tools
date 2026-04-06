(function () {
  'use strict';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function state(ok) {
    return ok ? '<span class="text-success">found</span>' : '<span class="text-error">not found</span>';
  }

  function render(data) {
    var html = '';
    html += '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">DANE score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.query_name) + '</div><div class="stat-label">TLSA owner name</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Result</h2>';
    html += '<div class="result mt-1"><strong>DNS status:</strong> ' + esc(data.dns_status) + '</div>';
    html += '<div class="result mt-1"><strong>TLSA records:</strong> ' + state(data.tlsa_found) + '</div>';
    html += '</div>';

    if (Array.isArray(data.tlsa_records) && data.tlsa_records.length) {
      html += '<div class="tool-section mt-2"><h2>TLSA Records</h2><div class="result">';
      data.tlsa_records.forEach(function (rec) {
        html += '<div style="word-break:break-word;margin-bottom:0.5rem">' + esc(rec.data) + '<div class="text-muted">TTL ' + esc(rec.ttl) + 's</div></div>';
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
    var host = document.getElementById('dane-host').value.trim();
    var port = document.getElementById('dane-port').value.trim();
    var protocol = document.getElementById('dane-proto').value;
    var loader = document.getElementById('dane-loader');
    var errEl = document.getElementById('dane-error');
    var outEl = document.getElementById('dane-results');
    var btn = document.getElementById('dane-btn');

    errEl.style.display = 'none';
    errEl.textContent = '';
    outEl.innerHTML = '';

    if (!host) {
      errEl.textContent = 'Enter a host.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    var url = '/api/dane?host=' + encodeURIComponent(host) + '&port=' + encodeURIComponent(port || '25') + '&protocol=' + encodeURIComponent(protocol || 'tcp');
    mtools.apiFetch(url)
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
    document.getElementById('dane-btn').addEventListener('click', run);
    document.getElementById('dane-host').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    document.getElementById('dane-host').value = 'example.com';
  });
})();