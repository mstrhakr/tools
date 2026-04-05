(function () {
  'use strict';

  function decodeHtml(text) {
    var textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  function decodeJsonString(text) {
    return JSON.parse('"' + text.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
  }

  function transform(mode, text, escapeDirection) {
    if (mode === 'json') {
      if (escapeDirection) return JSON.stringify(text).slice(1, -1);
      return decodeJsonString(text);
    }

    if (mode === 'html') {
      return escapeDirection ? window.mtools.escapeHtml(text) : decodeHtml(text);
    }

    if (mode === 'url') {
      return escapeDirection ? encodeURIComponent(text) : decodeURIComponent(text);
    }

    return text;
  }

  function run(escapeDirection) {
    var mode = document.getElementById('escape-format').value;
    var input = document.getElementById('escape-input').value;
    var output = document.getElementById('escape-output');
    var status = document.getElementById('escape-status');

    try {
      output.value = transform(mode, input, escapeDirection);
      status.className = 'mt-2 text-success';
      status.textContent = escapeDirection ? 'Escaped successfully.' : 'Decoded successfully.';
    } catch (error) {
      output.value = '';
      status.className = 'mt-2 text-error';
      status.textContent = error && error.message ? error.message : 'Unable to transform the input.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-escape').addEventListener('click', function () {
      run(true);
    });
    document.getElementById('btn-unescape').addEventListener('click', function () {
      run(false);
    });
    document.getElementById('copy-output').addEventListener('click', function () {
      window.mtools.copyToClipboard(document.getElementById('escape-output').value, 'Copied output');
    });
  });
})();