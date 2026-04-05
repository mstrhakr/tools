(function () {
  'use strict';

  var INTERVAL = 30;
  var timerId = null;

  function base32ToBytes(value) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    var clean = value.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
    if (!clean) return new Uint8Array(0);

    var bits = '';
    for (var i = 0; i < clean.length; i++) {
      var idx = alphabet.indexOf(clean.charAt(i));
      if (idx === -1) throw new Error('Invalid Base32 secret.');
      bits += idx.toString(2).padStart(5, '0');
    }

    var bytes = [];
    for (var j = 0; j + 8 <= bits.length; j += 8) {
      bytes.push(parseInt(bits.slice(j, j + 8), 2));
    }
    return new Uint8Array(bytes);
  }

  function counterBytes(counter) {
    var out = new Uint8Array(8);
    var c = counter;
    for (var i = 7; i >= 0; i--) {
      out[i] = c & 0xff;
      c = Math.floor(c / 256);
    }
    return out;
  }

  function generateTotp(secretBytes, digits, epochSeconds) {
    var step = Math.floor(epochSeconds / INTERVAL);
    return crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    ).then(function (key) {
      return crypto.subtle.sign('HMAC', key, counterBytes(step));
    }).then(function (sig) {
      var hash = new Uint8Array(sig);
      var offset = hash[hash.length - 1] & 0x0f;
      var codeInt = ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);
      var mod = Math.pow(10, digits);
      var code = String(codeInt % mod).padStart(digits, '0');
      return { code: code, step: step };
    });
  }

  function tick() {
    var secret = document.getElementById('totp-secret').value.trim();
    var digits = parseInt(document.getElementById('totp-digits').value, 10);
    var status = document.getElementById('totp-status');
    var epoch = Math.floor(Date.now() / 1000);
    var remaining = INTERVAL - (epoch % INTERVAL);
    document.getElementById('totp-epoch').textContent = epoch.toString();
    document.getElementById('totp-remaining').textContent = remaining.toString();

    if (!secret) {
      document.getElementById('totp-code').textContent = '------';
      document.getElementById('totp-step').textContent = '--';
      status.className = 'mt-2 text-muted';
      status.textContent = 'Enter a Base32 secret.';
      return;
    }

    try {
      var secretBytes = base32ToBytes(secret);
      generateTotp(secretBytes, digits, epoch).then(function (result) {
        document.getElementById('totp-code').textContent = result.code;
        document.getElementById('totp-step').textContent = result.step.toString();
        status.className = 'mt-2 text-success';
        status.textContent = 'Code generated locally.';
      }).catch(function (error) {
        document.getElementById('totp-code').textContent = '------';
        status.className = 'mt-2 text-error';
        status.textContent = error.message || 'Failed to generate code.';
      });
    } catch (error) {
      document.getElementById('totp-code').textContent = '------';
      document.getElementById('totp-step').textContent = '--';
      status.className = 'mt-2 text-error';
      status.textContent = error.message || 'Invalid secret.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('totp-secret').addEventListener('input', tick);
    document.getElementById('totp-digits').addEventListener('change', tick);
    tick();
    timerId = setInterval(tick, 1000);
    window.addEventListener('beforeunload', function () {
      if (timerId) clearInterval(timerId);
    });
  });
})();