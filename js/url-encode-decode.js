(function () {
  'use strict';

  function showError(msg) {
    var el = document.getElementById('error-msg');
    if (msg) {
      el.textContent = msg;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('input-text');
    var output = document.getElementById('output-text');

    document.getElementById('btn-encode').addEventListener('click', function () {
      showError('');
      try {
        output.value = encodeURIComponent(input.value);
      } catch (e) {
        showError('Encoding failed: ' + e.message);
      }
    });

    document.getElementById('btn-encode-full').addEventListener('click', function () {
      showError('');
      try {
        output.value = encodeURI(input.value);
      } catch (e) {
        showError('Encoding failed: ' + e.message);
      }
    });

    document.getElementById('btn-decode').addEventListener('click', function () {
      showError('');
      try {
        output.value = decodeURIComponent(input.value);
      } catch (e) {
        showError('Decoding failed: ' + e.message);
      }
    });

    document.getElementById('btn-swap').addEventListener('click', function () {
      var tmp = input.value;
      input.value = output.value;
      output.value = tmp;
      showError('');
    });

    document.getElementById('btn-clear').addEventListener('click', function () {
      input.value = '';
      output.value = '';
      showError('');
    });

    document.getElementById('btn-copy').addEventListener('click', function () {
      mtools.copyToClipboard(output.value, 'Output copied');
    });
  });
})();
