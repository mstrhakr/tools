(function () {
  'use strict';

  var updating = false;

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length !== 6) return null;
    var n = parseInt(hex, 16);
    if (isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (c) {
      var h = clamp(Math.round(c), 0, 255).toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1/3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }

  function setAll(r, g, b, source) {
    if (updating) return;
    updating = true;

    var hex = rgbToHex(r, g, b);
    var hsl = rgbToHsl(r, g, b);

    document.getElementById('color-preview').style.backgroundColor = hex;

    if (source !== 'picker') document.getElementById('color-picker').value = hex;
    if (source !== 'hex') document.getElementById('hex-input').value = hex;
    if (source !== 'rgb') {
      document.getElementById('rgb-r').value = r;
      document.getElementById('rgb-g').value = g;
      document.getElementById('rgb-b').value = b;
    }
    if (source !== 'hsl') {
      document.getElementById('hsl-h').value = hsl.h;
      document.getElementById('hsl-s').value = hsl.s;
      document.getElementById('hsl-l').value = hsl.l;
    }

    updating = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Initial
    setAll(38, 139, 210, 'init');

    // Color picker
    document.getElementById('color-picker').addEventListener('input', function () {
      var rgb = hexToRgb(this.value);
      if (rgb) setAll(rgb.r, rgb.g, rgb.b, 'picker');
    });

    // Hex input
    document.getElementById('hex-input').addEventListener('input', function () {
      var rgb = hexToRgb(this.value);
      if (rgb) setAll(rgb.r, rgb.g, rgb.b, 'hex');
    });

    // RGB inputs
    ['rgb-r', 'rgb-g', 'rgb-b'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () {
        var r = parseInt(document.getElementById('rgb-r').value) || 0;
        var g = parseInt(document.getElementById('rgb-g').value) || 0;
        var b = parseInt(document.getElementById('rgb-b').value) || 0;
        setAll(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255), 'rgb');
      });
    });

    // HSL inputs
    ['hsl-h', 'hsl-s', 'hsl-l'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () {
        var h = parseInt(document.getElementById('hsl-h').value) || 0;
        var s = parseInt(document.getElementById('hsl-s').value) || 0;
        var l = parseInt(document.getElementById('hsl-l').value) || 0;
        var rgb = hslToRgb(clamp(h, 0, 360), clamp(s, 0, 100), clamp(l, 0, 100));
        setAll(rgb.r, rgb.g, rgb.b, 'hsl');
      });
    });

    // Copy buttons
    document.getElementById('copy-hex').addEventListener('click', function () {
      mtools.copyToClipboard(document.getElementById('hex-input').value, 'Hex copied');
    });
    document.getElementById('copy-rgb').addEventListener('click', function () {
      var r = document.getElementById('rgb-r').value;
      var g = document.getElementById('rgb-g').value;
      var b = document.getElementById('rgb-b').value;
      mtools.copyToClipboard('rgb(' + r + ', ' + g + ', ' + b + ')', 'RGB copied');
    });
    document.getElementById('copy-hsl').addEventListener('click', function () {
      var h = document.getElementById('hsl-h').value;
      var s = document.getElementById('hsl-s').value;
      var l = document.getElementById('hsl-l').value;
      mtools.copyToClipboard('hsl(' + h + ', ' + s + '%, ' + l + '%)', 'HSL copied');
    });
  });
})();
