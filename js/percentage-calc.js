(function () {
  'use strict';

  function fmt(n) {
    if (!isFinite(n)) return '--';
    return parseFloat(n.toPrecision(10)).toLocaleString('en-US', { maximumFractionDigits: 6 });
  }

  function calc1() {
    var x = parseFloat(document.getElementById('p1-x').value);
    var y = parseFloat(document.getElementById('p1-y').value);
    var el = document.getElementById('p1-result');
    if (isNaN(x) || isNaN(y)) { el.textContent = '--'; return; }
    el.textContent = fmt(x / 100 * y);
  }

  function calc2() {
    var x = parseFloat(document.getElementById('p2-x').value);
    var y = parseFloat(document.getElementById('p2-y').value);
    var el = document.getElementById('p2-result');
    if (isNaN(x) || isNaN(y) || y === 0) { el.textContent = '--'; return; }
    el.textContent = fmt(x / y * 100) + '%';
  }

  function calc3() {
    var x = parseFloat(document.getElementById('p3-x').value);
    var y = parseFloat(document.getElementById('p3-y').value);
    var el = document.getElementById('p3-result');
    var dir = document.getElementById('p3-direction');
    if (isNaN(x) || isNaN(y) || x === 0) { el.textContent = '--'; dir.textContent = ''; return; }
    var change = ((y - x) / Math.abs(x)) * 100;
    el.textContent = fmt(Math.abs(change)) + '%';
    dir.textContent = change > 0 ? 'increase' : change < 0 ? 'decrease' : 'no change';
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['p1-x', 'p1-y'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', calc1);
    });
    ['p2-x', 'p2-y'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', calc2);
    });
    ['p3-x', 'p3-y'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', calc3);
    });
  });
})();
