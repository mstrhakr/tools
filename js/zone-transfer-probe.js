(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function esc(v) { return window.mtools.escapeHtml(v == null ? '' : String(v)); }

  function render(data) {
    var html = '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">Exposure score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem">' + (data.any_axfr_allowed ? '<span class="text-error">AXFR exposed</span>' : '<span class="text-success">no AXFR exposure found</span>') + '</div><div class="stat-label">Overall</div></div>';
    html += '</div></div>';

    if (Array.isArray(data.name_servers) && data.name_servers.length) {
      html += '<div class="tool-section mt-2"><h2>Nameserver Results</h2>';
      data.name_servers.forEach(function (ns) {
        html += '<div class="result mt-1">';
        html += '<div><strong>' + esc(ns.name_server) + '</strong> (' + esc(ns.ip || 'n/a') + ')</div>';
        html += '<div>TCP/53 reachable: ' + (ns.reachable_tcp_53 ? '<span class="text-success">yes</span>' : '<span class="text-error">no</span>') + '</div>';
        html += '<div>AXFR allowed: ' + (ns.axfr_allowed ? '<span class="text-error">yes</span>' : '<span class="text-success">no</span>') + '</div>';
        html += '<div class="text-muted">RCODE: ' + esc(ns.rcode) + '</div>';
        if (ns.error) html += '<div class="text-error">' + esc(ns.error) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (Array.isArray(data.observations) && data.observations.length) {
      html += '<div class="tool-section mt-2"><h2>Observations</h2><div class="result">';
      data.observations.forEach(function (o) { html += '<div>' + esc(o) + '</div>'; });
      html += '</div></div>';
    }

    return html;
  }

  function run() {
    var domain = document.getElementById('zx-domain').value.trim();
    var loader = document.getElementById('zx-loader');
    var errEl = document.getElementById('zx-error');
    var outEl = document.getElementById('zx-results');
    var btn = document.getElementById('zx-btn');

    errEl.style.display = 'none';
    errEl.textContent = '';
    outEl.innerHTML = '';

    if (!domain) {
      errEl.textContent = 'Enter a domain.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    fetch(API_BASE + '/api/zonexfer?domain=' + encodeURIComponent(domain))
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (resp) {
        if (!resp.ok || resp.body.error) throw new Error(resp.body.error || 'Zone transfer probe failed');
        outEl.innerHTML = render(resp.body);
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
    document.getElementById('zx-btn').addEventListener('click', run);
    document.getElementById('zx-domain').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    document.getElementById('zx-domain').value = 'example.com';
  });
})();