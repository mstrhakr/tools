(function () {
  'use strict';

  // All units defined as multipliers relative to bits
  var units = {
    'b':   { label: 'Bits (b)',          factor: 1 },
    'B':   { label: 'Bytes (B)',         factor: 8 },
    'KB':  { label: 'Kilobytes (KB)',    factor: 8 * 1e3 },
    'MB':  { label: 'Megabytes (MB)',    factor: 8 * 1e6 },
    'GB':  { label: 'Gigabytes (GB)',    factor: 8 * 1e9 },
    'TB':  { label: 'Terabytes (TB)',    factor: 8 * 1e12 },
    'PB':  { label: 'Petabytes (PB)',    factor: 8 * 1e15 },
    'KiB': { label: 'Kibibytes (KiB)',   factor: 8 * 1024 },
    'MiB': { label: 'Mebibytes (MiB)',   factor: 8 * Math.pow(1024, 2) },
    'GiB': { label: 'Gibibytes (GiB)',   factor: 8 * Math.pow(1024, 3) },
    'TiB': { label: 'Tebibytes (TiB)',   factor: 8 * Math.pow(1024, 4) },
    'Kb':  { label: 'Kilobits (Kb)',     factor: 1e3 },
    'Mb':  { label: 'Megabits (Mb)',     factor: 1e6 },
    'Gb':  { label: 'Gigabits (Gb)',     factor: 1e9 },
    'Tb':  { label: 'Terabits (Tb)',     factor: 1e12 }
  };

  function formatNumber(n) {
    if (n === 0) return '0';
    if (n >= 1e15 || (n > 0 && n < 0.0001)) return n.toExponential(4);
    // Show up to 6 significant digits, strip trailing zeros
    var s = n.toPrecision(6);
    if (s.indexOf('.') !== -1) {
      s = s.replace(/\.?0+$/, '');
    }
    return Number(s).toLocaleString('en-US', { maximumFractionDigits: 10 });
  }

  function convert() {
    var value = parseFloat(document.getElementById('value-input').value);
    var unit = document.getElementById('unit-select').value;
    var tbody = document.querySelector('#results-table tbody');

    if (isNaN(value) || value < 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-muted">Enter a valid positive number</td></tr>';
      return;
    }

    var bits = value * units[unit].factor;
    var rows = '';

    Object.keys(units).forEach(function (key) {
      var converted = bits / units[key].factor;
      var highlight = key === unit ? ' style="color:var(--accent)"' : '';
      rows += '<tr><td>' + units[key].label + '</td><td' + highlight + '>' + formatNumber(converted) + '</td></tr>';
    });

    tbody.innerHTML = rows;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('value-input').addEventListener('input', convert);
    document.getElementById('unit-select').addEventListener('change', convert);
    convert();
  });
})();
