(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function state(ok) {
    return ok ? '<span class="text-success">present</span>' : '<span class="text-error">missing</span>';
  }

  function render(data) {
    var html = '';
    html += '<div class="tool-section"><h2>Score</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.score + '/' + data.max_score) + '</div><div class="stat-label">MTA-STS score</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.domain) + '</div><div class="stat-label">Domain</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Configuration</h2>';
    html += '<div class="result mt-1"><strong>_mta-sts TXT:</strong> ' + state(data.policy_txt_found) + (data.policy_txt_value ? '<div style="font-size:0.82rem;word-break:break-word">' + esc(data.policy_txt_value) + '</div>' : '') + '</div>';
    html += '<div class="result mt-1"><strong>Policy file:</strong> ' + state(data.policy_file_found) + '<div style="font-size:0.82rem;word-break:break-word">' + esc(data.policy_file_url) + '</div></div>';
    html += '<div class="result mt-1"><strong>Policy version:</strong> ' + esc(data.policy_version || 'N/A') + '</div>';
    html += '<div class="result mt-1"><strong>Mode:</strong> ' + esc(data.policy_mode || 'N/A') + '</div>';
    html += '<div class="result mt-1"><strong>Max Age:</strong> ' + esc(data.policy_max_age || 'N/A') + '</div>';
    html += '</div>';

    if (Array.isArray(data.policy_mx_patterns) && data.policy_mx_patterns.length) {
      html += '<div class="tool-section mt-2"><h2>Policy MX Patterns</h2><div class="result">';
      data.policy_mx_patterns.forEach(function (mx) {
        html += '<div style="word-break:break-word">' + esc(mx) + '</div>';
      });
      html += '</div></div>';
    }

    if (Array.isArray(data.observations) && data.observations.length) {
      html += '<div class="tool-section mt-2"><h2>Observations</h2><div class="result">';
      data.observations.forEach(function (o) {
        html += '<div>' + esc(o) + '</div>';
      });
      html += '</div></div>';
    }

    return html;
  }

  function run() {
    var domain = document.getElementById('mts-domain').value.trim();
    var loader = document.getElementById('mts-loader');
    var errEl = document.getElementById('mts-error');
    var outEl = document.getElementById('mts-results');
    var btn = document.getElementById('mts-btn');

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

    fetch(API_BASE + '/api/mtasts?domain=' + encodeURIComponent(domain))
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (resp) {
        if (!resp.ok || resp.body.error) {
          throw new Error(resp.body.error || 'MTA-STS check failed');
        }
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
    document.getElementById('mts-btn').addEventListener('click', run);
    document.getElementById('mts-domain').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('mts-domain').value = 'example.com';
    run();
  });
})();