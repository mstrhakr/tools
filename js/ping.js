(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

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

    fetch(API_BASE + '/api/ping?host=' + encodeURIComponent(host))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          errorEl.textContent = data.error;
          errorEl.style.display = 'block';
          return;
        }

        var row = document.createElement('div');
        row.className = 'result mt-1';
        row.innerHTML =
          '<div class="result-label">result for ' + data.host + '</div>' +
          (data.alive
            ? '<div class="result-value">' + data.latency + '</div>' +
              '<div style="font-size:0.85rem;color:var(--fg-muted)">reachable on port ' + data.port + '</div>'
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
