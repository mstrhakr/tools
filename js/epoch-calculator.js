(function () {
  'use strict';

  function toLocalInputValue(d) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function statItem(val, label) {
    return '<div class="stat-item"><div class="stat-value">' + val + '</div><div class="stat-label">' + label + '</div></div>';
  }

  function calcDiff() {
    var a = new Date(document.getElementById('date-start').value);
    var b = new Date(document.getElementById('date-end').value);
    var el = document.getElementById('diff-results');

    if (isNaN(a) || isNaN(b)) { el.innerHTML = '<span class="text-error">Enter both dates</span>'; return; }

    var diff = Math.abs(b - a);
    var totalSec = Math.floor(diff / 1000);
    var totalMin = Math.floor(diff / 60000);
    var totalHrs = Math.floor(diff / 3600000);
    var totalDays = Math.floor(diff / 86400000);
    var totalWeeks = Math.floor(totalDays / 7);

    // Calendar breakdown
    var start = a < b ? a : b;
    var end = a < b ? b : a;
    var years = end.getFullYear() - start.getFullYear();
    var months = end.getMonth() - start.getMonth();
    var days = end.getDate() - start.getDate();
    if (days < 0) { months--; var prevMonth = new Date(end.getFullYear(), end.getMonth(), 0); days += prevMonth.getDate(); }
    if (months < 0) { years--; months += 12; }

    el.innerHTML =
      statItem(years + 'y ' + months + 'm ' + days + 'd', 'calendar') +
      statItem(totalDays.toLocaleString(), 'days') +
      statItem(totalWeeks.toLocaleString(), 'weeks') +
      statItem(totalHrs.toLocaleString(), 'hours') +
      statItem(totalMin.toLocaleString(), 'minutes') +
      statItem(totalSec.toLocaleString(), 'seconds');
  }

  function calcAdd(sign) {
    var base = new Date(document.getElementById('base-date').value);
    if (isNaN(base)) { return; }

    var years  = parseInt(document.getElementById('add-years').value, 10) || 0;
    var months = parseInt(document.getElementById('add-months').value, 10) || 0;
    var days   = parseInt(document.getElementById('add-days').value, 10) || 0;
    var hours  = parseInt(document.getElementById('add-hours').value, 10) || 0;
    var mins   = parseInt(document.getElementById('add-minutes').value, 10) || 0;

    var result = new Date(base);
    result.setFullYear(result.getFullYear() + sign * years);
    result.setMonth(result.getMonth() + sign * months);
    result.setDate(result.getDate() + sign * days);
    result.setHours(result.getHours() + sign * hours);
    result.setMinutes(result.getMinutes() + sign * mins);

    var el = document.getElementById('add-result');
    el.style.display = 'block';
    el.innerHTML =
      '<div class="result-label">Result</div>' +
      '<div class="result-value" style="font-size:1.1rem">' + result.toLocaleString() + '</div>' +
      '<div style="font-size:0.85rem;color:var(--fg-muted);margin-top:0.25rem">Unix: ' + Math.floor(result.getTime() / 1000) + '</div>' +
      '<button class="btn btn-secondary btn-sm mt-1" onclick="mtools.copyToClipboard(\'' + result.toISOString() + '\', \'Copied\')">Copy ISO</button>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var now = new Date();
    document.getElementById('date-start').value = toLocalInputValue(now);
    document.getElementById('date-end').value = toLocalInputValue(new Date(now.getTime() + 86400000 * 7));
    document.getElementById('base-date').value = toLocalInputValue(now);

    document.getElementById('btn-calc-diff').addEventListener('click', calcDiff);
    document.getElementById('btn-now-start').addEventListener('click', function () {
      document.getElementById('date-start').value = toLocalInputValue(new Date());
    });
    document.getElementById('btn-now-end').addEventListener('click', function () {
      document.getElementById('date-end').value = toLocalInputValue(new Date());
    });
    document.getElementById('btn-add').addEventListener('click', function () { calcAdd(1); });
    document.getElementById('btn-sub').addEventListener('click', function () { calcAdd(-1); });

    calcDiff();
  });
})();
