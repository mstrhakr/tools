(function () {
  'use strict';

  var firstNames = ['Alex', 'Taylor', 'Jordan', 'Sam', 'Morgan', 'Casey', 'Avery', 'Riley', 'Jamie', 'Quinn'];
  var lastNames = ['Smith', 'Johnson', 'Miller', 'Davis', 'Brown', 'Wilson', 'Moore', 'Lee', 'Walker', 'Young'];
  var companies = ['Acme Labs', 'Blue Orbit', 'Northwind', 'Pixel Foundry', 'DevCore', 'Cloud Harbor', 'SignalStack'];

  function hashSeed(seed) {
    var h = 2166136261;
    for (var i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  }

  function rngFactory(seedText) {
    var state = seedText ? hashSeed(seedText) : (crypto.getRandomValues(new Uint32Array(1))[0] >>> 0);
    return function () {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function pick(rand, arr) {
    return arr[Math.floor(rand() * arr.length)];
  }

  function randInt(rand, min, max) {
    return Math.floor(rand() * (max - min + 1)) + min;
  }

  function row(rand, index) {
    var first = pick(rand, firstNames);
    var last = pick(rand, lastNames);
    var fullName = first + ' ' + last;
    var username = (first + '.' + last + randInt(rand, 1, 999)).toLowerCase();
    var domain = pick(rand, ['example.com', 'dev.local', 'test.io', 'corp.net']);
    var id = crypto.randomUUID ? crypto.randomUUID() : String(index + 1);
    var createdAt = new Date(Date.now() - randInt(rand, 0, 365 * 24 * 60 * 60) * 1000).toISOString();
    return {
      id: id,
      fullName: fullName,
      email: username + '@' + domain,
      username: username,
      company: pick(rand, companies),
      ipAddress: [randInt(rand, 1, 223), randInt(rand, 0, 255), randInt(rand, 0, 255), randInt(rand, 1, 254)].join('.'),
      createdAt: createdAt,
      active: rand() > 0.35
    };
  }

  function toCsv(rows) {
    if (!rows.length) return '';
    var keys = Object.keys(rows[0]);
    var lines = [keys.join(',')];
    rows.forEach(function (record) {
      lines.push(keys.map(function (key) {
        var val = String(record[key]);
        return '"' + val.replace(/"/g, '""') + '"';
      }).join(','));
    });
    return lines.join('\n');
  }

  function generate() {
    var count = Math.min(500, Math.max(1, parseInt(document.getElementById('tdg-count').value, 10) || 10));
    var format = document.getElementById('tdg-format').value;
    var seed = document.getElementById('tdg-seed').value.trim();
    var rand = rngFactory(seed);

    var rows = [];
    for (var i = 0; i < count; i++) rows.push(row(rand, i));

    var output = '';
    if (format === 'json') output = JSON.stringify(rows, null, 2);
    else if (format === 'ndjson') output = rows.map(function (r) { return JSON.stringify(r); }).join('\n');
    else output = toCsv(rows);

    document.getElementById('tdg-output').value = output;
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['tdg-count', 'tdg-format', 'tdg-seed'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', generate);
      document.getElementById(id).addEventListener('change', generate);
    });
    document.getElementById('btn-tdg-generate').addEventListener('click', generate);
    document.getElementById('btn-tdg-copy').addEventListener('click', function () {
      var output = document.getElementById('tdg-output').value;
      if (output) window.mtools.copyToClipboard(output, 'Copied test data');
    });
    generate();
  });
})();