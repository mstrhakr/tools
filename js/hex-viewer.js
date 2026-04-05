(function () {
  'use strict';

  function parseHexInput(input) {
    var cleaned = input.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
    if (!cleaned.length) return new Uint8Array(0);
    if (cleaned.length % 2 !== 0) {
      throw new Error('Hex input must contain an even number of digits.');
    }

    var bytes = new Uint8Array(cleaned.length / 2);
    for (var i = 0; i < cleaned.length; i += 2) {
      bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
    }
    return bytes;
  }

  function toAscii(byte) {
    return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
  }

  function toHexDump(bytes) {
    if (!bytes.length) return 'No data yet.';
    var lines = [];
    for (var offset = 0; offset < bytes.length; offset += 16) {
      var chunk = bytes.slice(offset, offset + 16);
      var hex = Array.prototype.map.call(chunk, function (b) {
        return b.toString(16).padStart(2, '0').toUpperCase();
      });
      while (hex.length < 16) hex.push('  ');
      var left = offset.toString(16).padStart(8, '0').toUpperCase();
      var groupedHex = hex.slice(0, 8).join(' ') + '  ' + hex.slice(8).join(' ');
      var ascii = Array.prototype.map.call(chunk, toAscii).join('');
      lines.push(left + '  ' + groupedHex + '  |' + ascii.padEnd(16, ' ') + '|');
    }
    return lines.join('\n');
  }

  function render() {
    var mode = document.getElementById('hex-input-mode').value;
    var input = document.getElementById('hex-input').value;
    var status = document.getElementById('hex-status');
    var dump = document.getElementById('hex-dump');
    var outputText = document.getElementById('hex-output-text');

    try {
      var bytes;
      if (mode === 'text') {
        bytes = new TextEncoder().encode(input);
      } else {
        bytes = parseHexInput(input);
      }

      dump.textContent = toHexDump(bytes);
      outputText.value = new TextDecoder().decode(bytes);
      status.className = 'mt-2 text-success';
      status.textContent = bytes.length.toLocaleString() + ' bytes rendered.';
    } catch (error) {
      dump.textContent = 'No data yet.';
      outputText.value = '';
      status.className = 'mt-2 text-error';
      status.textContent = error.message || 'Unable to parse input.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-hex-render').addEventListener('click', render);
    document.getElementById('hex-input').addEventListener('input', render);
    document.getElementById('hex-input-mode').addEventListener('change', render);
    render();
  });
})();