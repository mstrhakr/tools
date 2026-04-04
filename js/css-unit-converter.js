(function () {
  'use strict';

  // All conversions go through px as the base unit
  function toPx(value, unit, base, vw, vh) {
    switch (unit) {
      case 'px':  return value;
      case 'rem': return value * base;
      case 'em':  return value * base;
      case 'pt':  return value * (96 / 72);
      case 'pc':  return value * (96 / 6);
      case 'vw':  return value * vw / 100;
      case 'vh':  return value * vh / 100;
      case 'cm':  return value * 37.7952755906;
      case 'mm':  return value * 3.77952755906;
      case 'in':  return value * 96;
    }
    return value;
  }

  function fromPx(px, unit, base, vw, vh) {
    switch (unit) {
      case 'px':  return px;
      case 'rem': return px / base;
      case 'em':  return px / base;
      case 'pt':  return px * (72 / 96);
      case 'pc':  return px * (6 / 96);
      case 'vw':  return px / vw * 100;
      case 'vh':  return px / vh * 100;
      case 'cm':  return px / 37.7952755906;
      case 'mm':  return px / 3.77952755906;
      case 'in':  return px / 96;
    }
    return px;
  }

  var UNITS = ['px', 'rem', 'em', 'pt', 'pc', 'vw', 'vh', 'cm', 'mm', 'in'];

  function round(n, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
  }

  function convert() {
    var value = parseFloat(document.getElementById('css-value').value);
    var fromUnit = document.getElementById('css-from').value;
    var base = parseFloat(document.getElementById('css-base-size').value) || 16;
    var vw = parseFloat(document.getElementById('css-viewport-w').value) || 1440;
    var vh = parseFloat(document.getElementById('css-viewport-h').value) || 900;
    var resultsEl = document.getElementById('css-results');

    if (isNaN(value)) return;

    var px = toPx(value, fromUnit, base, vw, vh);
    var html = '<div class="tool-section"><table class="conversion-table"><thead><tr><th>Unit</th><th>Value</th><th></th></tr></thead><tbody>';
    UNITS.forEach(function (unit) {
      var converted = fromPx(px, unit, base, vw, vh);
      var display = round(converted, 6);
      html += '<tr><td>' + unit + '</td><td id="res-' + unit + '">' + display + '</td>' +
        '<td><button class="btn btn-secondary btn-sm" onclick="mtools.copyToClipboard(\'' + display + unit + '\', \'Copied\')">copy</button></td></tr>';
    });
    html += '</tbody></table></div>';
    resultsEl.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-convert').addEventListener('click', convert);
    ['css-value', 'css-from', 'css-base-size', 'css-viewport-w', 'css-viewport-h'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', convert);
    });
    convert();
  });
})();
