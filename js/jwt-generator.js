(function () {
  'use strict';

  function toBase64Url(bytes) {
    var binary = '';
    Array.prototype.forEach.call(bytes, function (b) {
      binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function jsonToBase64Url(obj) {
    return toBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
  }

  function signHs256(input, secret) {
    var encoder = new TextEncoder();
    return crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(function (key) {
      return crypto.subtle.sign('HMAC', key, encoder.encode(input));
    }).then(function (sig) {
      return toBase64Url(new Uint8Array(sig));
    });
  }

  function generate() {
    var secret = document.getElementById('jwtg-secret').value;
    var expMinutes = parseInt(document.getElementById('jwtg-exp').value, 10) || 60;
    var payloadRaw = document.getElementById('jwtg-payload').value;
    var output = document.getElementById('jwtg-output');
    var status = document.getElementById('jwtg-status');

    if (!secret) {
      output.value = '';
      status.className = 'mt-2 text-error';
      status.textContent = 'Secret is required.';
      return;
    }

    var payload;
    try {
      payload = JSON.parse(payloadRaw || '{}');
    } catch (error) {
      output.value = '';
      status.className = 'mt-2 text-error';
      status.textContent = 'Payload must be valid JSON.';
      return;
    }

    var now = Math.floor(Date.now() / 1000);
    if (!payload.iat) payload.iat = now;
    if (!payload.exp) payload.exp = now + expMinutes * 60;

    var header = { alg: 'HS256', typ: 'JWT' };
    var encodedHeader = jsonToBase64Url(header);
    var encodedPayload = jsonToBase64Url(payload);
    var signingInput = encodedHeader + '.' + encodedPayload;

    signHs256(signingInput, secret).then(function (signature) {
      output.value = signingInput + '.' + signature;
      status.className = 'mt-2 text-success';
      status.textContent = 'JWT generated.';
    }).catch(function (error) {
      output.value = '';
      status.className = 'mt-2 text-error';
      status.textContent = error.message || 'Failed to sign JWT.';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('jwtg-payload').value = '{\n  "sub": "1234567890",\n  "name": "dev-user",\n  "role": "admin"\n}';
    document.getElementById('btn-jwtg-generate').addEventListener('click', generate);
    document.getElementById('jwtg-secret').addEventListener('input', generate);
    document.getElementById('jwtg-exp').addEventListener('input', generate);
    document.getElementById('jwtg-payload').addEventListener('input', generate);
    document.getElementById('btn-jwtg-copy').addEventListener('click', function () {
      var token = document.getElementById('jwtg-output').value;
      if (token) window.mtools.copyToClipboard(token, 'Copied JWT');
    });
    generate();
  });
})();