(function () {
  'use strict';

  function shQuote(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
  }

  function parseHeaders(value) {
    return value.split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (line) {
        var idx = line.indexOf(':');
        if (idx === -1) throw new Error('Invalid header: ' + line);
        var key = line.slice(0, idx).trim();
        var val = line.slice(idx + 1).trim();
        if (!key) throw new Error('Invalid header key in line: ' + line);
        return key + ': ' + val;
      });
  }

  function build() {
    var method = document.getElementById('curl-method').value;
    var url = document.getElementById('curl-url').value.trim();
    var authType = document.getElementById('curl-auth-type').value;
    var authValue = document.getElementById('curl-auth-value').value.trim();
    var headersRaw = document.getElementById('curl-headers').value;
    var body = document.getElementById('curl-body').value;
    var output = document.getElementById('curl-output');
    var status = document.getElementById('curl-status');

    try {
      if (!url) throw new Error('URL is required.');
      var cmd = ['curl'];

      if (method !== 'GET') {
        cmd.push('-X', method);
      }

      var headers = parseHeaders(headersRaw);
      headers.forEach(function (h) {
        cmd.push('-H', shQuote(h));
      });

      if (authType === 'bearer' && authValue) {
        cmd.push('-H', shQuote('Authorization: Bearer ' + authValue));
      } else if (authType === 'basic' && authValue) {
        cmd.push('-u', shQuote(authValue));
      }

      if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(method) !== -1) {
        cmd.push('--data', shQuote(body));
      }

      cmd.push(shQuote(url));

      output.value = cmd.join(' ');
      status.className = 'mt-1 text-success';
      status.textContent = 'Command built.';
    } catch (error) {
      output.value = '';
      status.className = 'mt-1 text-error';
      status.textContent = error.message || 'Unable to build command.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('curl-url').value = 'https://api.example.com/v1/users';
    document.getElementById('curl-method').value = 'POST';
    document.getElementById('curl-headers').value = 'Content-Type: application/json\nAccept: application/json';
    document.getElementById('curl-body').value = '{"name":"alice"}';

    ['curl-method', 'curl-url', 'curl-auth-type', 'curl-auth-value', 'curl-headers', 'curl-body'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', build);
      document.getElementById(id).addEventListener('change', build);
    });
    document.getElementById('btn-curl-build').addEventListener('click', build);
    document.getElementById('btn-curl-copy').addEventListener('click', function () {
      var out = document.getElementById('curl-output').value;
      if (out) window.mtools.copyToClipboard(out, 'Copied cURL');
    });
    build();
  });
})();