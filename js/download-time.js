(function () {
  'use strict';

  // Size units to bytes
  var sizeFactors = {
    'KB': 1e3,
    'MB': 1e6,
    'GB': 1e9,
    'TB': 1e12
  };

  // Speed units to bytes per second
  var speedFactors = {
    'Kbps': 1e3 / 8,
    'Mbps': 1e6 / 8,
    'Gbps': 1e9 / 8,
    'KB/s': 1e3,
    'MB/s': 1e6,
    'GB/s': 1e9
  };

  function formatTime(seconds) {
    if (seconds < 0.001) return 'instant';
    if (!isFinite(seconds)) return 'forever';

    var d = Math.floor(seconds / 86400);
    var h = Math.floor((seconds % 86400) / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;

    var parts = [];
    if (d > 0) parts.push(d + 'd');
    if (h > 0) parts.push(h + 'h');
    if (m > 0) parts.push(m + 'm');
    if (s > 0 || parts.length === 0) {
      parts.push(s < 10 && parts.length > 0 ? s.toFixed(1) + 's' : Math.ceil(s) + 's');
    }
    return parts.join(' ');
  }

  function calculate() {
    var fileSize = parseFloat(document.getElementById('file-size').value);
    var sizeUnit = document.getElementById('size-unit').value;
    var speed = parseFloat(document.getElementById('speed-value').value);
    var speedUnit = document.getElementById('speed-unit').value;

    var resultEl = document.getElementById('time-result');
    var secondsEl = document.getElementById('time-seconds');

    if (isNaN(fileSize) || isNaN(speed) || fileSize < 0 || speed <= 0) {
      resultEl.textContent = '--';
      secondsEl.textContent = '';
      return;
    }

    var bytes = fileSize * sizeFactors[sizeUnit];
    var bytesPerSec = speed * speedFactors[speedUnit];
    var totalSeconds = bytes / bytesPerSec;

    resultEl.textContent = formatTime(totalSeconds);
    secondsEl.textContent = totalSeconds.toFixed(2) + ' seconds total';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var inputs = ['file-size', 'size-unit', 'speed-value', 'speed-unit'];
    inputs.forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', calculate);
    });
    calculate();
  });
})();
