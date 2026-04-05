(function () {
  'use strict';

  function parseLine(line, index) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === '#') return null;

    if (trimmed.indexOf('export ') === 0) trimmed = trimmed.slice(7).trim();
    var eq = trimmed.indexOf('=');
    if (eq <= 0) throw new Error('Invalid assignment at line ' + (index + 1));

    var key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error('Invalid key at line ' + (index + 1) + ': ' + key);
    }

    var valueRaw = trimmed.slice(eq + 1).trim();
    var value;

    if ((valueRaw.charAt(0) === '"' && valueRaw.charAt(valueRaw.length - 1) === '"') ||
        (valueRaw.charAt(0) === "'" && valueRaw.charAt(valueRaw.length - 1) === "'")) {
      var quote = valueRaw.charAt(0);
      value = valueRaw.slice(1, -1);
      if (quote === '"') {
        value = value
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    } else {
      var hash = valueRaw.indexOf(' #');
      if (hash !== -1) valueRaw = valueRaw.slice(0, hash).trim();
      value = valueRaw;
    }

    return { key: key, value: value };
  }

  function quoteIfNeeded(value) {
    if (value === '') return '""';
    if (/^[A-Za-z0-9_./:@-]+$/.test(value)) return value;
    return '"' + value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') + '"';
  }

  function parseEnv(input) {
    var map = {};
    input.split(/\r?\n/).forEach(function (line, index) {
      var pair = parseLine(line, index);
      if (!pair) return;
      map[pair.key] = pair.value;
    });
    return map;
  }

  function render() {
    var input = document.getElementById('env-input').value;
    var jsonOut = document.getElementById('env-json-output');
    var envOut = document.getElementById('env-normalized-output');
    var status = document.getElementById('env-status');

    try {
      var parsed = parseEnv(input);
      var keys = Object.keys(parsed).sort();
      jsonOut.value = JSON.stringify(parsed, null, 2);
      envOut.value = keys.map(function (key) {
        return key + '=' + quoteIfNeeded(parsed[key]);
      }).join('\n');
      status.className = 'mt-1 text-success';
      status.textContent = keys.length + ' variable' + (keys.length === 1 ? '' : 's') + ' parsed.';
    } catch (error) {
      jsonOut.value = '';
      envOut.value = '';
      status.className = 'mt-1 text-error';
      status.textContent = error.message || 'Failed to parse env input.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sample = [
      'APP_ENV=development',
      'PORT=3000',
      'DEBUG=true',
      'DATABASE_URL="postgres://user:pass@localhost:5432/app"',
      'API_KEY=abc123xyz'
    ].join('\n');

    document.getElementById('env-input').value = sample;
    document.getElementById('btn-env-parse').addEventListener('click', render);
    document.getElementById('env-input').addEventListener('input', render);
    document.getElementById('btn-env-copy-json').addEventListener('click', function () {
      var out = document.getElementById('env-json-output').value;
      if (out) window.mtools.copyToClipboard(out, 'Copied JSON');
    });
    document.getElementById('btn-env-copy-env').addEventListener('click', function () {
      var out = document.getElementById('env-normalized-output').value;
      if (out) window.mtools.copyToClipboard(out, 'Copied env');
    });
    render();
  });
})();