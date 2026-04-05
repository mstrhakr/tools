(function () {
  'use strict';

  var WELL_KNOWN_NAMESPACES = {
    dns: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    url: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    oid: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
    x500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8'
  };

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

  function parseUuidBytes(uuid) {
    var normalized = String(uuid || '').trim().toLowerCase();
    var match = normalized.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    if (!match) {
      throw new Error('Namespace must be a valid UUID.');
    }

    var hex = normalized.replace(/-/g, '');
    var bytes = new Uint8Array(16);
    for (var i = 0; i < 16; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  function bytesToUuid(bytes) {
    var hex = Array.from(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }

  function generateUUIDv5(namespaceUuid, name) {
    var namespaceBytes = parseUuidBytes(namespaceUuid);
    var nameBytes = new TextEncoder().encode(name);
    var input = new Uint8Array(namespaceBytes.length + nameBytes.length);
    input.set(namespaceBytes, 0);
    input.set(nameBytes, namespaceBytes.length);

    return crypto.subtle.digest('SHA-1', input).then(function (hashBuffer) {
      var bytes = new Uint8Array(hashBuffer).slice(0, 16);
      bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
      return bytesToUuid(bytes);
    });
  }

  var uuids = [];

  function setStatus(message, isError) {
    var status = document.getElementById('uuid-status');
    status.className = 'mt-1 ' + (isError ? 'text-error' : 'text-muted');
    status.textContent = message;
  }

  function getSelectedNamespace() {
    var namespaceType = document.getElementById('uuid-namespace-type').value;
    if (namespaceType === 'custom') {
      return document.getElementById('uuid-custom-namespace').value.trim();
    }
    return WELL_KNOWN_NAMESPACES[namespaceType];
  }

  function generate() {
    var version = document.getElementById('uuid-version').value;
    var count = parseInt(document.getElementById('uuid-count').value, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 100) count = 100;

    uuids = [];

    if (version === 'v4') {
      for (var i = 0; i < count; i++) {
        uuids.push(generateUUID());
      }
      setStatus('Generated ' + count + ' UUID v4 value' + (count === 1 ? '' : 's') + '.', false);
      renderList();
      return;
    }

    var namespace = getSelectedNamespace();
    var name = document.getElementById('uuid-name').value;

    if (!name) {
      setStatus('Name is required for UUID v5.', true);
      renderList();
      return;
    }

    var promises = [];
    for (var j = 0; j < count; j++) {
      promises.push(generateUUIDv5(namespace, name));
    }

    Promise.all(promises).then(function (values) {
      uuids = values;
      setStatus('Generated ' + count + ' UUID v5 value' + (count === 1 ? '' : 's') + '.', false);
      renderList();
    }).catch(function (error) {
      uuids = [];
      setStatus(error.message || 'Unable to generate UUID v5.', true);
      renderList();
    });
  }

  function updateModeUi() {
    var version = document.getElementById('uuid-version').value;
    var v5Wrap = document.getElementById('uuid-v5-options');
    v5Wrap.style.display = version === 'v5' ? '' : 'none';
  }

  function updateNamespaceUi() {
    var type = document.getElementById('uuid-namespace-type').value;
    var customWrap = document.getElementById('uuid-custom-namespace-wrap');
    customWrap.style.display = type === 'custom' ? '' : 'none';
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
    document.getElementById('uuid-version').addEventListener('change', function () {
      updateModeUi();
      generate();
    });
    document.getElementById('uuid-count').addEventListener('input', generate);
    document.getElementById('uuid-namespace-type').addEventListener('change', function () {
      updateNamespaceUi();
      generate();
    });
    document.getElementById('uuid-custom-namespace').addEventListener('input', generate);
    document.getElementById('uuid-name').addEventListener('input', generate);

    document.getElementById('btn-copy-all').addEventListener('click', function () {
      if (uuids.length) {
        mtools.copyToClipboard(uuids.join('\n'), 'All UUIDs copied');
      }
    });

    updateModeUi();
    updateNamespaceUi();
    generate();
  });
})();
