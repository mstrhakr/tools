(function () {
  'use strict';

  var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var LOWER = 'abcdefghijklmnopqrstuvwxyz';
  var DIGITS = '0123456789';
  var SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  var AMBIGUOUS = '0O1lI';

  function getCharset() {
    var charset = '';
    if (document.getElementById('opt-upper').checked) charset += UPPER;
    if (document.getElementById('opt-lower').checked) charset += LOWER;
    if (document.getElementById('opt-digits').checked) charset += DIGITS;
    if (document.getElementById('opt-symbols').checked) charset += SYMBOLS;

    if (document.getElementById('opt-exclude-ambiguous').checked) {
      charset = charset.split('').filter(function (c) {
        return AMBIGUOUS.indexOf(c) === -1;
      }).join('');
    }

    return charset;
  }

  function secureRandom(max) {
    var arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }

  function generate() {
    var charset = getCharset();
    var length = parseInt(document.getElementById('pw-length').value, 10);
    var output = document.getElementById('password-output');

    if (!charset) {
      output.textContent = 'Select at least one character set';
      updateStrength('', 0);
      return;
    }

    var password = '';
    for (var i = 0; i < length; i++) {
      password += charset[secureRandom(charset.length)];
    }

    output.textContent = password;
    updateStrength(password, charset.length);
  }

  function updateStrength(password, poolSize) {
    var fill = document.getElementById('strength-fill');
    var label = document.getElementById('strength-label');

    if (!password) {
      fill.style.width = '0%';
      label.textContent = '';
      return;
    }

    var entropy = password.length * Math.log2(poolSize || 1);
    var percent, text, color;

    if (entropy < 28) {
      percent = 15; text = 'very weak'; color = 'var(--red)';
    } else if (entropy < 36) {
      percent = 30; text = 'weak'; color = 'var(--orange)';
    } else if (entropy < 60) {
      percent = 50; text = 'fair'; color = 'var(--yellow)';
    } else if (entropy < 80) {
      percent = 75; text = 'strong'; color = 'var(--cyan)';
    } else {
      percent = 100; text = 'very strong'; color = 'var(--green)';
    }

    fill.style.width = percent + '%';
    fill.style.backgroundColor = color;
    label.textContent = text + ' (' + Math.round(entropy) + ' bits of entropy)';
    label.style.color = color;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var slider = document.getElementById('pw-length');
    var sliderVal = document.getElementById('pw-length-val');

    slider.addEventListener('input', function () {
      sliderVal.textContent = slider.value;
      generate();
    });

    ['opt-upper', 'opt-lower', 'opt-digits', 'opt-symbols', 'opt-exclude-ambiguous'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', generate);
    });

    document.getElementById('btn-generate').addEventListener('click', generate);
    document.getElementById('btn-copy').addEventListener('click', function () {
      var pw = document.getElementById('password-output').textContent;
      if (pw && pw !== '--' && pw !== 'Select at least one character set') {
        mtools.copyToClipboard(pw, 'Password copied');
      }
    });

    generate();
  });
})();
