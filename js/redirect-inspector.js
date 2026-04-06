(function () {
  'use strict';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function render(data) {
    var html = '';
    html += '<div class="tool-section"><h2>Summary</h2><div class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.start_url) + '</div><div class="stat-label">Start URL</div></div>';
    html += '<div class="stat-item"><div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(data.final_url) + '</div><div class="stat-label">Final URL</div></div>';
    html += '<div class="stat-item"><div class="stat-value">' + esc(data.redirects) + '</div><div class="stat-label">Redirect hops</div></div>';
    html += '</div></div>';

    html += '<div class="tool-section mt-2"><h2>Chain</h2>';
    (data.chain || []).forEach(function (step, idx) {
      html += '<div class="result mt-1">';
      html += '<div class="result-label">Hop ' + (idx + 1) + '</div>';
      html += '<div style="word-break:break-word"><strong>URL:</strong> ' + esc(step.url) + '</div>';
      html += '<div><strong>Status:</strong> ' + esc(step.status_code + ' ' + step.status) + '</div>';
      if (step.location) {
        html += '<div style="word-break:break-word"><strong>Location:</strong> ' + esc(step.location) + '</div>';
      }
      html += '</div>';
    });

    if (data.stopped_by_limit) {
      html += '<div class="result mt-1"><span class="text-error">Stopped after max redirect limit.</span></div>';
    }
    html += '</div>';

    return html;
  }

  function run() {
    var input = document.getElementById('redir-url').value.trim();
    var loader = document.getElementById('redir-loader');
    var errEl = document.getElementById('redir-error');
    var outEl = document.getElementById('redir-results');
    var btn = document.getElementById('redir-btn');

    errEl.style.display = 'none';
    errEl.textContent = '';
    outEl.innerHTML = '';

    if (!input) {
      errEl.textContent = 'Enter a URL.';
      errEl.style.display = 'block';
      return;
    }

    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;

    btn.disabled = true;
    loader.style.display = 'inline';

    mtools.apiFetch('/api/redirects?url=' + encodeURIComponent(input))
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
    document.getElementById('redir-btn').addEventListener('click', run);
    document.getElementById('redir-url').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('redir-url').value = 'https://example.com';
    run();
  });
})();