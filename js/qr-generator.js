(function () {
  'use strict';

  var qrLibraryLoadPromise = null;
  var qrLibraryUrls = [
    'https://unpkg.com/qrcode@1.5.4/build/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.4/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js'
  ];

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = true;

      script.onload = function () {
        if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
          resolve();
          return;
        }
        reject(new Error('QR library did not initialize correctly'));
      };

      script.onerror = function () {
        reject(new Error('Failed to load ' + url));
      };

      document.head.appendChild(script);
    });
  }

  function ensureQRCodeLibrary() {
    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      return Promise.resolve();
    }

    if (qrLibraryLoadPromise) {
      return qrLibraryLoadPromise;
    }

    qrLibraryLoadPromise = new Promise(function (resolve, reject) {
      var index = 0;

      function tryNext() {
        if (index >= qrLibraryUrls.length) {
          reject(new Error('Could not load QR library from available CDNs'));
          return;
        }

        var nextUrl = qrLibraryUrls[index++];
        loadScript(nextUrl).then(resolve).catch(tryNext);
      }

      tryNext();
    }).catch(function (err) {
      qrLibraryLoadPromise = null;
      throw err;
    });

    return qrLibraryLoadPromise;
  }

  function generate() {
    var text = document.getElementById('qr-input').value.trim();
    var size = Math.max(64, Math.min(1024, parseInt(document.getElementById('qr-size').value, 10) || 256));
    var ec = document.getElementById('qr-ec').value;
    var errorEl = document.getElementById('qr-error');
    var outputEl = document.getElementById('qr-output');
    var canvas = document.getElementById('qr-canvas');

    errorEl.style.display = 'none';

    if (!window.QRCode || typeof window.QRCode.toCanvas !== 'function') {
      ensureQRCodeLibrary().then(generate).catch(function () {
        errorEl.textContent = 'Could not load the QR library. Check your connection and try again.';
        errorEl.style.display = 'block';
      });
      return;
    }

    if (!text) {
      errorEl.textContent = 'Enter text or a URL';
      errorEl.style.display = 'block';
      return;
    }

    QRCode.toCanvas(canvas, text, {
      width: size,
      errorCorrectionLevel: ec,
      color: {
        dark: document.documentElement.getAttribute('data-theme') === 'light' ? '#002b36' : '#839496',
        light: document.documentElement.getAttribute('data-theme') === 'light' ? '#fdf6e3' : '#002b36'
      }
    }, function (err) {
      if (err) {
        errorEl.textContent = 'QR generation failed: ' + err.message;
        errorEl.style.display = 'block';
        return;
      }
      outputEl.style.display = 'block';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureQRCodeLibrary().catch(function () {
      // Keep page interactive; error shown when user attempts generation.
    });

    document.getElementById('btn-generate').addEventListener('click', generate);

    document.getElementById('btn-download').addEventListener('click', function () {
      var canvas = document.getElementById('qr-canvas');
      if (!canvas.width) return;
      var link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });

    document.getElementById('qr-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); }
    });
  });
})();
