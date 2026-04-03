(function () {
  'use strict';

  var state = {
    owner:  [false, false, false],  // r, w, x
    group:  [false, false, false],
    other:  [false, false, false]
  };

  function bitsToOctal(bits) {
    return (bits[0] ? 4 : 0) + (bits[1] ? 2 : 0) + (bits[2] ? 1 : 0);
  }

  function octalToSymbolic(o, g, ot) {
    function toSymbol(n, x) {
      return (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? x : '-');
    }
    return '-' + toSymbol(o, 'x') + toSymbol(g, 'x') + toSymbol(ot, 'x');
  }

  function updateDisplay() {
    var o = bitsToOctal(state.owner);
    var g = bitsToOctal(state.group);
    var ot = bitsToOctal(state.other);
    var octal = '' + o + g + ot;
    var symbolic = octalToSymbolic(o, g, ot);

    document.getElementById('chmod-octal').value = octal;
    document.getElementById('chmod-symbolic').textContent = symbolic;
    document.getElementById('chmod-cmd').textContent = 'chmod ' + octal + ' <file>';
  }

  function updateToggleStates() {
    ['owner', 'group', 'other'].forEach(function (cat) {
      ['r', 'w', 'x'].forEach(function (perm, i) {
        var btn = document.querySelector('[data-cat="' + cat + '"][data-perm="' + perm + '"]');
        if (btn) {
          btn.classList.toggle('active', state[cat][i]);
        }
      });
    });
    updateDisplay();
  }

  function applyOctal(val) {
    if (!/^[0-7]{3}$/.test(val)) return;
    var parts = [parseInt(val[0]), parseInt(val[1]), parseInt(val[2])];
    ['owner', 'group', 'other'].forEach(function (cat, ci) {
      var n = parts[ci];
      state[cat][0] = !!(n & 4);
      state[cat][1] = !!(n & 2);
      state[cat][2] = !!(n & 1);
    });
    updateToggleStates();
  }

  function init() {
    // Bit toggle buttons
    document.querySelectorAll('.chmod-bit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.dataset.cat;
        var perms = ['r', 'w', 'x'];
        var idx = perms.indexOf(btn.dataset.perm);
        state[cat][idx] = !state[cat][idx];
        btn.classList.toggle('active', state[cat][idx]);
        updateDisplay();
      });
    });

    // Octal input
    var octalInput = document.getElementById('chmod-octal');
    octalInput.addEventListener('input', function () {
      var val = octalInput.value.trim();
      if (/^[0-7]{3}$/.test(val)) {
        applyOctal(val);
      }
    });

    // Preset buttons
    document.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyOctal(btn.dataset.preset);
      });
    });

    // Copy command button
    document.getElementById('copy-cmd').addEventListener('click', function () {
      window.mtools.copyToClipboard(document.getElementById('chmod-cmd').textContent);
    });

    updateDisplay();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
