(function () {
  'use strict';

  var STOP_WORDS = {
    a: true, an: true, and: true, are: true, as: true, at: true, be: true, been: true,
    but: true, by: true, can: true, do: true, for: true, from: true, had: true, has: true,
    have: true, he: true, her: true, his: true, i: true, if: true, in: true, into: true,
    is: true, it: true, its: true, of: true, on: true, or: true, she: true, that: true,
    the: true, their: true, there: true, they: true, this: true, to: true, was: true,
    we: true, were: true, will: true, with: true, you: true, your: true
  };

  var lastRows = [];

  function tokenize(text) {
    var cleaned = text.toLowerCase().replace(/[^a-z0-9'\s]+/g, ' ');
    return cleaned.split(/\s+/).filter(Boolean);
  }

  function analyze() {
    var text = document.getElementById('wf-input').value;
    var limit = parseInt(document.getElementById('wf-limit').value, 10) || 25;
    var minLen = parseInt(document.getElementById('wf-minlen').value, 10) || 2;
    var ignoreStopWords = document.getElementById('wf-stopwords').value === 'yes';
    var tbody = document.querySelector('#wf-results tbody');
    var summary = document.getElementById('wf-summary');

    var words = tokenize(text).filter(function (word) {
      if (word.length < minLen) return false;
      return !ignoreStopWords || !STOP_WORDS[word];
    });

    if (!words.length) {
      lastRows = [];
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No matching words found.</td></tr>';
      summary.textContent = 'Enter text to begin analysis.';
      return;
    }

    var counts = {};
    words.forEach(function (word) {
      counts[word] = (counts[word] || 0) + 1;
    });

    var rows = Object.keys(counts).map(function (word) {
      return { word: word, count: counts[word] };
    }).sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.word.localeCompare(b.word);
    }).slice(0, limit);

    lastRows = rows;

    tbody.innerHTML = rows.map(function (row, index) {
      var share = ((row.count / words.length) * 100).toFixed(2) + '%';
      return '<tr>' +
        '<td>' + (index + 1) + '</td>' +
        '<td style="font-family:monospace">' + window.mtools.escapeHtml(row.word) + '</td>' +
        '<td>' + row.count.toLocaleString() + '</td>' +
        '<td>' + share + '</td>' +
        '</tr>';
    }).join('');

    summary.textContent = words.length.toLocaleString() + ' matched words, ' + Object.keys(counts).length.toLocaleString() + ' unique terms.';
  }

  function copyCsv() {
    if (!lastRows.length) return;
    var csv = 'rank,word,count\n' + lastRows.map(function (row, index) {
      return [index + 1, '"' + row.word.replace(/"/g, '""') + '"', row.count].join(',');
    }).join('\n');
    window.mtools.copyToClipboard(csv, 'Copied CSV');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-wf-run').addEventListener('click', analyze);
    document.getElementById('btn-wf-copy').addEventListener('click', copyCsv);
    document.getElementById('wf-input').addEventListener('input', analyze);
    document.getElementById('wf-limit').addEventListener('input', analyze);
    document.getElementById('wf-minlen').addEventListener('input', analyze);
    document.getElementById('wf-stopwords').addEventListener('change', analyze);
    analyze();
  });
})();