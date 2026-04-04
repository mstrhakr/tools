(function () {
  'use strict';

  var RANGES = {
    ascii:  [0, 127],
    latin1: [128, 255],
    arrows: [8592, 8703],
    math:   [8704, 8959],
    misc:   [9728, 9983],
    emoji:  [128512, 128591]
  };

  var chars = [];

  function buildChars(start, end) {
    chars = [];
    for (var cp = start; cp <= end; cp++) {
      try {
        var s = String.fromCodePoint(cp);
        chars.push({ cp: cp, s: s });
      } catch (e) { /* skip surrogates */ }
    }
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function htmlEntity(cp) {
    return '&#' + cp + ';';
  }

  function renderGrid(list) {
    var grid = document.getElementById('char-grid');
    if (list.length === 0) {
      grid.innerHTML = '<span class="text-muted">No characters found</span>';
      return;
    }
    // Limit to 500 for performance
    var shown = list.slice(0, 500);
    grid.innerHTML = shown.map(function (c) {
      var hex = c.cp.toString(16).toUpperCase().padStart(4, '0');
      var label = c.cp < 32 ? 'ctrl' : escapeHtml(c.s);
      return '<div class="char-cell" data-cp="' + c.cp + '" title="U+' + hex + '">' +
        '<span class="char-glyph">' + label + '</span>' +
        '<span class="char-dec">' + c.cp + '</span>' +
        '<span class="char-hex">U+' + hex + '</span>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.char-cell').forEach(function (cell) {
      cell.addEventListener('click', function () {
        var cp = parseInt(cell.getAttribute('data-cp'), 10);
        var s = String.fromCodePoint(cp);
        var hex = cp.toString(16).toUpperCase().padStart(4, '0');
        var detail = document.getElementById('char-detail');
        detail.innerHTML =
          '<div class="result-label">Selected character</div>' +
          '<div style="font-size:2rem;display:inline-block;margin-right:1rem">' + (cp < 32 ? '' : escapeHtml(s)) + '</div>' +
          '<div style="display:inline-grid;grid-template-columns:auto auto;gap:0.25rem 1rem;font-size:0.85rem;vertical-align:middle">' +
          '<span class="text-muted">Codepoint</span><span>U+' + hex + ' (' + cp + ')</span>' +
          '<span class="text-muted">HTML entity</span><span>' + escapeHtml(htmlEntity(cp)) + '</span>' +
          '<span class="text-muted">UTF-8 (hex)</span><span>' + encodeUtf8Hex(s) + '</span>' +
          '</div>' +
          '<div class="btn-group mt-1">' +
          (cp >= 32 ? '<button class="btn btn-secondary btn-sm" onclick="mtools.copyToClipboard(\'' + escapeHtml(s).replace(/'/g, "\\'") + '\', \'Char copied\')">copy char</button>' : '') +
          '<button class="btn btn-secondary btn-sm" onclick="mtools.copyToClipboard(\'U+' + hex + '\', \'Copied\')">copy U+' + hex + '</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="mtools.copyToClipboard(\'' + htmlEntity(cp) + '\', \'Copied\')">copy entity</button>' +
          '</div>';
        detail.style.display = 'block';
      });
    });

    if (list.length > 500) {
      var note = document.createElement('div');
      note.className = 'text-muted mt-1';
      note.style.fontSize = '0.8rem';
      note.textContent = 'Showing first 500 of ' + list.length + ' characters. Use search to narrow results.';
      grid.appendChild(note);
    }
  }

  function encodeUtf8Hex(s) {
    var bytes = [];
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code.toString(16).toUpperCase().padStart(2, '0'));
      } else if (code < 0x800) {
        bytes.push((0xC0 | (code >> 6)).toString(16).toUpperCase().padStart(2, '0'));
        bytes.push((0x80 | (code & 0x3F)).toString(16).toUpperCase().padStart(2, '0'));
      } else {
        bytes.push((0xE0 | (code >> 12)).toString(16).toUpperCase().padStart(2, '0'));
        bytes.push((0x80 | ((code >> 6) & 0x3F)).toString(16).toUpperCase().padStart(2, '0'));
        bytes.push((0x80 | (code & 0x3F)).toString(16).toUpperCase().padStart(2, '0'));
      }
    }
    return bytes.join(' ');
  }

  function applyFilter() {
    var q = document.getElementById('char-search').value.trim().toLowerCase();
    if (!q) { renderGrid(chars); return; }

    // Try numeric (decimal or hex)
    var num = parseInt(q, 10);
    var hexNum = parseInt(q.replace(/^u\+/i, ''), 16);

    var filtered = chars.filter(function (c) {
      if (c.cp === num) return true;
      if (!isNaN(hexNum) && c.cp === hexNum) return true;
      var s = c.s.toLowerCase();
      if (s === q) return true;
      return false;
    });
    renderGrid(filtered);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var rangeSelect = document.getElementById('char-range');
    var searchInput = document.getElementById('char-search');

    function reload() {
      var r = RANGES[rangeSelect.value] || RANGES.ascii;
      buildChars(r[0], r[1]);
      applyFilter();
    }

    rangeSelect.addEventListener('change', reload);
    searchInput.addEventListener('input', applyFilter);

    reload();
  });
})();
