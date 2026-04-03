(function () {
  'use strict';

  var matchTimeout = null;

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getFlags() {
    var flags = '';
    ['g', 'i', 'm', 's', 'u'].forEach(function (f) {
      if (document.getElementById('flag-' + f).checked) flags += f;
    });
    return flags;
  }

  function highlight(text, regex) {
    if (!regex.global) {
      // Single match: highlight only first
      return escapeHtml(text).replace(escapeHtml(text.match(regex) && text.match(regex)[0] || ''), function (m) {
        return '<mark>' + m + '</mark>';
      });
    }
    var result = '';
    var lastIndex = 0;
    var match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      result += escapeHtml(text.slice(lastIndex, match.index));
      result += '<mark>' + escapeHtml(match[0]) + '</mark>';
      lastIndex = match.index + match[0].length;
      if (match[0].length === 0) {
        result += escapeHtml(text[lastIndex] || '');
        lastIndex++;
        regex.lastIndex = lastIndex;
      }
    }
    result += escapeHtml(text.slice(lastIndex));
    return result;
  }

  function run() {
    var pattern = document.getElementById('regex-pattern').value;
    var testStr = document.getElementById('regex-test').value;
    var errorEl = document.getElementById('regex-error');
    var preview = document.getElementById('regex-preview');
    var matchList = document.getElementById('regex-matches');
    var statsEl = document.getElementById('regex-stats');

    errorEl.style.display = 'none';
    preview.innerHTML = escapeHtml(testStr);
    matchList.innerHTML = '';
    statsEl.textContent = '';

    if (!pattern) return;

    var flags = getFlags();
    var regex;
    try {
      regex = new RegExp(pattern, flags);
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.style.display = 'block';
      return;
    }

    // Highlight in preview
    try {
      preview.innerHTML = highlight(testStr, new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'));
    } catch (e) { /* ignore */ }

    // Collect matches
    var allMatches = [];
    var re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    re.lastIndex = 0;
    var m;
    while ((m = re.exec(testStr)) !== null) {
      allMatches.push(m);
      if (m[0].length === 0) re.lastIndex++;
      if (allMatches.length > 500) break;
    }

    statsEl.textContent = allMatches.length + ' match' + (allMatches.length !== 1 ? 'es' : '');

    allMatches.forEach(function (m, i) {
      var row = document.createElement('div');
      row.className = 'result mt-1';
      var groups = '';
      if (m.length > 1) {
        groups = '<div class="result-label mt-1">groups</div>';
        for (var g = 1; g < m.length; g++) {
          groups += '<div style="font-size:0.8rem">$' + g + ': ' + escapeHtml(m[g] !== undefined ? m[g] : '(undefined)') + '</div>';
        }
      }
      row.innerHTML =
        '<div class="result-label">match ' + (i + 1) + ' &middot; index ' + m.index + '</div>' +
        '<div style="word-break:break-all"><mark>' + escapeHtml(m[0]) + '</mark></div>' +
        groups;
      matchList.appendChild(row);
    });

    if (allMatches.length === 0) {
      var row = document.createElement('div');
      row.className = 'result mt-1';
      row.style.color = 'var(--fg-muted)';
      row.textContent = 'no matches';
      matchList.appendChild(row);
    }
  }

  function init() {
    ['regex-pattern', 'regex-test'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () {
        clearTimeout(matchTimeout);
        matchTimeout = setTimeout(run, 150);
      });
    });
    ['g', 'i', 'm', 's', 'u'].forEach(function (f) {
      document.getElementById('flag-' + f).addEventListener('change', run);
    });
    document.getElementById('clear-btn').addEventListener('click', function () {
      document.getElementById('regex-pattern').value = '';
      document.getElementById('regex-test').value = '';
      run();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
