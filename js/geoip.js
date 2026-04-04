(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function lookup() {
    var ip = document.getElementById('geoip-input').value.trim();
    var errorEl = document.getElementById('geoip-error');
    var resultsEl = document.getElementById('geoip-results');
    var btn = document.getElementById('geoip-btn');
    var loader = document.getElementById('geoip-loader');

    errorEl.style.display = 'none';
    resultsEl.innerHTML = '';

    if (!ip) {
      errorEl.textContent = 'Enter an IP address or hostname';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    fetch(API_BASE + '/api/geoip?ip=' + encodeURIComponent(ip))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          errorEl.textContent = data.error;
          errorEl.style.display = 'block';
          return;
        }
        if (data.status === 'fail') {
          errorEl.textContent = data.message || 'Lookup failed';
          errorEl.style.display = 'block';
          return;
        }
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

  function row(label, val) {
    if (!val && val !== 0) return '';
    return '<div class="result mt-1"><div class="result-label">' + label + '</div><div>' + val + '</div></div>';
  }

  function renderResults(d) {
    var el = document.getElementById('geoip-results');
    var flag = d.countryCode ? ' <span title="' + d.country + '">' + countryFlagEmoji(d.countryCode) + '</span>' : '';
    el.innerHTML =
      '<div class="tool-section">' +
      '<h2>IP: ' + d.query + flag + '</h2>' +
      '<div class="stats-grid">' +
      stat(d.country || '—', 'Country') +
      stat(d.regionName || '—', 'Region') +
      stat(d.city || '—', 'City') +
      stat(d.zip || '—', 'Postal code') +
      stat(d.timezone || '—', 'Timezone') +
      stat((d.lat !== undefined ? d.lat : '—'), 'Latitude') +
      stat((d.lon !== undefined ? d.lon : '—'), 'Longitude') +
      '</div>' +
      row('ISP', d.isp) +
      row('Organization', d.org) +
      row('AS', d.as) +
      '</div>';
  }

  function stat(val, label) {
    return '<div class="stat-item"><div class="stat-value" style="font-size:1rem">' + val + '</div><div class="stat-label">' + label + '</div></div>';
  }

  function countryFlagEmoji(code) {
    // Convert 2-letter ISO to regional indicator emoji
    return code.toUpperCase().split('').map(function (c) {
      return String.fromCodePoint(0x1F1E0 + c.charCodeAt(0) - 65);
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('geoip-btn').addEventListener('click', lookup);
    document.getElementById('geoip-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') lookup();
    });
  });
})();
