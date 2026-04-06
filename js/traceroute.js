(function () {
  'use strict';

  const input   = document.getElementById('trace-host');
  const btn     = document.getElementById('trace-btn');
  const loader  = document.getElementById('trace-loader');
  const errDiv  = document.getElementById('trace-error');
  const results = document.getElementById('trace-results');

  btn.addEventListener('click', trace);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') trace(); });

  function trace() {
    var host = input.value.trim();
    if (!host) { showError('Please enter a hostname or IP address.'); return; }
    errDiv.style.display = 'none';
    results.innerHTML = '';
    loader.style.display = 'inline';
    btn.disabled = true;

    mtools.apiFetch('/api/traceroute?host=' + encodeURIComponent(host))
      .then(render)
      .catch(function (err) { showError('Request failed: ' + err.message); })
      .finally(function () { loader.style.display = 'none'; btn.disabled = false; });
  }

  function render(data) {
    var hops = data.hops || [];
    if (hops.length === 0) { showError('No hops returned.'); return; }

    var html = '<div class="tool-section">';

    // Summary bar
    html += '<div style="margin-bottom:1rem;color:var(--fg-muted);font-size:0.875rem">';
    html += 'Target: <span style="color:var(--fg)">' + escHtml(data.host || '') + '</span>';
    if (data.ip) html += ' &nbsp;&rarr;&nbsp; <span style="color:var(--fg);font-family:monospace">' + escHtml(data.ip) + '</span>';
    html += ' &nbsp;|&nbsp; ' + hops.length + ' hop' + (hops.length !== 1 ? 's' : '');
    html += '</div>';

    html += '<table style="width:100%;border-collapse:collapse;font-size:0.875rem">';
    html += '<thead><tr style="border-bottom:1px solid var(--border)">';
    html += '<th style="text-align:right;padding:0.4rem 0.75rem;width:50px">#</th>';
    html += '<th style="text-align:left;padding:0.4rem 0.75rem">Host</th>';
    html += '<th style="text-align:right;padding:0.4rem 0.75rem">RTT 1</th>';
    html += '<th style="text-align:right;padding:0.4rem 0.75rem">RTT 2</th>';
    html += '<th style="text-align:right;padding:0.4rem 0.75rem">RTT 3</th>';
    html += '</tr></thead><tbody>';

    hops.forEach(function (hop) {
      var probes = hop.probes || [];
      var hostStr = (hop.host && hop.host !== '*') ? escHtml(hop.host) : '<span style="color:var(--fg-muted)">*</span>';
      var reached = hop.reached ? ' style="color:var(--green)"' : '';

      function fmtRtt(p) {
        if (!p || p.rtt_ms == null || p.rtt_ms < 0) return '<span style="color:var(--fg-muted)">*</span>';
        return p.rtt_ms.toFixed(2) + ' ms';
      }

      html += '<tr' + reached + ' style="border-bottom:1px solid var(--border)">';
      html += '<td style="text-align:right;padding:0.4rem 0.75rem;color:var(--fg-muted)">' + (hop.ttl || hop.hop || '') + '</td>';
      html += '<td style="padding:0.4rem 0.75rem;font-family:monospace">' + hostStr + '</td>';
      html += '<td style="text-align:right;padding:0.4rem 0.75rem;font-family:monospace">' + fmtRtt(probes[0]) + '</td>';
      html += '<td style="text-align:right;padding:0.4rem 0.75rem;font-family:monospace">' + fmtRtt(probes[1]) + '</td>';
      html += '<td style="text-align:right;padding:0.4rem 0.75rem;font-family:monospace">' + fmtRtt(probes[2]) + '</td>';
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
