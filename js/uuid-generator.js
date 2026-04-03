(function () {
  'use strict';

  function generateUUID() {
    // Use native crypto.randomUUID if available
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback using crypto.getRandomValues
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    var hex = Array.from(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }

  var uuids = [];

  function generate() {
    var count = parseInt(document.getElementById('uuid-count').value, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 100) count = 100;

    uuids = [];
    for (var i = 0; i < count; i++) {
      uuids.push(generateUUID());
    }

    renderList();
  }

  function renderList() {
    var list = document.getElementById('uuid-list');
    list.innerHTML = uuids.map(function (uuid, i) {
      return '<li class="output-list-item">' +
        '<code>' + uuid + '</code>' +
        '<button class="btn btn-sm btn-secondary" data-uuid="' + uuid + '">copy</button>' +
        '</li>';
    }).join('');

    // Attach copy handlers
    list.querySelectorAll('button[data-uuid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        mtools.copyToClipboard(btn.getAttribute('data-uuid'), 'UUID copied');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-generate').addEventListener('click', generate);

    document.getElementById('btn-copy-all').addEventListener('click', function () {
      if (uuids.length) {
        mtools.copyToClipboard(uuids.join('\n'), 'All UUIDs copied');
      }
    });

    generate();
  });
})();
