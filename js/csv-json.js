(function () {
  'use strict';

  var rawOutput = '';

  function showStatus(msg, isError) {
    var el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = (isError ? 'text-error' : 'text-success') + ' mb-1';
    el.style.display = 'block';
  }

  function parseCSV(text, delim) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) throw new Error('CSV needs at least a header row and one data row');

    function parseLine(line) {
      var cells = [], cur = '', inQ = false;
      for (var i = 0; i < line.length; i++) {
        var c = line[i];
        if (c === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQ = !inQ; }
        } else if (c === delim && !inQ) {
          cells.push(cur); cur = '';
        } else {
          cur += c;
        }
      }
      cells.push(cur);
      return cells;
    }

    var headers = parseLine(lines[0]);
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      var cells = parseLine(lines[i]);
      var obj = {};
      headers.forEach(function (h, idx) { obj[h] = cells[idx] !== undefined ? cells[idx] : ''; });
      rows.push(obj);
    }
    return rows;
  }

  function toCSV(arr, delim) {
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('JSON must be a non-empty array of objects');
    var headers = Object.keys(arr[0]);

    function escape(v) {
      var s = String(v === null || v === undefined ? '' : v);
      if (s.includes(delim) || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    var lines = [headers.map(escape).join(delim)];
    arr.forEach(function (row) {
      lines.push(headers.map(function (h) { return escape(row[h]); }).join(delim));
    });
    return lines.join('\n');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input  = document.getElementById('csv-input');
    var output = document.getElementById('csv-output');
    var delimEl = document.getElementById('csv-delimiter');

    document.getElementById('btn-to-json').addEventListener('click', function () {
      document.getElementById('status-msg').style.display = 'none';
      try {
        var delim = delimEl.value || ',';
        var rows = parseCSV(input.value.trim(), delim);
        rawOutput = JSON.stringify(rows, null, 2);
        output.value = rawOutput;
        showStatus('Converted ' + rows.length + ' rows to JSON', false);
      } catch (e) {
        showStatus(e.message, true);
      }
    });

    document.getElementById('btn-to-csv').addEventListener('click', function () {
      document.getElementById('status-msg').style.display = 'none';
      try {
        var arr = JSON.parse(input.value.trim());
        var delim = delimEl.value || ',';
        rawOutput = toCSV(arr, delim);
        output.value = rawOutput;
        showStatus('Converted ' + arr.length + ' rows to CSV', false);
      } catch (e) {
        showStatus('Invalid JSON: ' + e.message, true);
      }
    });

    document.getElementById('btn-clear').addEventListener('click', function () {
      input.value = '';
      output.value = '';
      rawOutput = '';
      document.getElementById('status-msg').style.display = 'none';
    });

    document.getElementById('btn-copy').addEventListener('click', function () {
      if (rawOutput) mtools.copyToClipboard(rawOutput, 'Copied');
    });
  });
})();
