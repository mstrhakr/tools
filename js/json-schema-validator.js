(function () {
  'use strict';

  function parseJson(input, label) {
    try {
      return JSON.parse(input);
    } catch (error) {
      throw new Error('Invalid ' + label + ' JSON: ' + error.message);
    }
  }

  function renderErrors(errors) {
    if (!errors || !errors.length) return '';
    return '<div class="tool-section mt-2"><h2>Validation Errors</h2>' +
      errors.map(function (err) {
        var path = err.instancePath || '/';
        return '<div class="result mt-1"><div class="result-label">' + window.mtools.escapeHtml(path) + '</div><div>' + window.mtools.escapeHtml(err.message || 'Validation error') + '</div></div>';
      }).join('') +
      '</div>';
  }

  function validate() {
    var status = document.getElementById('jsv-status');
    var results = document.getElementById('jsv-results');

    try {
      if (!window.ajv2020 || !window.ajv2020.Ajv2020) {
        throw new Error('Ajv library failed to load.');
      }

      var schema = parseJson(document.getElementById('jsv-schema').value, 'schema');
      var data = parseJson(document.getElementById('jsv-data').value, 'data');

      var ajv = new window.ajv2020.Ajv2020({ allErrors: true, strict: false });
      var validator = ajv.compile(schema);
      var ok = validator(data);

      if (ok) {
        status.className = 'mt-2 text-success';
        status.textContent = 'Validation passed.';
        results.innerHTML = '';
      } else {
        status.className = 'mt-2 text-error';
        status.textContent = 'Validation failed.';
        results.innerHTML = renderErrors(validator.errors);
      }
    } catch (error) {
      status.className = 'mt-2 text-error';
      status.textContent = error.message || 'Validation failed.';
      results.innerHTML = '';
    }
  }

  function formatInputs() {
    try {
      var schema = parseJson(document.getElementById('jsv-schema').value, 'schema');
      var data = parseJson(document.getElementById('jsv-data').value, 'data');
      document.getElementById('jsv-schema').value = JSON.stringify(schema, null, 2);
      document.getElementById('jsv-data').value = JSON.stringify(data, null, 2);
      validate();
    } catch (error) {
      document.getElementById('jsv-status').className = 'mt-2 text-error';
      document.getElementById('jsv-status').textContent = error.message || 'Could not format input.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('jsv-schema').value = '{\n  "type": "object",\n  "required": ["name", "age"],\n  "properties": {\n    "name": { "type": "string", "minLength": 1 },\n    "age": { "type": "integer", "minimum": 0 }\n  },\n  "additionalProperties": false\n}';
    document.getElementById('jsv-data').value = '{\n  "name": "Alice",\n  "age": 32\n}';

    document.getElementById('btn-jsv-validate').addEventListener('click', validate);
    document.getElementById('btn-jsv-format').addEventListener('click', formatInputs);
    document.getElementById('jsv-schema').addEventListener('input', validate);
    document.getElementById('jsv-data').addEventListener('input', validate);
    validate();
  });
})();