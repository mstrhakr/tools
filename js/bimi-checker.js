(function () {
  'use strict';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function state(ok) {
    return ok ? '<span class="text-success">present</span>' : '<span class="text-error">missing</span>';
  }

  function render(data) {
    var html = '';
    html += '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">BIMI score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.record_name) + '</div><div class="stat-label">Record name</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Record</h2>';
    html += '<div class="result mt-1"><strong>BIMI TXT:</strong> ' + state(data.record_found) + '</div>';
    if (data.record_value) {
      html += '<div class="result mt-1" style="word-break:break-word">' + esc(data.record_value) + '</div>';
    }
    html += '<div class="result mt-1"><strong>Version:</strong> ' + esc(data.version || 'N/A') + '</div>';
    html += '<div class="result mt-1"><strong>Logo URL (l=):</strong> ' + esc(data.logo_url || 'N/A') + '</div>';
    html += '<div class="result mt-1"><strong>VMC URL (a=):</strong> ' + esc(data.vmc_certificate || 'N/A') + '</div>';
    html += '</div>';

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
    var domain = document.getElementById('bimi-domain').value.trim();
    var selector = document.getElementById('bimi-selector').value.trim();
    var loader = document.getElementById('bimi-loader');
    var errEl = document.getElementById('bimi-error');
    var outEl = document.getElementById('bimi-results');
    var btn = document.getElementById('bimi-btn');

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

    mtools.apiFetch('/api/bimi?domain=' + encodeURIComponent(domain) + '&selector=' + encodeURIComponent(selector || 'default'))
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
    document.getElementById('bimi-btn').addEventListener('click', run);
    document.getElementById('bimi-domain').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('bimi-selector').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('bimi-domain').value = 'example.com';
    run();
  });
})();