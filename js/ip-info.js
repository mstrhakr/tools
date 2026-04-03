(function () {
  'use strict';

  function makeStatItem(label, value) {
    return '<div class="stat-item">' +
      '<div class="stat-value" style="font-size:1rem;word-break:break-all">' + (value || 'N/A') + '</div>' +
      '<div class="stat-label">' + label + '</div>' +
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

    // Using ip-api.com (free, no key needed, http only for free tier)
    var url = 'http://ip-api.com/json/' + (ip || '');
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (data.status === 'fail') {
          if (errorEl) {
            errorEl.textContent = data.message || 'Lookup failed';
            errorEl.style.display = 'block';
          }
          return;
        }
        renderIPInfo(data, resultsEl);
      })
      .catch(function (err) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
          errorEl.textContent = 'Request failed. This tool requires HTTP access to ip-api.com.';
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
