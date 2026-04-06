(function () {
  'use strict';

  function esc(v) { return window.mtools.escapeHtml(v == null ? '' : String(v)); }

  function state(ok) {
    return ok ? '<span class="text-success">present</span>' : '<span class="text-error">missing</span>';
  }

  function render(data) {
    var html = '';
    html += '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">DNSSEC score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.domain) + '</div><div class="stat-label">Domain</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.parent_zone) + '</div><div class="stat-label">Parent zone</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Delegation Signals</h2>';
    html += '<div class="result mt-1"><strong>DS records:</strong> ' + state(data.ds_found) + ' (' + esc(data.ds_count) + ')</div>';
    html += '<div class="result mt-1"><strong>DNSKEY records:</strong> ' + state(data.dnskey_found) + ' (' + esc(data.dnskey_count) + ')</div>';
    html += '</div>';

    if (Array.isArray(data.observations) && data.observations.length) {
      html += '<div class="tool-section mt-2"><h2>Observations</h2><div class="result">';
      data.observations.forEach(function (o) { html += '<div>' + esc(o) + '</div>'; });
      html += '</div></div>';
    }

    return html;
  }

  function run() {
    var domain = document.getElementById('dnssec-domain').value.trim();
    var loader = document.getElementById('dnssec-loader');
    var errEl = document.getElementById('dnssec-error');
    var outEl = document.getElementById('dnssec-results');
    var btn = document.getElementById('dnssec-btn');

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

    mtools.apiFetch('/api/dnssec?domain=' + encodeURIComponent(domain))
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
    document.getElementById('dnssec-btn').addEventListener('click', run);
    document.getElementById('dnssec-domain').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    document.getElementById('dnssec-domain').value = 'example.com';
  });
})();