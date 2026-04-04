(function () {
  'use strict';

  // Myers diff — line-level
  function lcs(a, b) {
    var m = a.length, n = b.length;
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = new Array(n + 1).fill(0);
    }
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    // Backtrack
    var result = [];
    var i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift({ type: 'equal', val: a[i - 1] });
        i--; j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        result.unshift({ type: 'removed', val: a[i - 1] });
        i--;
      } else {
        result.unshift({ type: 'added', val: b[j - 1] });
        j--;
      }
    }
    while (i > 0) { result.unshift({ type: 'removed', val: a[i - 1] }); i--; }
    while (j > 0) { result.unshift({ type: 'added', val: b[j - 1] }); j--; }
    return result;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function diff() {
    var a = document.getElementById('diff-a').value;
    var b = document.getElementById('diff-b').value;
    var outputEl = document.getElementById('diff-output');
    var sectionEl = document.getElementById('diff-output-section');
    var statsEl = document.getElementById('diff-stats');

    var linesA = a.split('\n');
    var linesB = b.split('\n');

    var changes = lcs(linesA, linesB);

    var added = 0, removed = 0;
    var html = '';
    var lineA = 1, lineB = 1;

    changes.forEach(function (c) {
      var cls, prefix, gutterA = '', gutterB = '';
      if (c.type === 'equal') {
        cls = 'diff-equal';
        prefix = ' ';
        gutterA = lineA++;
        gutterB = lineB++;
      } else if (c.type === 'added') {
        cls = 'diff-added';
        prefix = '+';
        gutterB = lineB++;
        added++;
      } else {
        cls = 'diff-removed';
        prefix = '-';
        gutterA = lineA++;
        removed++;
      }
      html += '<span class="diff-line ' + cls + '">' +
        '<span class="diff-gutter">' + (gutterA || ' ') + '</span>' +
        '<span class="diff-gutter">' + (gutterB || ' ') + '</span>' +
        prefix + ' ' + escapeHtml(c.val) +
        '</span>';
    });

    outputEl.innerHTML = html || '<span class="text-muted">No differences</span>';
    sectionEl.style.display = 'block';

    statsEl.textContent = '+' + added + ' additions  −' + removed + ' removals';
    statsEl.style.display = 'block';
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-diff').addEventListener('click', diff);

    document.getElementById('btn-swap').addEventListener('click', function () {
      var a = document.getElementById('diff-a');
      var b = document.getElementById('diff-b');
      var tmp = a.value;
      a.value = b.value;
      b.value = tmp;
    });

    document.getElementById('btn-clear').addEventListener('click', function () {
      document.getElementById('diff-a').value = '';
      document.getElementById('diff-b').value = '';
      document.getElementById('diff-output').innerHTML = '';
      document.getElementById('diff-output-section').style.display = 'none';
      document.getElementById('diff-stats').style.display = 'none';
    });
  });
})();
