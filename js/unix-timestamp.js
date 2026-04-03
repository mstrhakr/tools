(function () {
  'use strict';

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function formatUTC(d) {
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
      ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' UTC';
  }

  function formatLocal(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' Local';
  }

  // Live clock
  function tick() {
    var now = new Date();
    var ts = Math.floor(now.getTime() / 1000);
    document.getElementById('live-timestamp').textContent = ts;
    document.getElementById('live-utc').textContent = formatUTC(now);
    document.getElementById('live-local').textContent = formatLocal(now);
  }

  // Timestamp to date
  function tsToDate() {
    var val = document.getElementById('ts-input').value.trim();
    var el = document.getElementById('ts-result');
    if (!val) {
      el.innerHTML = '<span class="text-muted">Enter a timestamp above</span>';
      return;
    }

    var num = parseInt(val, 10);
    if (isNaN(num)) {
      el.innerHTML = '<span class="text-error">Invalid timestamp</span>';
      return;
    }

    // Auto-detect seconds vs milliseconds (timestamps after year 2100 in seconds = ~4102444800)
    var ms = num > 9999999999 ? num : num * 1000;
    var d = new Date(ms);

    if (isNaN(d.getTime())) {
      el.innerHTML = '<span class="text-error">Invalid timestamp</span>';
      return;
    }

    el.innerHTML =
      '<div class="mb-1"><span class="result-label">UTC:</span> ' + formatUTC(d) + '</div>' +
      '<div class="mb-1"><span class="result-label">Local:</span> ' + formatLocal(d) + '</div>' +
      '<div class="mb-1"><span class="result-label">ISO 8601:</span> ' + d.toISOString() + '</div>' +
      '<div><span class="result-label">Seconds:</span> ' + Math.floor(ms / 1000) +
      ' &middot; <span class="result-label">Milliseconds:</span> ' + ms + '</div>';
  }

  // Date to timestamp
  function dateToTs() {
    var val = document.getElementById('date-input').value;
    var el = document.getElementById('date-result');
    if (!val) {
      el.innerHTML = '<span class="text-muted">Select a date above</span>';
      return;
    }

    var d = new Date(val);
    if (isNaN(d.getTime())) {
      el.innerHTML = '<span class="text-error">Invalid date</span>';
      return;
    }

    var sec = Math.floor(d.getTime() / 1000);
    var ms = d.getTime();

    el.innerHTML =
      '<div class="mb-1"><span class="result-label">Unix Timestamp (s):</span> <strong class="text-accent">' + sec + '</strong>' +
      ' <button class="btn btn-sm btn-secondary" onclick="mtools.copyToClipboard(\'' + sec + '\', \'Timestamp copied\')">copy</button></div>' +
      '<div><span class="result-label">Unix Timestamp (ms):</span> <strong class="text-accent">' + ms + '</strong>' +
      ' <button class="btn btn-sm btn-secondary" onclick="mtools.copyToClipboard(\'' + ms + '\', \'Timestamp copied\')">copy</button></div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    tick();
    setInterval(tick, 1000);
    document.getElementById('ts-input').addEventListener('input', tsToDate);
    document.getElementById('date-input').addEventListener('input', dateToTs);

    // Pre-fill date input with now
    var now = new Date();
    var local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    document.getElementById('date-input').value = local.toISOString().slice(0, 16);
    dateToTs();
  });
})();
