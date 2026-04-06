(function () {
  'use strict';

  const input   = document.getElementById('dnsbl-input');
  const btn     = document.getElementById('dnsbl-btn');
  const loader  = document.getElementById('dnsbl-loader');
  const errDiv  = document.getElementById('dnsbl-error');
  const results = document.getElementById('dnsbl-results');

  btn.addEventListener('click', check);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });

  function check() {
    const ip = input.value.trim();
    if (!ip) { showError('Please enter an IPv4 address.'); return; }
    errDiv.style.display = 'none';
    results.innerHTML = '';
    loader.style.display = 'inline';
    btn.disabled = true;

    mtools.apiFetch('/api/dnsbl?ip=' + encodeURIComponent(ip))
      .then(render)
      .catch(function (err) { showError('Request failed: ' + err.message); })
      .finally(function () { loader.style.display = 'none'; btn.disabled = false; });
  }

  function render(data) {
    var listedCount  = data.listed_count  || 0;
    var checkedCount = data.checked_count || 0;
    var entries      = data.entries || [];

    var badgeColor = listedCount === 0 ? 'var(--green)' : 'var(--red)';
    var badgeText  = listedCount === 0
      ? 'Clean — not listed on any checked blacklist'
      : 'Listed on ' + listedCount + ' of ' + checkedCount + ' blacklists';

    var html = '<div class="tool-section">';
    html += '<div style="padding:0.75rem 1rem;border-radius:6px;border:1px solid ' + badgeColor + ';color:' + badgeColor + ';font-weight:600;margin-bottom:1rem">' + escHtml(badgeText) + '</div>';

    html += '<table style="width:100%;border-collapse:collapse;font-size:0.9rem">';
    html += '<thead><tr style="border-bottom:1px solid var(--border)">';
    html += '<th style="text-align:left;padding:0.5rem">Blacklist Zone</th>';
    html += '<th style="text-align:center;padding:0.5rem;width:80px">Status</th>';
    html += '<th style="text-align:left;padding:0.5rem">Response</th>';
    html += '</tr></thead><tbody>';

    entries.forEach(function (entry) {
      var statusColor = entry.listed ? 'var(--red)' : 'var(--green)';
      var statusText  = entry.listed ? 'LISTED' : 'clean';
      var response    = entry.listed ? (entry.addresses ? entry.addresses.join(', ') : 'listed') : '—';
      html += '<tr style="border-bottom:1px solid var(--border)">';
      html += '<td style="padding:0.5rem;font-family:monospace">' + escHtml(entry.zone || entry.list || '') + '</td>';
      html += '<td style="padding:0.5rem;text-align:center;color:' + statusColor + ';font-weight:600">' + statusText + '</td>';
      html += '<td style="padding:0.5rem;color:var(--fg-muted);font-family:monospace;font-size:0.8rem">' + escHtml(response) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    results.innerHTML = html;
  }

  function showError(msg) {
    errDiv.textContent = msg;
    errDiv.style.display = 'block';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
