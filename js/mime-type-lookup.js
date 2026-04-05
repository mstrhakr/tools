(function () {
  'use strict';

  var TYPES = [
    { mime: 'application/json', extensions: ['json', 'map'], note: 'Structured data and API payloads.' },
    { mime: 'application/ld+json', extensions: ['jsonld'], note: 'JSON-LD linked data documents.' },
    { mime: 'application/javascript', extensions: ['js', 'mjs', 'cjs'], note: 'JavaScript source modules and scripts.' },
    { mime: 'application/typescript', extensions: ['ts', 'tsx'], note: 'TypeScript source files.' },
    { mime: 'application/xml', extensions: ['xml', 'xsd', 'xsl'], note: 'Generic XML documents and schemas.' },
    { mime: 'application/yaml', extensions: ['yaml', 'yml'], note: 'YAML configuration files.' },
    { mime: 'application/pdf', extensions: ['pdf'], note: 'Portable Document Format.' },
    { mime: 'application/zip', extensions: ['zip'], note: 'ZIP archives.' },
    { mime: 'application/gzip', extensions: ['gz'], note: 'Gzip-compressed files.' },
    { mime: 'application/x-tar', extensions: ['tar'], note: 'Tape archive container.' },
    { mime: 'application/x-7z-compressed', extensions: ['7z'], note: '7-Zip archives.' },
    { mime: 'application/vnd.ms-excel', extensions: ['xls'], note: 'Legacy Excel spreadsheets.' },
    { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extensions: ['xlsx'], note: 'Modern Excel spreadsheets.' },
    { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['docx'], note: 'Modern Word documents.' },
    { mime: 'application/octet-stream', extensions: ['bin', 'exe', 'dll'], note: 'Generic binary payload.' },
    { mime: 'text/plain', extensions: ['txt', 'log', 'conf'], note: 'Plain text and log output.' },
    { mime: 'text/html', extensions: ['html', 'htm'], note: 'HTML documents.' },
    { mime: 'text/css', extensions: ['css'], note: 'Stylesheets.' },
    { mime: 'text/csv', extensions: ['csv'], note: 'Comma-separated values.' },
    { mime: 'text/markdown', extensions: ['md', 'markdown'], note: 'Markdown source text.' },
    { mime: 'image/png', extensions: ['png'], note: 'Portable Network Graphics.' },
    { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], note: 'JPEG images.' },
    { mime: 'image/gif', extensions: ['gif'], note: 'GIF images.' },
    { mime: 'image/svg+xml', extensions: ['svg'], note: 'Scalable Vector Graphics.' },
    { mime: 'image/webp', extensions: ['webp'], note: 'WebP images.' },
    { mime: 'font/woff', extensions: ['woff'], note: 'Web Open Font Format.' },
    { mime: 'font/woff2', extensions: ['woff2'], note: 'Compressed Web Open Font Format.' },
    { mime: 'audio/mpeg', extensions: ['mp3'], note: 'MPEG audio layer III.' },
    { mime: 'video/mp4', extensions: ['mp4'], note: 'MPEG-4 video container.' },
    { mime: 'multipart/form-data', extensions: [], note: 'HTML form upload payload.' }
  ];

  function normalizeExtension(query) {
    return query.replace(/^\./, '').toLowerCase();
  }

  function renderType(entry) {
    return '<div class="result mt-2">' +
      '<div class="result-label">MIME type</div>' +
      '<div class="result-value" style="font-size:1rem">' + window.mtools.escapeHtml(entry.mime) + '</div>' +
      '<div class="mt-1">Extensions: ' + window.mtools.escapeHtml(entry.extensions.length ? entry.extensions.join(', ') : 'none') + '</div>' +
      '<div class="text-muted mt-1">' + window.mtools.escapeHtml(entry.note) + '</div>' +
      '</div>';
  }

  function renderExtension(entries, extension) {
    var rows = entries.map(function (entry) {
      return '<tr><td>' + window.mtools.escapeHtml(extension) + '</td><td>' + window.mtools.escapeHtml(entry.mime) + '</td><td>' + window.mtools.escapeHtml(entry.note) + '</td></tr>';
    }).join('');
    return '<table class="conversion-table mt-2"><thead><tr><th>Extension</th><th>MIME type</th><th>Notes</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function render() {
    var query = document.getElementById('mime-query').value.trim();
    var results = document.getElementById('mime-results');

    if (!query) {
      results.innerHTML = '<div class="text-muted mt-2">Enter an extension or MIME type.</div>';
      return;
    }

    if (query.indexOf('/') !== -1) {
      var foundType = TYPES.find(function (entry) {
        return entry.mime.toLowerCase() === query.toLowerCase();
      });
      results.innerHTML = foundType
        ? renderType(foundType)
        : '<div class="tool-section mt-2"><div class="text-error">No local match for that MIME type.</div></div>';
      return;
    }

    var extension = normalizeExtension(query);
    var matches = TYPES.filter(function (entry) {
      return entry.extensions.indexOf(extension) !== -1;
    });

    results.innerHTML = matches.length
      ? renderExtension(matches, extension)
      : '<div class="tool-section mt-2"><div class="text-error">No local match for that extension.</div></div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-mime').addEventListener('click', render);
    document.getElementById('mime-query').addEventListener('input', render);
    render();
  });
})();