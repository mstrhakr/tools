(function () {
  'use strict';

  var rawOutput = '';

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function syntaxHighlight(json) {
    return json.replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      function (match) {
        var cls = 'json-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-string';
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return '<span class="' + cls + '">' + escapeHtml(match) + '</span>';
      }
    );
  }

  function showStatus(msg, isError) {
    var el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = (isError ? 'text-error' : 'text-success') + ' mb-1';
    el.style.display = 'block';
  }

  function hideStatus() {
    document.getElementById('status-msg').style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('json-input');
    var output = document.getElementById('json-output');

    document.getElementById('btn-format').addEventListener('click', function () {
      hideStatus();
      var val = input.value.trim();
      if (!val) return;
      try {
        var obj = JSON.parse(val);
        var formatted = JSON.stringify(obj, null, 2);
        rawOutput = formatted;
        output.innerHTML = syntaxHighlight(escapeHtml(formatted));
        showStatus('Valid JSON - formatted', false);
      } catch (e) {
        showStatus('Invalid JSON: ' + e.message, true);
      }
    });

    document.getElementById('btn-minify').addEventListener('click', function () {
      hideStatus();
      var val = input.value.trim();
      if (!val) return;
      try {
        var obj = JSON.parse(val);
        var minified = JSON.stringify(obj);
        rawOutput = minified;
        output.innerHTML = syntaxHighlight(escapeHtml(minified));
        showStatus('Valid JSON - minified (' + minified.length + ' chars)', false);
      } catch (e) {
        showStatus('Invalid JSON: ' + e.message, true);
      }
    });

    document.getElementById('btn-validate').addEventListener('click', function () {
      var val = input.value.trim();
      if (!val) {
        showStatus('No input to validate', true);
        return;
      }
      try {
        JSON.parse(val);
        showStatus('Valid JSON', false);
      } catch (e) {
        showStatus('Invalid JSON: ' + e.message, true);
      }
    });

    document.getElementById('btn-clear').addEventListener('click', function () {
      input.value = '';
      output.innerHTML = '<span class="text-muted">Output will appear here</span>';
      rawOutput = '';
      hideStatus();
    });

    document.getElementById('btn-copy').addEventListener('click', function () {
      if (rawOutput) {
        mtools.copyToClipboard(rawOutput, 'JSON copied');
      }
    });
  });
})();
