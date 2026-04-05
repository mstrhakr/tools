(function () {
  'use strict';

  function absBigInt(value) {
    return value < 0n ? -value : value;
  }

  function gcd(a, b) {
    a = absBigInt(a);
    b = absBigInt(b);
    while (b !== 0n) {
      var remainder = a % b;
      a = b;
      b = remainder;
    }
    return a;
  }

  function lcm(a, b) {
    if (a === 0n || b === 0n) return 0n;
    return absBigInt((a / gcd(a, b)) * b);
  }

  function parseInput(raw) {
    var parts = raw.split(/[\s,]+/).filter(Boolean);
    if (!parts.length) throw new Error('Enter at least one integer.');
    return parts.map(function (part) {
      if (!/^-?\d+$/.test(part)) {
        throw new Error('Invalid integer: ' + part);
      }
      return BigInt(part);
    });
  }

  function calculate(values) {
    var currentGcd = values[0];
    var currentLcm = values[0];

    values.slice(1).forEach(function (value) {
      currentGcd = gcd(currentGcd, value);
      currentLcm = lcm(currentLcm, value);
    });

    return {
      gcd: absBigInt(currentGcd),
      lcm: absBigInt(currentLcm)
    };
  }

  function render() {
    var raw = document.getElementById('gcd-input').value.trim();
    var results = document.getElementById('gcd-results');

    if (!raw) {
      results.innerHTML = '<div class="text-muted mt-2">Results appear here after calculation.</div>';
      return;
    }

    try {
      var values = parseInput(raw);
      var computed = calculate(values);
      results.innerHTML = '<div class="stats-grid mt-2">' +
        '<div class="stat-item"><div class="stat-value">' + values.length + '</div><div class="stat-label">Values</div></div>' +
        '<div class="stat-item"><div class="stat-value">' + window.mtools.escapeHtml(computed.gcd.toString()) + '</div><div class="stat-label">GCD</div></div>' +
        '<div class="stat-item"><div class="stat-value">' + window.mtools.escapeHtml(computed.lcm.toString()) + '</div><div class="stat-label">LCM</div></div>' +
        '</div>' +
        '<div class="result"><div class="result-label">Normalized input</div><div class="result-value" style="font-size:1rem">' + window.mtools.escapeHtml(values.map(function (value) { return value.toString(); }).join(', ')) + '</div></div>';
    } catch (error) {
      results.innerHTML = '<div class="tool-section mt-2"><div class="text-error">' + window.mtools.escapeHtml(error.message || 'Unable to calculate values.') + '</div></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-gcd').addEventListener('click', render);
    document.getElementById('gcd-input').addEventListener('input', render);
    render();
  });
})();