(function () {
  'use strict';

  function bytesToHex(bytes) {
    return Array.prototype.map.call(bytes, function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function bytesToBase64(bytes) {
    var binary = '';
    Array.prototype.forEach.call(bytes, function (b) {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  function generate() {
    var algorithm = document.getElementById('hmac-alg').value;
    var encoding = document.getElementById('hmac-encoding').value;
    var keyText = document.getElementById('hmac-key').value;
    var message = document.getElementById('hmac-message').value;
    var output = document.getElementById('hmac-output');
    var status = document.getElementById('hmac-status');

    if (!keyText) {
      output.textContent = '--';
      status.className = 'mt-2 text-error';
      status.textContent = 'Secret key is required.';
      return;
    }

    var encoder = new TextEncoder();
    var keyData = encoder.encode(keyText);
    var msgData = encoder.encode(message);

    crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: algorithm },
      false,
      ['sign']
    ).then(function (key) {
      return crypto.subtle.sign('HMAC', key, msgData);
    }).then(function (signature) {
      var bytes = new Uint8Array(signature);
      var result = encoding === 'hex' ? bytesToHex(bytes) : bytesToBase64(bytes);
      output.textContent = result;
      status.className = 'mt-2 text-success';
      status.textContent = 'HMAC generated.';
    }).catch(function (error) {
      output.textContent = '--';
      status.className = 'mt-2 text-error';
      status.textContent = error.message || 'Failed to generate HMAC.';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-hmac').addEventListener('click', generate);
    document.getElementById('hmac-key').addEventListener('input', generate);
    document.getElementById('hmac-message').addEventListener('input', generate);
    document.getElementById('hmac-alg').addEventListener('change', generate);
    document.getElementById('hmac-encoding').addEventListener('change', generate);
    document.getElementById('btn-hmac-copy').addEventListener('click', function () {
      var val = document.getElementById('hmac-output').textContent;
      if (val && val !== '--') window.mtools.copyToClipboard(val, 'Copied HMAC');
    });
    generate();
  });
})();