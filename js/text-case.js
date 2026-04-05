(function () {
  'use strict';

  function splitWords(input) {
    var normalized = input
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_\-]+/g, ' ')
      .replace(/[^A-Za-z0-9\s]+/g, ' ')
      .trim();

    return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  }

  function capitalize(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  function toSentenceCase(input) {
    return input
      .toLowerCase()
      .replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, function (match) {
        return match.toUpperCase();
      });
  }

  function toTitleCase(words) {
    return words.map(capitalize).join(' ');
  }

  function buildOutputs(input) {
    var words = splitWords(input);
    var lowerWords = words.map(function (word) { return word.toLowerCase(); });
    var titleWords = words.map(capitalize);

    return [
      { label: 'lowercase', value: input.toLowerCase() },
      { label: 'UPPERCASE', value: input.toUpperCase() },
      { label: 'Sentence case', value: toSentenceCase(input) },
      { label: 'Title Case', value: toTitleCase(words) },
      {
        label: 'camelCase',
        value: lowerWords.length
          ? lowerWords[0] + titleWords.slice(1).join('')
          : ''
      },
      { label: 'PascalCase', value: titleWords.join('') },
      { label: 'snake_case', value: lowerWords.join('_') },
      { label: 'kebab-case', value: lowerWords.join('-') },
      { label: 'CONSTANT_CASE', value: lowerWords.join('_').toUpperCase() }
    ];
  }

  function render() {
    var input = document.getElementById('case-input').value;
    var container = document.getElementById('case-results');

    if (!input.trim()) {
      container.innerHTML = '<div class="text-muted">Results appear here as you type.</div>';
      return;
    }

    var rows = buildOutputs(input).map(function (item, index) {
      return '<tr>' +
        '<td>' + window.mtools.escapeHtml(item.label) + '</td>' +
        '<td style="font-family:monospace">' + window.mtools.escapeHtml(item.value) + '</td>' +
        '<td><button class="btn btn-secondary btn-sm" data-copy-index="' + index + '">copy</button></td>' +
        '</tr>';
    }).join('');

    container.innerHTML = '<table class="conversion-table"><thead><tr><th>Style</th><th>Value</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';

    Array.prototype.forEach.call(container.querySelectorAll('[data-copy-index]'), function (button) {
      button.addEventListener('click', function () {
        var item = buildOutputs(input)[parseInt(button.getAttribute('data-copy-index'), 10)];
        window.mtools.copyToClipboard(item.value, 'Copied ' + item.label);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('case-input').addEventListener('input', render);
    render();
  });
})();