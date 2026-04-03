(function () {
  'use strict';

  var FIELD_NAMES = ['minute', 'hour', 'day of month', 'month', 'day of week'];

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  var RANGES = [
    { min: 0, max: 59 },   // minute
    { min: 0, max: 23 },   // hour
    { min: 1, max: 31 },   // dom
    { min: 1, max: 12 },   // month
    { min: 0, max: 6 }     // dow
  ];

  // Common preset expressions
  var PRESETS = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at midnight', value: '0 0 * * *' },
    { label: 'Every Sunday', value: '0 0 * * 0' },
    { label: 'Every weekday at 9am', value: '0 9 * * 1-5' },
    { label: 'Every 15 minutes', value: '*/15 * * * *' },
    { label: '1st of every month', value: '0 0 1 * *' }
  ];

  function describeField(expr, idx) {
    var range = RANGES[idx];
    var name = FIELD_NAMES[idx];
    var names = idx === 3 ? MONTH_NAMES : (idx === 4 ? DAY_NAMES : null);

    if (expr === '*') return 'every ' + name;

    if (expr.startsWith('*/')) {
      var step = parseInt(expr.slice(2));
      return 'every ' + step + ' ' + name + (step > 1 ? 's' : '');
    }

    if (expr.includes('/')) {
      var parts = expr.split('/');
      return 'every ' + parts[1] + ' ' + name + (parseInt(parts[1]) > 1 ? 's' : '') + ' starting at ' + parts[0];
    }

    if (expr.includes('-')) {
      var bounds = expr.split('-');
      var from = names ? (names[parseInt(bounds[0]) - (idx === 3 ? 1 : 0)] || bounds[0]) : bounds[0];
      var to = names ? (names[parseInt(bounds[1]) - (idx === 3 ? 1 : 0)] || bounds[1]) : bounds[1];
      return name + ' from ' + from + ' to ' + to;
    }

    if (expr.includes(',')) {
      var vals = expr.split(',').map(function (v) {
        var n = parseInt(v);
        return names ? (names[n - (idx === 3 ? 1 : 0)] || v) : v;
      });
      return name + ' ' + vals.slice(0, -1).join(', ') + (vals.length > 1 ? ' and ' : '') + vals[vals.length - 1];
    }

    var n = parseInt(expr);
    if (!isNaN(n)) {
      var label = names ? (names[n - (idx === 3 ? 1 : 0)] || expr) : expr;
      return 'at ' + name + ' ' + label;
    }

    return name + ' ' + expr;
  }

  function buildDescription(fields) {
    var minute = describeField(fields[0], 0);
    var hour = describeField(fields[1], 1);
    var dom = describeField(fields[2], 2);
    var month = describeField(fields[3], 3);
    var dow = describeField(fields[4], 4);

    var parts = [];
    if (fields[0] === '*' && fields[1] === '*') {
      parts.push('every minute');
    } else if (fields[0] === '0' && fields[1] === '*') {
      parts.push('at the start of every hour');
    } else {
      parts.push(minute + ', ' + hour);
    }
    if (fields[2] !== '*') parts.push(dom);
    if (fields[3] !== '*') parts.push(month);
    if (fields[4] !== '*') parts.push(dow);

    return parts.join(', ');
  }

  function parseAndDescribe() {
    var raw = document.getElementById('cron-input').value.trim();
    var errorEl = document.getElementById('cron-error');
    var descEl = document.getElementById('cron-desc');
    var fieldsEl = document.getElementById('cron-fields');

    errorEl.style.display = 'none';
    descEl.textContent = '';
    fieldsEl.innerHTML = '';

    if (!raw) return;

    var fields = raw.split(/\s+/);
    if (fields.length !== 5) {
      errorEl.textContent = 'A cron expression must have exactly 5 fields: minute hour dom month dow';
      errorEl.style.display = 'block';
      return;
    }

    var summary = buildDescription(fields);
    descEl.textContent = summary;

    var fieldLabels = ['minute', 'hour', 'day of month', 'month', 'day of week'];
    fields.forEach(function (f, i) {
      var row = document.createElement('div');
      row.className = 'result mt-1';
      row.innerHTML =
        '<div class="result-label">' + fieldLabels[i] + '</div>' +
        '<div><strong>' + f + '</strong> &mdash; ' + describeField(f, i) + '</div>';
      fieldsEl.appendChild(row);
    });
  }

  function init() {
    document.getElementById('cron-input').addEventListener('input', parseAndDescribe);

    // Populate presets
    var container = document.getElementById('cron-presets');
    PRESETS.forEach(function (p) {
      var btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = p.label + ' (' + p.value + ')';
      btn.addEventListener('click', function () {
        document.getElementById('cron-input').value = p.value;
        parseAndDescribe();
      });
      container.appendChild(btn);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
