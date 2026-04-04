(function () {
  'use strict';

  var rawOutput = '';

  function encode(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/[^\x00-\x7E]/g, function (c) {
        return '&#' + c.codePointAt(0) + ';';
      });
  }

  function decode(s) {
    // Use the DOM to decode — safe because we only read textContent back
    var ta = document.createElement('textarea');
    ta.innerHTML = s;
    return ta.value;
  }

  function setOutput(val) {
    rawOutput = val;
    document.getElementById('entity-output').value = val;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('entity-input');
    var output = document.getElementById('entity-output');

    document.getElementById('btn-encode').addEventListener('click', function () {
      setOutput(encode(input.value));
    });

    document.getElementById('btn-decode').addEventListener('click', function () {
      setOutput(decode(input.value));
    });

    document.getElementById('btn-swap').addEventListener('click', function () {
      var tmp = input.value;
      input.value = output.value;
      output.value = tmp;
      rawOutput = output.value;
    });

    document.getElementById('btn-clear').addEventListener('click', function () {
      input.value = '';
      output.value = '';
      rawOutput = '';
    });

    document.getElementById('btn-copy').addEventListener('click', function () {
      if (rawOutput) mtools.copyToClipboard(rawOutput, 'Copied');
    });
  });
})();
