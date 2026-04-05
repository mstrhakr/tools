(function () {
  'use strict';

  var rawOutput = '';

  function showStatus(message, isError) {
    var status = document.getElementById('jy-status');
    status.textContent = message;
    status.className = isError ? 'mb-1 text-error' : 'mb-1 text-success';
  }

  function getDirection() {
    return document.getElementById('jy-direction').value;
  }

  function parseInput() {
    var input = document.getElementById('jy-input').value.trim();
    if (!input) {
      throw new Error('Input is empty.');
    }

    if (getDirection() === 'json-to-yaml') {
      return JSON.parse(input);
    }
    return jsyaml.load(input);
  }

  function convert() {
    try {
      var parsed = parseInput();
      var direction = getDirection();
      var output = direction === 'json-to-yaml'
        ? jsyaml.dump(parsed, { indent: 2, lineWidth: 120, noRefs: true })
        : JSON.stringify(parsed, null, 2);

      rawOutput = output;
      document.getElementById('jy-output').value = output;
      showStatus('Converted successfully.', false);
    } catch (error) {
      rawOutput = '';
      document.getElementById('jy-output').value = '';
      showStatus(error.message || 'Unable to convert input.', true);
    }
  }

  function formatInput() {
    try {
      var parsed = parseInput();
      var direction = getDirection();
      var formatted = direction === 'json-to-yaml'
        ? JSON.stringify(parsed, null, 2)
        : jsyaml.dump(parsed, { indent: 2, lineWidth: 120, noRefs: true });

      document.getElementById('jy-input').value = formatted;
      showStatus('Input formatted.', false);
      convert();
    } catch (error) {
      showStatus(error.message || 'Unable to format input.', true);
    }
  }

  function clearAll() {
    document.getElementById('jy-input').value = '';
    document.getElementById('jy-output').value = '';
    rawOutput = '';
    showStatus('Cleared.', false);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-jy-convert').addEventListener('click', convert);
    document.getElementById('btn-jy-format').addEventListener('click', formatInput);
    document.getElementById('btn-jy-clear').addEventListener('click', clearAll);
    document.getElementById('btn-jy-copy').addEventListener('click', function () {
      if (rawOutput) {
        window.mtools.copyToClipboard(rawOutput, 'Copied output');
      }
    });

    document.getElementById('jy-direction').addEventListener('change', function () {
      convert();
    });

    document.getElementById('jy-input').addEventListener('input', function () {
      convert();
    });

    document.getElementById('jy-input').value = '{\n  "service": "tools",\n  "enabled": true,\n  "ports": [80, 443]\n}';
    convert();
  });
})();