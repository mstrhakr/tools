(function () {
  'use strict';

  function parseInput(raw, format) {
    if (!raw.trim()) throw new Error('Input is empty.');
    if (format === 'json') return JSON.parse(raw);
    return jsyaml.load(raw);
  }

  function validate(doc) {
    var errors = [];

    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      errors.push('Top-level document must be an object.');
      return errors;
    }

    if (!doc.openapi && !doc.swagger) {
      errors.push('Missing version field: openapi (v3) or swagger (v2).');
    }

    if (!doc.info || typeof doc.info !== 'object') {
      errors.push('Missing top-level info object.');
    } else {
      if (!doc.info.title) errors.push('info.title is required.');
      if (!doc.info.version) errors.push('info.version is required.');
    }

    if (!doc.paths || typeof doc.paths !== 'object') {
      errors.push('paths object is required.');
    } else {
      Object.keys(doc.paths).forEach(function (path) {
        var item = doc.paths[path];
        if (!item || typeof item !== 'object') {
          errors.push('Path item must be an object: ' + path);
          return;
        }

        var methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
        methods.forEach(function (method) {
          if (!item[method]) return;
          var op = item[method];
          if (!op.responses || typeof op.responses !== 'object' || !Object.keys(op.responses).length) {
            errors.push(path + ' ' + method.toUpperCase() + ' must define responses.');
          }
        });
      });
    }

    return errors;
  }

  function renderErrors(errors) {
    return '<div class="tool-section mt-2"><h2>Issues</h2>' +
      errors.map(function (message) {
        return '<div class="result mt-1"><div class="text-error">' + window.mtools.escapeHtml(message) + '</div></div>';
      }).join('') +
      '</div>';
  }

  function run() {
    var format = document.getElementById('oav-format').value;
    var raw = document.getElementById('oav-input').value;
    var status = document.getElementById('oav-status');
    var results = document.getElementById('oav-results');

    try {
      var doc = parseInput(raw, format);
      var issues = validate(doc);
      if (!issues.length) {
        status.className = 'mt-1 text-success';
        status.textContent = 'OpenAPI checks passed.';
        results.innerHTML = '';
      } else {
        status.className = 'mt-1 text-error';
        status.textContent = issues.length + ' issue' + (issues.length === 1 ? '' : 's') + ' found.';
        results.innerHTML = renderErrors(issues);
      }
    } catch (error) {
      status.className = 'mt-1 text-error';
      status.textContent = error.message || 'Failed to parse input.';
      results.innerHTML = '';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('oav-input').value = [
      'openapi: 3.0.3',
      'info:',
      '  title: Example API',
      '  version: 1.0.0',
      'paths:',
      '  /users:',
      '    get:',
      '      responses:',
      "        '200':",
      '          description: ok'
    ].join('\n');
    document.getElementById('btn-oav-validate').addEventListener('click', run);
    document.getElementById('oav-format').addEventListener('change', run);
    document.getElementById('oav-input').addEventListener('input', run);
    run();
  });
})();