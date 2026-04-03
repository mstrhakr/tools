(function () {
  'use strict';

  function parseIP(str) {
    var parts = str.trim().split('.');
    if (parts.length !== 4) return null;
    var num = 0;
    for (var i = 0; i < 4; i++) {
      var p = parseInt(parts[i], 10);
      if (isNaN(p) || p < 0 || p > 255 || parts[i] !== '' + p) return null;
      num = (num * 256) + p;
    }
    return num >>> 0;
  }

  function intToIP(n) {
    return [
      (n >>> 24) & 255,
      (n >>> 16) & 255,
      (n >>> 8) & 255,
      n & 255
    ].join('.');
  }

  function cidrToMask(cidr) {
    if (cidr === 0) return 0;
    return (~0 << (32 - cidr)) >>> 0;
  }

  function intToBinary(n) {
    var s = '';
    for (var i = 31; i >= 0; i--) {
      s += (n >>> i) & 1;
      if (i > 0 && i % 8 === 0) s += '.';
    }
    return s;
  }

  function showError(msg) {
    var el = document.getElementById('subnet-error');
    if (msg) {
      el.textContent = msg;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  function makeStatItem(label, value) {
    return '<div class="stat-item">' +
      '<div class="stat-value" style="font-size:1rem;word-break:break-all">' + value + '</div>' +
      '<div class="stat-label">' + label + '</div>' +
      '</div>';
  }

  function calculate() {
    var ipStr = document.getElementById('ip-input').value;
    var cidr = parseInt(document.getElementById('cidr-input').value, 10);
    var results = document.getElementById('subnet-results');
    var tableWrapper = document.getElementById('subnet-table-wrapper');

    showError('');

    var ip = parseIP(ipStr);
    if (ip === null) {
      showError('Invalid IP address');
      results.innerHTML = '';
      tableWrapper.style.display = 'none';
      return;
    }

    if (isNaN(cidr) || cidr < 0 || cidr > 32) {
      showError('CIDR must be between 0 and 32');
      results.innerHTML = '';
      tableWrapper.style.display = 'none';
      return;
    }

    var mask = cidrToMask(cidr);
    var wildcard = (~mask) >>> 0;
    var network = (ip & mask) >>> 0;
    var broadcast = (network | wildcard) >>> 0;
    var firstHost, lastHost, usableHosts;

    if (cidr === 32) {
      firstHost = network;
      lastHost = network;
      usableHosts = 1;
    } else if (cidr === 31) {
      firstHost = network;
      lastHost = broadcast;
      usableHosts = 2;
    } else {
      firstHost = (network + 1) >>> 0;
      lastHost = (broadcast - 1) >>> 0;
      usableHosts = Math.pow(2, 32 - cidr) - 2;
      if (usableHosts < 0) usableHosts = 0;
    }

    var totalAddresses = Math.pow(2, 32 - cidr);

    var html = '<div class="stats-grid">';
    html += makeStatItem('Network Address', intToIP(network));
    html += makeStatItem('Broadcast Address', intToIP(broadcast));
    html += makeStatItem('Subnet Mask', intToIP(mask));
    html += makeStatItem('Wildcard Mask', intToIP(wildcard));
    html += makeStatItem('First Usable Host', intToIP(firstHost));
    html += makeStatItem('Last Usable Host', intToIP(lastHost));
    html += makeStatItem('Total Addresses', totalAddresses.toLocaleString());
    html += makeStatItem('Usable Hosts', usableHosts.toLocaleString());
    html += makeStatItem('CIDR Notation', intToIP(network) + '/' + cidr);
    html += makeStatItem('IP Class', getIPClass(network));
    html += makeStatItem('IP (Binary)', intToBinary(ip));
    html += makeStatItem('Mask (Binary)', intToBinary(mask));
    html += '</div>';

    results.innerHTML = html;

    // Quick reference table
    var tbody = document.querySelector('#subnet-table tbody');
    var rows = '';
    for (var c = 8; c <= 30; c++) {
      var m = cidrToMask(c);
      var total = Math.pow(2, 32 - c);
      var usable = c <= 1 ? total : total - 2;
      if (usable < 0) usable = 0;
      var highlight = c === cidr ? ' style="color:var(--accent);font-weight:600"' : '';
      rows += '<tr' + highlight + '>' +
        '<td>/' + c + '</td>' +
        '<td>' + intToIP(m) + '</td>' +
        '<td>' + total.toLocaleString() + '</td>' +
        '<td>' + usable.toLocaleString() + '</td>' +
        '</tr>';
    }
    tbody.innerHTML = rows;
    tableWrapper.style.display = 'block';
  }

  function getIPClass(ip) {
    var first = (ip >>> 24) & 255;
    if (first < 128) return 'A';
    if (first < 192) return 'B';
    if (first < 224) return 'C';
    if (first < 240) return 'D (multicast)';
    return 'E (reserved)';
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('ip-input').addEventListener('input', calculate);
    document.getElementById('cidr-input').addEventListener('input', calculate);
    calculate();
  });
})();
