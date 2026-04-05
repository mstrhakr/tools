(function () {
  'use strict';

  function bytesToBase64(bytes) {
    var binary = '';
    Array.prototype.forEach.call(bytes, function (b) {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  function base64ToBytes(base64) {
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function deriveKey(passphrase, salt, iterations) {
    var encoder = new TextEncoder();
    return crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    ).then(function (baseKey) {
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: iterations,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    });
  }

  function run() {
    var mode = document.getElementById('aes-mode').value;
    var passphrase = document.getElementById('aes-passphrase').value;
    var input = document.getElementById('aes-input').value;
    var iterations = parseInt(document.getElementById('aes-iterations').value, 10) || 150000;
    var output = document.getElementById('aes-output');
    var status = document.getElementById('aes-status');

    if (!passphrase) {
      status.className = 'mt-2 text-error';
      status.textContent = 'Passphrase is required.';
      output.value = '';
      return;
    }

    if (!input) {
      status.className = 'mt-2 text-muted';
      status.textContent = 'Enter input to process.';
      output.value = '';
      return;
    }

    if (mode === 'encrypt') {
      var salt = crypto.getRandomValues(new Uint8Array(16));
      var iv = crypto.getRandomValues(new Uint8Array(12));
      deriveKey(passphrase, salt, iterations).then(function (key) {
        return crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          new TextEncoder().encode(input)
        );
      }).then(function (cipherBuffer) {
        var token = [
          bytesToBase64(salt),
          bytesToBase64(iv),
          bytesToBase64(new Uint8Array(cipherBuffer))
        ].join(':');
        output.value = token;
        status.className = 'mt-2 text-success';
        status.textContent = 'Encrypted successfully.';
      }).catch(function (error) {
        output.value = '';
        status.className = 'mt-2 text-error';
        status.textContent = error.message || 'Encryption failed.';
      });
      return;
    }

    try {
      var parts = input.split(':');
      if (parts.length !== 3) throw new Error('Token must be salt:iv:ciphertext in Base64.');
      var saltBytes = base64ToBytes(parts[0]);
      var ivBytes = base64ToBytes(parts[1]);
      var cipherBytes = base64ToBytes(parts[2]);

      deriveKey(passphrase, saltBytes, iterations).then(function (key) {
        return crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivBytes },
          key,
          cipherBytes
        );
      }).then(function (plainBuffer) {
        output.value = new TextDecoder().decode(new Uint8Array(plainBuffer));
        status.className = 'mt-2 text-success';
        status.textContent = 'Decrypted successfully.';
      }).catch(function (error) {
        output.value = '';
        status.className = 'mt-2 text-error';
        status.textContent = error.message || 'Decryption failed. Check passphrase and token.';
      });
    } catch (error) {
      output.value = '';
      status.className = 'mt-2 text-error';
      status.textContent = error.message || 'Invalid token format.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-aes-run').addEventListener('click', run);
    document.getElementById('aes-mode').addEventListener('change', run);
    document.getElementById('aes-passphrase').addEventListener('input', run);
    document.getElementById('aes-input').addEventListener('input', run);
    document.getElementById('aes-iterations').addEventListener('input', run);
    document.getElementById('btn-aes-copy').addEventListener('click', function () {
      var val = document.getElementById('aes-output').value;
      if (val) window.mtools.copyToClipboard(val, 'Copied output');
    });
    run();
  });
})();