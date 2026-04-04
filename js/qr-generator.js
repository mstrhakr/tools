(function () {
  'use strict';

  function generate() {
    var text = document.getElementById('qr-input').value.trim();
    var size = Math.max(64, Math.min(1024, parseInt(document.getElementById('qr-size').value, 10) || 256));
    var ec = document.getElementById('qr-ec').value;
    var errorEl = document.getElementById('qr-error');
    var outputEl = document.getElementById('qr-output');
    var canvas = document.getElementById('qr-canvas');

    errorEl.style.display = 'none';

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
