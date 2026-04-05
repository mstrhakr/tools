(function () {
  'use strict';

  function parseInteger(raw) {
    var value = raw.trim();
    if (!value) throw new Error('Both integer values are required.');
    return BigInt(value);
  }

  function formatValue(value) {
    return {
      decimal: value.toString(10),
      hex: '0x' + value.toString(16).toUpperCase(),
      binary: '0b' + value.toString(2)
    };
  }

  function operationRows(a, b, shift) {
    return [
      { label: 'A & B', value: a & b },
      { label: 'A | B', value: a | b },
      { label: 'A ^ B', value: a ^ b },
      { label: '~A', value: ~a },
      { label: '~B', value: ~b },
      { label: 'A << ' + shift.toString(), value: a << shift },
      { label: 'A >> ' + shift.toString(), value: a >> shift }
    ];
  }

  function render() {
    var results = document.getElementById('bitwise-results');

    try {
      var a = parseInteger(document.getElementById('bitwise-a').value);
      var b = parseInteger(document.getElementById('bitwise-b').value);
      var shift = BigInt(document.getElementById('bitwise-shift').value || '0');
      var rows = operationRows(a, b, shift).map(function (row) {
        var formatted = formatValue(row.value);
        return '<tr>' +
          '<td>' + row.label + '</td>' +
          '<td style="font-family:monospace">' + window.mtools.escapeHtml(formatted.decimal) + '</td>' +
          '<td style="font-family:monospace">' + window.mtools.escapeHtml(formatted.hex) + '</td>' +
          '<td style="font-family:monospace">' + window.mtools.escapeHtml(formatted.binary) + '</td>' +
          '</tr>';
      }).join('');

      results.innerHTML = '<table class="conversion-table mt-2"><thead><tr><th>Operation</th><th>Decimal</th><th>Hex</th><th>Binary</th></tr></thead><tbody>' + rows + '</tbody></table>';
    } catch (error) {
      results.innerHTML = '<div class="tool-section mt-2"><div class="text-error">' + window.mtools.escapeHtml(error.message || 'Unable to calculate bitwise operations.') + '</div></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-bitwise').addEventListener('click', render);
    document.getElementById('bitwise-a').addEventListener('input', render);
    document.getElementById('bitwise-b').addEventListener('input', render);
    document.getElementById('bitwise-shift').addEventListener('input', render);
    render();
  });
})();