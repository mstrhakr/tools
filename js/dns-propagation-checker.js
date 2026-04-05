(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function rcodeText(code) {
    var map = { 0: 'NOERROR', 1: 'FORMERR', 2: 'SERVFAIL', 3: 'NXDOMAIN', 5: 'REFUSED' };
    return map[code] || ('RCODE ' + code);
  }

  function render(data) {
    var html = '<div class="tool-section"><h2>' + esc(data.domain) + ' (' + esc(data.type) + ')</h2></div>';
    (data.resolvers || []).forEach(function (resolver) {
      html += '<div class="tool-section mt-2">';
      html += '<h2>' + esc(resolver.resolver) + '</h2>';
      if (resolver.error) {
        html += '<div class="result"><span class="text-error">' + esc(resolver.error) + '</span></div>';
      } else {
        html += '<div class="result"><div class="text-muted">Status: ' + esc(rcodeText(resolver.status)) + '</div>';
        if (!resolver.records || !resolver.records.length) {
          html += '<div class="text-muted" style="margin-top:0.35rem">No records returned.</div>';
        } else {
          resolver.records.forEach(function (record) {
            html += '<div style="word-break:break-word;margin-top:0.35rem">' + esc(record) + '</div>';
          });
        }
        html += '</div>';
      }
      html += '</div>';
    });
    return html;
  }

  function run() {
    var domain = document.getElementById('dnsp-domain').value.trim();
    var type = document.getElementById('dnsp-type').value;
    var loader = document.getElementById('dnsp-loader');
    var errEl = document.getElementById('dnsp-error');
    var outEl = document.getElementById('dnsp-results');
    var btn = document.getElementById('btn-dnsp');

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

    fetch(API_BASE + '/api/dnsprop?domain=' + encodeURIComponent(domain) + '&type=' + encodeURIComponent(type))
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (resp) {
        if (!resp.ok || resp.body.error) {
          throw new Error(resp.body.error || 'Propagation check failed');
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
    document.getElementById('btn-dnsp').addEventListener('click', run);
    document.getElementById('dnsp-domain').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') run();
    });
    document.getElementById('dnsp-domain').value = 'example.com';
    run();
  });
})();