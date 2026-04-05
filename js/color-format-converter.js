(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function rgbToHex(r, g, b) {
    function toHex(v) {
      return v.toString(16).padStart(2, '0').toUpperCase();
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0;
    var l = (max + min) / 2;
    var d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r: h = 60 * (((g - b) / d) % 6); break;
        case g: h = 60 * ((b - r) / d + 2); break;
        default: h = 60 * ((r - g) / d + 4); break;
      }
      if (h < 0) h += 360;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d !== 0) {
      switch (max) {
        case r: h = 60 * (((g - b) / d) % 6); break;
        case g: h = 60 * ((b - r) / d + 2); break;
        default: h = 60 * ((r - g) / d + 4); break;
      }
      if (h < 0) h += 360;
    }
    var s = max === 0 ? 0 : d / max;
    return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(max * 100) };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;

    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r1 = 0, g1 = 0, b1 = 0;

    if (h < 60) { r1 = c; g1 = x; }
    else if (h < 120) { r1 = x; g1 = c; }
    else if (h < 180) { g1 = c; b1 = x; }
    else if (h < 240) { g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; b1 = c; }
    else { r1 = c; b1 = x; }

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    v /= 100;

    var c = v * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = v - c;
    var r1 = 0, g1 = 0, b1 = 0;

    if (h < 60) { r1 = c; g1 = x; }
    else if (h < 120) { r1 = x; g1 = c; }
    else if (h < 180) { g1 = c; b1 = x; }
    else if (h < 240) { g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; b1 = c; }
    else { r1 = c; b1 = x; }

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  function parseColor(input) {
    var value = input.trim();
    var match;

    if ((match = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/))) {
      var hex = match[1].length === 3
        ? match[1].replace(/./g, function (c) { return c + c; })
        : match[1];
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }

    if ((match = value.match(/^rgb\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\)$/i))) {
      return {
        r: clamp(parseInt(match[1], 10), 0, 255),
        g: clamp(parseInt(match[2], 10), 0, 255),
        b: clamp(parseInt(match[3], 10), 0, 255)
      };
    }

    if ((match = value.match(/^hsl\((-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\)$/i))) {
      return hslToRgb(parseFloat(match[1]), clamp(parseFloat(match[2]), 0, 100), clamp(parseFloat(match[3]), 0, 100));
    }

    if ((match = value.match(/^hsv\((-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\)$/i))) {
      return hsvToRgb(parseFloat(match[1]), clamp(parseFloat(match[2]), 0, 100), clamp(parseFloat(match[3]), 0, 100));
    }

    throw new Error('Unsupported color format.');
  }

  function renderRows(rgb) {
    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    var hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    return [
      { label: 'HEX', value: hex },
      { label: 'RGB', value: 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')' },
      { label: 'HSL', value: 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)' },
      { label: 'HSV', value: 'hsv(' + hsv.h + ', ' + hsv.s + '%, ' + hsv.v + '%)' }
    ];
  }

  function render() {
    var input = document.getElementById('cfc-input').value;
    var tbody = document.querySelector('#cfc-results tbody');
    var status = document.getElementById('cfc-status');
    var preview = document.getElementById('cfc-preview');

    try {
      var rgb = parseColor(input);
      var rows = renderRows(rgb);
      preview.style.background = rgbToHex(rgb.r, rgb.g, rgb.b);
      document.getElementById('cfc-picker').value = rgbToHex(rgb.r, rgb.g, rgb.b);
      tbody.innerHTML = rows.map(function (row) {
        return '<tr>' +
          '<td>' + row.label + '</td>' +
          '<td style="font-family:monospace">' + window.mtools.escapeHtml(row.value) + '</td>' +
          '<td><button class="btn btn-secondary btn-sm" data-copy="' + window.mtools.escapeHtml(row.value) + '">copy</button></td>' +
          '</tr>';
      }).join('');

      Array.prototype.forEach.call(tbody.querySelectorAll('[data-copy]'), function (button) {
        button.addEventListener('click', function () {
          window.mtools.copyToClipboard(button.getAttribute('data-copy'), 'Copied value');
        });
      });

      status.className = 'mt-2 text-success';
      status.textContent = 'Color parsed successfully.';
    } catch (error) {
      preview.style.background = 'var(--bg)';
      tbody.innerHTML = '<tr><td colspan="3" class="text-error">Unable to parse the input color.</td></tr>';
      status.className = 'mt-2 text-error';
      status.textContent = error.message || 'Unable to parse the input color.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('cfc-input').addEventListener('input', render);
    document.getElementById('cfc-picker').addEventListener('input', function (event) {
      document.getElementById('cfc-input').value = event.target.value;
      render();
    });
    render();
  });
})();