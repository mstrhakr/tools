(function () {
  'use strict';

  function base64UrlDecode(str) {
    // Pad and convert base64url to standard base64
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    try {
      return atob(str);
    } catch (e) {
      return null;
    }
  }

  function tryParseJSON(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  function prettyJSON(obj) {
    return JSON.stringify(obj, null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
      .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>');
  }

  function formatTimestamp(ts) {
    if (!ts || typeof ts !== 'number') return null;
    var d = new Date(ts * 1000);
    return d.toUTCString() + ' (' + ts + ')';
  }

  function renderSection(id, label, content, isRaw) {
    var el = document.getElementById(id);
    var pre = el.querySelector('pre');
    var badge = el.querySelector('.jwt-label');
    badge.textContent = label;
    if (isRaw) {
      pre.textContent = content;
    } else {
      pre.innerHTML = content;
    }
    el.style.display = 'block';
  }

  function renderClaims(payload) {
    var container = document.getElementById('jwt-claims');
    container.innerHTML = '';
    var e = window.mtools.escapeHtml;
    var claimInfo = {
      iss: 'Issuer', sub: 'Subject', aud: 'Audience',
      exp: 'Expires', iat: 'Issued At', nbf: 'Not Before',
      jti: 'JWT ID'
    };
    Object.keys(payload).forEach(function (key) {
      var val = payload[key];
      var row = document.createElement('div');
      row.className = 'result mt-1';
      var label = claimInfo[key] ? claimInfo[key] + ' (' + key + ')' : key;
      var displayVal = (key === 'exp' || key === 'iat' || key === 'nbf')
        ? formatTimestamp(val) || val
        : (typeof val === 'object' ? JSON.stringify(val) : String(val));

      var expired = key === 'exp' && val && Date.now() / 1000 > val;
      row.innerHTML =
        '<div class="result-label">' + e(label) + (expired ? ' <span style="color:var(--error)">[EXPIRED]</span>' : '') + '</div>' +
        '<div style="word-break:break-all;font-size:0.875rem">' + e(String(displayVal)) + '</div>';
      container.appendChild(row);
    });
    document.getElementById('jwt-claims-section').style.display = 'block';
  }

  function decode() {
    var raw = document.getElementById('jwt-input').value.trim();
    var error = document.getElementById('jwt-error');
    error.style.display = 'none';

    ['jwt-header-section', 'jwt-payload-section', 'jwt-sig-section', 'jwt-claims-section'].forEach(function (id) {
      document.getElementById(id).style.display = 'none';
    });

    if (!raw) return;

    var parts = raw.split('.');
    if (parts.length !== 3) {
      error.textContent = 'Invalid JWT: expected 3 parts separated by dots';
      error.style.display = 'block';
      return;
    }

    var headerRaw = base64UrlDecode(parts[0]);
    var payloadRaw = base64UrlDecode(parts[1]);

    if (!headerRaw || !payloadRaw) {
      error.textContent = 'Failed to base64url-decode JWT parts';
      error.style.display = 'block';
      return;
    }

    var header = tryParseJSON(headerRaw);
    var payload = tryParseJSON(payloadRaw);

    if (header) {
      renderSection('jwt-header-section', 'header', prettyJSON(header), false);
    }
    if (payload) {
      renderSection('jwt-payload-section', 'payload', prettyJSON(payload), false);
      renderClaims(payload);
    }
    renderSection('jwt-sig-section', 'signature (base64url)', parts[2], true);
  }

  function init() {
    document.getElementById('jwt-input').addEventListener('input', decode);
    document.getElementById('clear-btn').addEventListener('click', function () {
      document.getElementById('jwt-input').value = '';
      decode();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
