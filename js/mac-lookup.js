(function () {
  'use strict';

  function normalizeMac(input) {
    // Strip separators and whitespace
    var cleaned = input.replace(/[:\-.\s]/g, '').toUpperCase();
    if (!/^[0-9A-F]{6,12}$/.test(cleaned)) return null;
    return cleaned.slice(0, 6);
  }

  function formatOUI(oui) {
    return oui.slice(0, 2) + ':' + oui.slice(2, 4) + ':' + oui.slice(4, 6);
  }

  function makeStatItem(label, value) {
    return '<div class="stat-item">' +
      '<div class="stat-value" style="font-size:1rem;word-break:break-all">' + (value || 'N/A') + '</div>' +
      '<div class="stat-label">' + label + '</div>' +
      '</div>';
  }

  function showError(msg) {
    var el = document.getElementById('mac-error');
    if (msg) {
      el.textContent = msg;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  function lookup() {
    var input = document.getElementById('mac-input').value;
    var results = document.getElementById('mac-results');
    showError('');
    results.innerHTML = '';

    var oui = normalizeMac(input);
    if (!oui) {
      showError('Invalid MAC address format. Enter at least 6 hex characters.');
      return;
    }

    // Using macvendors.co API (free, CORS-enabled)
    fetch('https://api.macvendors.com/' + formatOUI(oui))
      .then(function (res) {
        if (!res.ok) {
          if (res.status === 404) {
            showError('OUI not found in database');
          } else {
            showError('Lookup failed (HTTP ' + res.status + ')');
          }
          return null;
        }
        return res.text();
      })
      .then(function (vendor) {
        if (!vendor) return;
        var html = '';
        html += makeStatItem('OUI Prefix', formatOUI(oui));
        html += makeStatItem('Vendor / Manufacturer', vendor);
        html += makeStatItem('Input MAC', input.toUpperCase());
        results.innerHTML = html;
      })
      .catch(function () {
        showError('Request failed. Check your connection.');
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-lookup').addEventListener('click', lookup);
    document.getElementById('mac-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') lookup();
    });
  });
})();
