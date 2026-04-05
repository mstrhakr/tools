(function () {
  'use strict';

  var NUMERALS = [
    { value: 1000, symbol: 'M' },
    { value: 900, symbol: 'CM' },
    { value: 500, symbol: 'D' },
    { value: 400, symbol: 'CD' },
    { value: 100, symbol: 'C' },
    { value: 90, symbol: 'XC' },
    { value: 50, symbol: 'L' },
    { value: 40, symbol: 'XL' },
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' }
  ];

  function toRoman(number) {
    if (!Number.isInteger(number) || number < 1 || number > 3999) {
      throw new Error('Decimal input must be an integer from 1 to 3999.');
    }

    var remaining = number;
    var output = '';
    NUMERALS.forEach(function (entry) {
      while (remaining >= entry.value) {
        output += entry.symbol;
        remaining -= entry.value;
      }
    });
    return output;
  }

  function fromRoman(roman) {
    var input = roman.toUpperCase();
    var index = 0;
    var total = 0;

    NUMERALS.forEach(function (entry) {
      while (input.slice(index, index + entry.symbol.length) === entry.symbol) {
        total += entry.value;
        index += entry.symbol.length;
      }
    });

    if (index !== input.length || toRoman(total) !== input) {
      throw new Error('Roman numeral input is not in canonical form.');
    }

    return total;
  }

  function render() {
    var raw = document.getElementById('roman-input').value.trim();
    var results = document.getElementById('roman-results');

    if (!raw) {
      results.innerHTML = '<div class="text-muted mt-2">Enter a decimal number or Roman numeral.</div>';
      return;
    }

    try {
      var decimal;
      var roman;

      if (/^\d+$/.test(raw)) {
        decimal = parseInt(raw, 10);
        roman = toRoman(decimal);
      } else if (/^[ivxlcdm]+$/i.test(raw)) {
        roman = raw.toUpperCase();
        decimal = fromRoman(roman);
        roman = toRoman(decimal);
      } else {
        throw new Error('Input must be decimal digits or Roman numeral letters.');
      }

      results.innerHTML = '<div class="stats-grid mt-2">' +
        '<div class="stat-item"><div class="stat-value">' + decimal + '</div><div class="stat-label">Decimal</div></div>' +
        '<div class="stat-item"><div class="stat-value">' + roman + '</div><div class="stat-label">Roman</div></div>' +
        '</div>';
    } catch (error) {
      results.innerHTML = '<div class="tool-section mt-2"><div class="text-error">' + window.mtools.escapeHtml(error.message || 'Unable to convert the value.') + '</div></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-roman').addEventListener('click', render);
    document.getElementById('roman-input').addEventListener('input', render);
    render();
  });
})();