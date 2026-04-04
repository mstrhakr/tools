(function () {
  'use strict';

  // Route through our own backend so the browser never makes a plaintext HTTP
  // request directly to ip-api.com. The backend handles the ip-api.com call
  // server-side and returns the same JSON structure.
  var API_BASE = 'https://api.tools.mstrhakr.com';

  function makeStatItem(label, value) {
    var e = window.mtools.escapeHtml;
    return '<div class="stat-item">' +
      '<div class="stat-value" style="font-size:1rem;word-break:break-all">' + e(value || 'N/A') + '</div>' +
      '<div class="stat-label">' + e(label) + '</div>' +
      '</div>';
  }

  function renderIPInfo(data, targetEl) {
    var html = '';
    html += makeStatItem('IP Address', data.ip || data.query);
    html += makeStatItem('City', data.city);
    html += makeStatItem('Region', data.regionName || data.region);
    html += makeStatItem('Country', data.country || data.countryCode);
    html += makeStatItem('Timezone', data.timezone);
    html += makeStatItem('ISP', data.isp || data.org);
    html += makeStatItem('AS', data.as);
    if (data.lat && data.lon) {
      html += makeStatItem('Coordinates', data.lat + ', ' + data.lon);
    }
    targetEl.innerHTML = html;
  }

  function lookupIP(ip, resultsEl, errorEl, loadingEl) {
    if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
    if (loadingEl) loadingEl.style.display = 'block';
    resultsEl.innerHTML = '';

    var url = API_BASE + '/api/geoip?ip=' + encodeURIComponent(ip || 'self');
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (data.error || data.status === 'fail') {
          if (errorEl) {
            errorEl.textContent = data.message || data.error || 'Lookup failed';
            errorEl.style.display = 'block';
          }
          return;
        }
        renderIPInfo(data, resultsEl);
      })
      .catch(function () {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
          errorEl.textContent = 'Request failed.';
          errorEl.style.display = 'block';
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var resultsEl = document.getElementById('ip-results');
    var loadingEl = document.getElementById('ip-loading');
    var errorEl = document.getElementById('ip-error');

    // Auto-lookup on load
    lookupIP('', resultsEl, errorEl, loadingEl);

    document.getElementById('btn-lookup').addEventListener('click', function () {
      lookupIP('', resultsEl, errorEl, loadingEl);
    });

    document.getElementById('btn-lookup-custom').addEventListener('click', function () {
      var ip = document.getElementById('custom-ip').value.trim();
      if (!ip) return;
      lookupIP(ip, document.getElementById('custom-results'), document.getElementById('custom-error'), null);
    });

    document.getElementById('custom-ip').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        document.getElementById('btn-lookup-custom').click();
      }
    });
  });
})();
