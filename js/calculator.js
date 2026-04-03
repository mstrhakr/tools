(function () {
  'use strict';

  var display = '';
  var currentValue = '0';
  var previousValue = '';
  var operator = '';
  var resetNext = false;

  function updateDisplay() {
    var expr = document.getElementById('calc-expression');
    var result = document.getElementById('calc-result');
    expr.textContent = previousValue && operator ? previousValue + ' ' + operator : '\u00a0';
    result.textContent = currentValue || '0';
  }

  function calculate(a, op, b) {
    a = parseFloat(a);
    b = parseFloat(b);
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? 'Error' : a / b;
      case '%': return a * (b / 100);
      default: return b;
    }
  }

  function formatResult(n) {
    if (typeof n === 'string') return n;
    if (!isFinite(n)) return 'Error';
    // Avoid floating point display issues
    var s = parseFloat(n.toPrecision(12)).toString();
    return s;
  }

  function handleAction(action) {
    if (action >= '0' && action <= '9') {
      if (resetNext) {
        currentValue = '';
        resetNext = false;
      }
      if (currentValue === '0' && action !== '0') {
        currentValue = action;
      } else if (currentValue === '0' && action === '0') {
        // stay at 0
      } else {
        currentValue += action;
      }
    } else if (action === '.') {
      if (resetNext) {
        currentValue = '0';
        resetNext = false;
      }
      if (currentValue.indexOf('.') === -1) {
        currentValue += '.';
      }
    } else if (action === 'negate') {
      if (currentValue !== '0' && currentValue !== '') {
        if (currentValue.charAt(0) === '-') {
          currentValue = currentValue.substring(1);
        } else {
          currentValue = '-' + currentValue;
        }
      }
    } else if (action === 'clear') {
      currentValue = '0';
      previousValue = '';
      operator = '';
      resetNext = false;
    } else if (action === 'clear-entry') {
      currentValue = '0';
      resetNext = false;
    } else if (['+', '-', '*', '/', '%'].indexOf(action) !== -1) {
      if (previousValue && operator && !resetNext) {
        var result = calculate(previousValue, operator, currentValue);
        currentValue = formatResult(result);
        previousValue = currentValue;
      } else {
        previousValue = currentValue;
      }
      operator = action;
      resetNext = true;
    } else if (action === '=') {
      if (previousValue && operator) {
        var result = calculate(previousValue, operator, currentValue);
        currentValue = formatResult(result);
        previousValue = '';
        operator = '';
        resetNext = true;
      }
    }

    updateDisplay();
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateDisplay();

    // Button clicks
    document.querySelectorAll('.calc-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleAction(btn.getAttribute('data-action'));
      });
    });

    // Keyboard support
    document.addEventListener('keydown', function (e) {
      var key = e.key;
      if (key >= '0' && key <= '9') handleAction(key);
      else if (key === '.') handleAction('.');
      else if (key === '+') handleAction('+');
      else if (key === '-') handleAction('-');
      else if (key === '*') handleAction('*');
      else if (key === '/') { e.preventDefault(); handleAction('/'); }
      else if (key === '%') handleAction('%');
      else if (key === 'Enter' || key === '=') handleAction('=');
      else if (key === 'Escape') handleAction('clear');
      else if (key === 'Backspace') {
        if (currentValue.length > 1) {
          currentValue = currentValue.slice(0, -1);
        } else {
          currentValue = '0';
        }
        updateDisplay();
      }
    });
  });
})();
