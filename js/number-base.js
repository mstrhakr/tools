(function () {
  'use strict';

  var BASES = [
    { name: 'Binary',      base: 2,  prefix: '0b' },
    { name: 'Octal',       base: 8,  prefix: '0o' },
    { name: 'Decimal',     base: 10, prefix: ''   },
    { name: 'Hexadecimal', base: 16, prefix: '0x' }
  ];

  function convert() {
    var raw = document.getElementById('base-input').value.trim();
    var fromSel = document.getElementById('base-from').value;
    var fromBase = fromSel === 'custom'
      ? parseInt(document.getElementById('base-from-custom').value, 10)
      : parseInt(fromSel, 10);
    var el = document.getElementById('base-results');

    if (!raw) return;

    // Strip common prefixes
    var val = raw.replace(/^0x/i, '').replace(/^0b/i, '').replace(/^0o/i, '');

    var decimal;
    try {
      decimal = parseInt(val, fromBase);
    } catch (e) {
      el.innerHTML = '<div class="text-error">Invalid input for base ' + fromBase + '</div>';
      return;
    }

    if (isNaN(decimal)) {
      el.innerHTML = '<div class="tool-section"><div class="text-error">Invalid input for base ' + fromBase + '</div></div>';
      return;
    }

    var html = '<div class="tool-section"><table class="conversion-table"><thead><tr><th>Base</th><th>Prefix</th><th>Value</th><th></th></tr></thead><tbody>';
    BASES.forEach(function (b) {
      var converted = decimal.toString(b.base).toUpperCase();
      var full = b.prefix + converted;
      html += '<tr>' +
        '<td>' + b.name + ' (' + b.base + ')</td>' +
        '<td style="color:var(--fg-muted)">' + (b.prefix || '—') + '</td>' +
        '<td id="base-' + b.base + '" style="font-weight:600;font-family:monospace">' + converted + '</td>' +
        '<td><button class="btn btn-secondary btn-sm" onclick="mtools.copyToClipboard(\'' + full + '\', \'Copied\')">copy</button></td>' +
        '</tr>';
    });
    html += '</tbody></table>';

    // Bit representation
    if (decimal >= 0 && decimal <= 0xFFFFFFFF) {
      var bits = decimal.toString(2).padStart(32, '0');
      var groups = bits.match(/.{1,8}/g).join(' ');
      html += '<div class="result mt-2"><div class="result-label">32-bit binary</div><div style="font-family:monospace;font-size:0.85rem;letter-spacing:0.05em;word-break:break-all">' + groups + '</div></div>';
    }

    html += '</div>';
    el.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-convert').addEventListener('click', convert);
    document.getElementById('base-input').addEventListener('input', convert);

    document.getElementById('base-from').addEventListener('change', function () {
      var wrap = document.getElementById('custom-base-wrap');
      wrap.style.display = this.value === 'custom' ? '' : 'none';
      convert();
    });
    document.getElementById('base-from-custom').addEventListener('input', convert);

    convert();
  });
})();
