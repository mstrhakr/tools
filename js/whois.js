(function () {
  'use strict';

  function lookup() {
    var query = document.getElementById('whois-input').value.trim();
    var errorEl = document.getElementById('whois-error');
    var resultsEl = document.getElementById('whois-results');
    var btn = document.getElementById('whois-btn');
    var loader = document.getElementById('whois-loader');

    errorEl.style.display = 'none';
    resultsEl.innerHTML = '';

    if (!query) {
      errorEl.textContent = 'Enter a domain or IP address';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    mtools.apiFetch('/api/whois?query=' + encodeURIComponent(query))
      .then(function (data) {
        var el = document.createElement('div');
        el.className = 'tool-section';
        el.innerHTML =
          '<h2>' + data.query + ' <span style="font-size:0.8rem;color:var(--fg-muted)">via ' + data.source + '</span></h2>' +
          '<div class="btn-group mb-2">' +
          '<button class="btn btn-secondary btn-sm" id="whois-copy-btn">Copy raw</button>' +
          '</div>' +
          '<pre style="white-space:pre-wrap;word-break:break-word;font-size:0.8rem;line-height:1.5;max-height:600px;overflow-y:auto" id="whois-raw">' +
          escapeHtml(data.raw) +
          '</pre>';
        resultsEl.appendChild(el);

        document.getElementById('whois-copy-btn').addEventListener('click', function () {
          mtools.copyToClipboard(data.raw, 'WHOIS copied');
        });
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

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('whois-btn').addEventListener('click', lookup);
    document.getElementById('whois-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') lookup();
    });
  });
})();
