(function () {
  'use strict';

  var rawOutput = '';

  function showStatus(msg, isError) {
    var el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = (isError ? 'text-error' : 'text-success') + ' mb-1';
    el.style.display = 'block';
  }

  function hideStatus() {
    document.getElementById('status-msg').style.display = 'none';
  }

  function setOutput(text) {
    rawOutput = text;
    document.getElementById('yaml-output').textContent = text;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('yaml-input');

    document.getElementById('btn-validate').addEventListener('click', function () {
      hideStatus();
      var val = input.value.trim();
      if (!val) return;
      try {
        jsyaml.load(val);
        showStatus('Valid YAML', false);
      } catch (e) {
        showStatus('Invalid YAML: ' + e.message, true);
      }
    });

    document.getElementById('btn-to-json').addEventListener('click', function () {
      hideStatus();
      var val = input.value.trim();
      if (!val) return;
      try {
        var parsed = jsyaml.load(val);
        var json = JSON.stringify(parsed, null, 2);
        setOutput(json);
        showStatus('Converted to JSON', false);
      } catch (e) {
        showStatus('Invalid YAML: ' + e.message, true);
      }
    });

    document.getElementById('btn-from-json').addEventListener('click', function () {
      hideStatus();
      var val = input.value.trim();
      if (!val) return;
      try {
        var parsed = JSON.parse(val);
        var yaml = jsyaml.dump(parsed, { indent: 2 });
        setOutput(yaml);
        showStatus('Converted to YAML', false);
      } catch (e) {
        showStatus('Invalid JSON: ' + e.message, true);
      }
    });

    document.getElementById('btn-clear').addEventListener('click', function () {
      input.value = '';
      document.getElementById('yaml-output').innerHTML = '<span class="text-muted">Output will appear here</span>';
      rawOutput = '';
      hideStatus();
    });

    document.getElementById('btn-copy').addEventListener('click', function () {
      if (rawOutput) mtools.copyToClipboard(rawOutput, 'Copied');
    });
  });
})();
