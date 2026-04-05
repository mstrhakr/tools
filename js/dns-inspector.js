(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function listBlock(title, values) {
    var html = '<div class="tool-section mt-2"><h2>' + esc(title) + '</h2>';
    if (!values || !values.length) {
      html += '<div class="result text-muted">No records found.</div>';
    } else {
      html += '<div class="result">';
      values.forEach(function (v) {
        html += '<div style="word-break:break-word;margin:0.25rem 0">' + esc(v) + '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function render(data) {
    var html = '<div class="tool-section"><h2>Domain: ' + esc(data.domain) + '</h2></div>';
    html += listBlock('A', data.a);
    html += listBlock('AAAA', data.aaaa);
    html += listBlock('CNAME', data.cname ? [data.cname] : []);
    html += listBlock('NS', data.ns);
    html += listBlock('MX', data.mx);
    html += listBlock('TXT', data.txt);

    if (Array.isArray(data.errors) && data.errors.length) {
      html += '<div class="tool-section mt-2"><h2>Lookup notices</h2><div class="result">';
      data.errors.forEach(function (err) {
        html += '<div class="text-muted">' + esc(err) + '</div>';
      });
      html += '</div></div>';
    }

    html += '<div class="tool-section mt-2"><div class="btn-group">' +
      '<button class="btn btn-secondary btn-sm" id="dnsi-copy">Copy raw JSON</button>' +
      '</div></div>';
    return html;
  }

  function run() {
    var domain = document.getElementById('dnsi-domain').value.trim();
    var loader = document.getElementById('dnsi-loader');
    var errEl = document.getElementById('dnsi-error');
    var outEl = document.getElementById('dnsi-results');
    var btn = document.getElementById('btn-dnsi');

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

    fetch(API_BASE + '/api/dnsinspect?domain=' + encodeURIComponent(domain))
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (resp) {
        if (!resp.ok || resp.body.error) {
          throw new Error(resp.body.error || 'DNS inspect failed');
        }
        outEl.innerHTML = render(resp.body);
        var copyBtn = document.getElementById('dnsi-copy');
        if (copyBtn) {
          copyBtn.addEventListener('click', function () {
            window.mtools.copyToClipboard(JSON.stringify(resp.body, null, 2), 'Copied DNS JSON');
          });
        }
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
    document.getElementById('btn-dnsi').addEventListener('click', run);
    document.getElementById('dnsi-domain').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('dnsi-domain').value = 'example.com';
    run();
  });
})();