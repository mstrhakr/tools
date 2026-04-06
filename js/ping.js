(function () {
  'use strict';

  function ping() {
    var host = document.getElementById('ping-host').value.trim();
    var errorEl = document.getElementById('ping-error');
    var resultsEl = document.getElementById('ping-results');
    var btn = document.getElementById('ping-btn');
    var loader = document.getElementById('ping-loader');

    errorEl.style.display = 'none';
    resultsEl.innerHTML = '';

    if (!host) {
      errorEl.textContent = 'Enter a hostname or IP address';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    mtools.apiFetch('/api/ping?host=' + encodeURIComponent(host))
      .then(function (data) {
        var row = document.createElement('div');
        row.className = 'result mt-1';
        var e = window.mtools.escapeHtml;
        row.innerHTML =
          '<div class="result-label">result for ' + e(data.host) + '</div>' +
          (data.alive
            ? '<div class="result-value">' + e(String(data.latency)) + '</div>' +
              '<div style="font-size:0.85rem;color:var(--fg-muted)">reachable on port ' + e(String(data.port)) + '</div>'
            : '<div class="result-value" style="color:var(--error)">unreachable</div>');
        resultsEl.appendChild(row);
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

  function init() {
    document.getElementById('ping-btn').addEventListener('click', ping);
    document.getElementById('ping-host').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') ping();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
