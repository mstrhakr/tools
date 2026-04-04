(function () {
  'use strict';

  function buildQrUrl(text, size, ec) {
    var params = new URLSearchParams();
    params.set('text', text);
    params.set('size', String(size));
    params.set('ecLevel', ec);
    params.set('format', 'png');
    params.set('margin', '2');
    return 'https://quickchart.io/qr?' + params.toString();
  }

  function generate() {
    var text = document.getElementById('qr-input').value.trim();
    var size = Math.max(64, Math.min(1024, parseInt(document.getElementById('qr-size').value, 10) || 256));
    var ec = document.getElementById('qr-ec').value;
    var errorEl = document.getElementById('qr-error');
    var outputEl = document.getElementById('qr-output');
    var img = document.getElementById('qr-image');

    errorEl.style.display = 'none';

    if (!text) {
      errorEl.textContent = 'Enter text or a URL';
      errorEl.style.display = 'block';
      return;
    }

    var url = buildQrUrl(text, size, ec);

    img.onload = function () {
      outputEl.style.display = 'block';
    };

    img.onerror = function () {
      errorEl.textContent = 'QR generation failed. Unable to load image from QR service.';
      errorEl.style.display = 'block';
      outputEl.style.display = 'none';
    };

    img.src = url;
    img.width = size;
    img.height = size;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-generate').addEventListener('click', generate);

    document.getElementById('btn-download').addEventListener('click', function () {
      var img = document.getElementById('qr-image');
      if (!img.src) return;
      var link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = img.src;
      link.target = '_blank';
      link.rel = 'noopener';
      link.click();
    });

    document.getElementById('qr-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); }
    });
  });
})();
