(function () {
  'use strict';

  function escText(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function generate() {
    var width = Math.max(1, parseInt(document.getElementById('svgp-width').value, 10) || 1200);
    var height = Math.max(1, parseInt(document.getElementById('svgp-height').value, 10) || 630);
    var fontSize = Math.max(1, parseInt(document.getElementById('svgp-font-size').value, 10) || 48);
    var bg = document.getElementById('svgp-bg').value;
    var fg = document.getElementById('svgp-fg').value;
    var text = document.getElementById('svgp-text').value.trim() || (width + 'x' + height);

    var svg = '' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
      '<rect width="100%" height="100%" fill="' + bg + '"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="' + fg + '" ' +
      'font-family="Consolas, Menlo, Monaco, monospace" font-size="' + fontSize + '">' + escText(text) + '</text>' +
      '</svg>';

    document.getElementById('svgp-output').value = svg;
    document.getElementById('svgp-preview').innerHTML = svg;
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['svgp-width', 'svgp-height', 'svgp-font-size', 'svgp-bg', 'svgp-fg', 'svgp-text'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', generate);
    });
    document.getElementById('btn-svgp-generate').addEventListener('click', generate);
    document.getElementById('btn-svgp-copy').addEventListener('click', function () {
      var out = document.getElementById('svgp-output').value;
      if (out) window.mtools.copyToClipboard(out, 'Copied SVG');
    });
    generate();
  });
})();