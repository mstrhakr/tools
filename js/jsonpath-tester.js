(function () {
  'use strict';

  function tokenize(path) {
    if (!path || path.charAt(0) !== '$') throw new Error('Path must start with $.');
    var rest = path.slice(1);
    var tokens = [];
    var i = 0;

    while (i < rest.length) {
      if (rest.charAt(i) === '.') {
        i += 1;
        var key = '';
        while (i < rest.length && /[A-Za-z0-9_$]/.test(rest.charAt(i))) {
          key += rest.charAt(i);
          i += 1;
        }
        if (!key) throw new Error('Invalid dot-key token in path.');
        tokens.push({ type: 'key', value: key });
      } else if (rest.charAt(i) === '[') {
        var end = rest.indexOf(']', i);
        if (end === -1) throw new Error('Missing ] in path.');
        var inside = rest.slice(i + 1, end).trim();
        if (inside === '*') {
          tokens.push({ type: 'wildcard' });
        } else if (/^\d+$/.test(inside)) {
          tokens.push({ type: 'index', value: parseInt(inside, 10) });
        } else {
          throw new Error('Unsupported bracket token: [' + inside + ']');
        }
        i = end + 1;
      } else {
        throw new Error('Unexpected token near: ' + rest.slice(i));
      }
    }

    return tokens;
  }

  function evaluate(root, tokens) {
    var current = [root];

    tokens.forEach(function (token) {
      var next = [];
      current.forEach(function (item) {
        if (token.type === 'key') {
          if (item && Object.prototype.hasOwnProperty.call(item, token.value)) {
            next.push(item[token.value]);
          }
        } else if (token.type === 'index') {
          if (Array.isArray(item) && token.value < item.length) {
            next.push(item[token.value]);
          }
        } else if (token.type === 'wildcard') {
          if (Array.isArray(item)) {
            item.forEach(function (entry) { next.push(entry); });
          } else if (item && typeof item === 'object') {
            Object.keys(item).forEach(function (key) { next.push(item[key]); });
          }
        }
      });
      current = next;
    });

    return current;
  }

  function run() {
    var path = document.getElementById('jpt-path').value.trim();
    var input = document.getElementById('jpt-json').value;
    var output = document.getElementById('jpt-output');
    var status = document.getElementById('jpt-status');

    try {
      var json = JSON.parse(input);
      var tokens = tokenize(path);
      var matches = evaluate(json, tokens);
      output.value = JSON.stringify(matches, null, 2);
      status.className = 'mt-2 text-success';
      status.textContent = matches.length + ' match' + (matches.length === 1 ? '' : 'es') + ' found.';
    } catch (error) {
      output.value = '';
      status.className = 'mt-2 text-error';
      status.textContent = error.message || 'Failed to evaluate path.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('jpt-json').value = '{\n  "users": [\n    { "id": 1, "email": "alice@example.com", "roles": ["admin", "user"] },\n    { "id": 2, "email": "bob@example.com", "roles": ["user"] }\n  ]\n}';
    document.getElementById('btn-jpt-run').addEventListener('click', run);
    document.getElementById('jpt-path').addEventListener('input', run);
    document.getElementById('jpt-json').addEventListener('input', run);
    document.getElementById('btn-jpt-copy').addEventListener('click', function () {
      var val = document.getElementById('jpt-output').value;
      if (val) window.mtools.copyToClipboard(val, 'Copied matches');
    });
    run();
  });
})();