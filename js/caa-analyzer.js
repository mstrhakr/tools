(function () {
  'use strict';

  function esc(v) { return window.mtools.escapeHtml(v == null ? '' : String(v)); }

  function state(ok) {
    return ok ? '<span class="text-success">present</span>' : '<span class="text-error">missing</span>';
  }

  function render(data) {
    var html = '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">CAA score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.domain) + '</div><div class="stat-label">Domain</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Records</h2>';
    html += '<div class="result mt-1"><strong>CAA found:</strong> ' + state(data.record_found) + '</div>';
    if (Array.isArray(data.records) && data.records.length) {
      data.records.forEach(function (rec) {
        html += '<div class="result mt-1" style="word-break:break-word">' + esc(rec.raw) + '<div class="text-muted">TTL ' + esc(rec.ttl) + 's</div></div>';
      });
    }
    html += '</div>';

    function renderList(title, values) {
      if (!values || !values.length) return '';
      var block = '<div class="tool-section mt-2"><h2>' + esc(title) + '</h2><div class="result">';
      values.forEach(function (v) { block += '<div style="word-break:break-word">' + esc(v) + '</div>'; });
      block += '</div></div>';
      return block;
    }

    html += renderList('issue', data.issue_tags);
    html += renderList('issuewild', data.issuewild_tags);
    html += renderList('iodef', data.iodef_targets);

    if (Array.isArray(data.observations) && data.observations.length) {
      html += '<div class="tool-section mt-2"><h2>Observations</h2><div class="result">';
      data.observations.forEach(function (o) { html += '<div>' + esc(o) + '</div>'; });
      html += '</div></div>';
    }

    return html;
  }

  function run() {
    var domain = document.getElementById('caa-domain').value.trim();
    var loader = document.getElementById('caa-loader');
    var errEl = document.getElementById('caa-error');
    var outEl = document.getElementById('caa-results');
    var btn = document.getElementById('caa-btn');

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

    mtools.apiFetch('/api/caa?domain=' + encodeURIComponent(domain))
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
    document.getElementById('caa-btn').addEventListener('click', run);
    document.getElementById('caa-domain').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    document.getElementById('caa-domain').value = 'example.com';
  });
})();