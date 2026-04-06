(function () {
  'use strict';

  function scan() {
    var host = document.getElementById('ps-host').value.trim();
    var errorEl = document.getElementById('ps-error');
    var resultsEl = document.getElementById('ps-results');
    var btn = document.getElementById('ps-btn');
    var loader = document.getElementById('ps-loader');
    var summary = document.getElementById('ps-summary');

    errorEl.style.display = 'none';
    resultsEl.innerHTML = '';
    summary.textContent = '';

    if (!host) {
      errorEl.textContent = 'Enter a hostname or IP address';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    mtools.apiFetch('/api/portscan?host=' + encodeURIComponent(host))
      .then(function (data) {
        renderResults(data);
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

  function renderResults(data) {
    var el = document.getElementById('ps-results');
    var summaryEl = document.getElementById('ps-summary');

    var open = (data.ports || []).filter(function (p) { return p.open; });
    summaryEl.textContent = open.length + ' open port' + (open.length !== 1 ? 's' : '') +
      ' found on ' + data.host;

    var table = document.createElement('table');
    table.className = 'conversion-table mt-1';
    table.innerHTML =
      '<thead><tr><th>Port</th><th>Service</th><th>Status</th></tr></thead>';
    var tbody = document.createElement('tbody');

    (data.ports || []).forEach(function (p) {
      if (!p.open && document.getElementById('ps-open-only').checked) return;
      var tr = document.createElement('tr');
      var e = window.mtools.escapeHtml;
      tr.innerHTML =
        '<td>' + e(String(p.port)) + '</td>' +
        '<td>' + e(p.service) + '</td>' +
        '<td style="color:' + (p.open ? 'var(--success)' : 'var(--fg-muted)') + '">' +
          (p.open ? 'open' : 'closed') +
        '</td>';
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    el.appendChild(table);
  }

  function init() {
    document.getElementById('ps-btn').addEventListener('click', scan);
    document.getElementById('ps-host').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') scan();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
