(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function lookup() {
    var ip = document.getElementById('rdns-input').value.trim();
    var errorEl = document.getElementById('rdns-error');
    var resultsEl = document.getElementById('rdns-results');
    var btn = document.getElementById('rdns-btn');
    var loader = document.getElementById('rdns-loader');

    errorEl.style.display = 'none';
    resultsEl.innerHTML = '';

    if (!ip) {
      errorEl.textContent = 'Enter an IP address';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    fetch(API_BASE + '/api/reversedns?ip=' + encodeURIComponent(ip))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          errorEl.textContent = data.error;
          errorEl.style.display = 'block';
          return;
        }
        var el = document.createElement('div');
        el.className = 'tool-section';
        var inner = '<div class="result-label">PTR records for ' + data.ip + '</div>';
        if (!data.hosts || data.hosts.length === 0) {
          inner += '<div class="text-muted mt-1">No PTR records found</div>';
        } else {
          data.hosts.forEach(function (h) {
            inner += '<div class="result mt-1" style="display:flex;align-items:center;justify-content:space-between">' +
              '<span>' + h + '</span>' +
              '<button class="btn btn-secondary btn-sm" onclick="mtools.copyToClipboard(\'' + h + '\', \'Copied\')">copy</button>' +
              '</div>';
          });
        }
        el.innerHTML = inner;
        resultsEl.appendChild(el);
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

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('rdns-btn').addEventListener('click', lookup);
    document.getElementById('rdns-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') lookup();
    });
  });
})();
