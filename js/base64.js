(function () {
  'use strict';

  function utf8Encode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  }

  function utf8Decode(b64) {
    return decodeURIComponent(Array.prototype.map.call(atob(b64), function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

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
        output.value = utf8Encode(input.value);
      } catch (e) {
        showError('Encoding failed: ' + e.message);
      }
    });

    document.getElementById('btn-decode').addEventListener('click', function () {
      showError('');
      try {
        output.value = utf8Decode(input.value.trim());
      } catch (e) {
        showError('Decoding failed: invalid Base64 input');
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
