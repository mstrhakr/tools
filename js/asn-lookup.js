(function () {
  'use strict';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function makeStatItem(label, value) {
    return '<div class="stat-item">' +
      '<div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(value || 'N/A') + '</div>' +
      '<div class="stat-label">' + esc(label) + '</div>' +
      '</div>';
  }

  function render(data) {
    var html = '<div class="tool-section"><h2>ASN Summary</h2><div class="stats-grid">';
    html += makeStatItem('IP', data.ip);
    html += makeStatItem('ASN', data.asn ? ('AS' + data.asn) : 'N/A');
    html += makeStatItem('ASN Name', data.asn_name);
    html += makeStatItem('Description', data.description);
    html += makeStatItem('Prefix', data.prefix);
    html += makeStatItem('RIR', data.rir_name);
    html += makeStatItem('Allocation', data.allocation_status);
    html += makeStatItem('Country', (data.country_code || '') + (data.country_name ? (' - ' + data.country_name) : ''));
    html += '</div></div>';
    return html;
  }

  function run() {
    var ip = document.getElementById('asn-ip').value.trim();
    var loader = document.getElementById('asn-loader');
    var errEl = document.getElementById('asn-error');
    var outEl = document.getElementById('asn-results');
    var btn = document.getElementById('btn-asn');

    errEl.style.display = 'none';
    errEl.textContent = '';
    outEl.innerHTML = '';

    if (!ip) {
      errEl.textContent = 'Enter an IP address.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    mtools.apiFetch('/api/asn?ip=' + encodeURIComponent(ip))
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
    document.getElementById('btn-asn').addEventListener('click', run);
    document.getElementById('asn-ip').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('asn-ip').value = '1.1.1.1';
    run();
  });
})();