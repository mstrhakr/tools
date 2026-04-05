(function () {
  'use strict';

  var TIMEZONES = [
    'UTC',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Berlin',
    'Europe/Helsinki',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  function toInputValue(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function getTimeZoneParts(date, timeZone) {
    var formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    var parts = {};
    formatter.formatToParts(date).forEach(function (part) {
      if (part.type !== 'literal') parts[part.type] = part.value;
    });
    return parts;
  }

  function instantFromLocal(value, timeZone) {
    var match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) return null;

    var year = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    var day = parseInt(match[3], 10);
    var hour = parseInt(match[4], 10);
    var minute = parseInt(match[5], 10);
    var guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
    var parts = getTimeZoneParts(guess, timeZone);
    var zoneUtc = Date.UTC(
      parseInt(parts.year, 10),
      parseInt(parts.month, 10) - 1,
      parseInt(parts.day, 10),
      parseInt(parts.hour, 10),
      parseInt(parts.minute, 10),
      parseInt(parts.second, 10)
    );
    var targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    return new Date(guess.getTime() - (zoneUtc - targetUtc));
  }

  function formatOffset(date, timeZone) {
    var parts = getTimeZoneParts(date, timeZone);
    var zoneUtc = Date.UTC(
      parseInt(parts.year, 10),
      parseInt(parts.month, 10) - 1,
      parseInt(parts.day, 10),
      parseInt(parts.hour, 10),
      parseInt(parts.minute, 10),
      parseInt(parts.second, 10)
    );
    var diffMinutes = Math.round((zoneUtc - date.getTime()) / 60000);
    var sign = diffMinutes >= 0 ? '+' : '-';
    var absolute = Math.abs(diffMinutes);
    return 'UTC' + sign + pad(Math.floor(absolute / 60)) + ':' + pad(absolute % 60);
  }

  function render() {
    var value = document.getElementById('tz-datetime').value;
    var source = document.getElementById('tz-source').value;
    var tbody = document.querySelector('#tz-results tbody');
    var instant = instantFromLocal(value, source);

    if (!instant || isNaN(instant.getTime())) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-error">Enter a valid date and time.</td></tr>';
      return;
    }

    var rows = TIMEZONES.map(function (timeZone) {
      var parts = getTimeZoneParts(instant, timeZone);
      var formatted = parts.year + '-' + parts.month + '-' + parts.day + ' ' + parts.hour + ':' + parts.minute + ':' + parts.second;
      return '<tr>' +
        '<td>' + window.mtools.escapeHtml(timeZone) + '</td>' +
        '<td>' + window.mtools.escapeHtml(formatted) + '</td>' +
        '<td>' + window.mtools.escapeHtml(formatOffset(instant, timeZone)) + '</td>' +
        '</tr>';
    }).join('');

    tbody.innerHTML = rows;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sourceSelect = document.getElementById('tz-source');
    TIMEZONES.forEach(function (timeZone) {
      var option = document.createElement('option');
      option.value = timeZone;
      option.textContent = timeZone;
      sourceSelect.appendChild(option);
    });

    var browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.indexOf(browserTimeZone) !== -1) {
      sourceSelect.value = browserTimeZone;
    } else {
      sourceSelect.value = 'UTC';
    }

    document.getElementById('tz-datetime').value = toInputValue(new Date());
    document.getElementById('btn-tz-convert').addEventListener('click', render);
    document.getElementById('btn-tz-now').addEventListener('click', function () {
      document.getElementById('tz-datetime').value = toInputValue(new Date());
      render();
    });
    document.getElementById('tz-datetime').addEventListener('input', render);
    sourceSelect.addEventListener('change', render);
    render();
  });
})();