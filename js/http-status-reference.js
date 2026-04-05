(function () {
  'use strict';

  var CODES = [
    { code: 100, name: 'Continue', cls: '1xx', meaning: 'Request headers received, continue with body.' },
    { code: 101, name: 'Switching Protocols', cls: '1xx', meaning: 'Server agrees to protocol upgrade.' },
    { code: 200, name: 'OK', cls: '2xx', meaning: 'Request succeeded.' },
    { code: 201, name: 'Created', cls: '2xx', meaning: 'Resource created successfully.' },
    { code: 202, name: 'Accepted', cls: '2xx', meaning: 'Request accepted for async processing.' },
    { code: 204, name: 'No Content', cls: '2xx', meaning: 'Success with empty body.' },
    { code: 301, name: 'Moved Permanently', cls: '3xx', meaning: 'Resource moved permanently.' },
    { code: 302, name: 'Found', cls: '3xx', meaning: 'Temporary redirect.' },
    { code: 304, name: 'Not Modified', cls: '3xx', meaning: 'Use cached representation.' },
    { code: 307, name: 'Temporary Redirect', cls: '3xx', meaning: 'Temporary redirect preserving method.' },
    { code: 308, name: 'Permanent Redirect', cls: '3xx', meaning: 'Permanent redirect preserving method.' },
    { code: 400, name: 'Bad Request', cls: '4xx', meaning: 'Malformed request syntax or validation failure.' },
    { code: 401, name: 'Unauthorized', cls: '4xx', meaning: 'Authentication is required or invalid.' },
    { code: 403, name: 'Forbidden', cls: '4xx', meaning: 'Authenticated but not allowed.' },
    { code: 404, name: 'Not Found', cls: '4xx', meaning: 'Resource not found.' },
    { code: 405, name: 'Method Not Allowed', cls: '4xx', meaning: 'Method not supported for resource.' },
    { code: 408, name: 'Request Timeout', cls: '4xx', meaning: 'Client took too long to send request.' },
    { code: 409, name: 'Conflict', cls: '4xx', meaning: 'Resource state conflict.' },
    { code: 410, name: 'Gone', cls: '4xx', meaning: 'Resource permanently removed.' },
    { code: 413, name: 'Payload Too Large', cls: '4xx', meaning: 'Request body exceeds server limits.' },
    { code: 415, name: 'Unsupported Media Type', cls: '4xx', meaning: 'Content-Type not supported.' },
    { code: 422, name: 'Unprocessable Content', cls: '4xx', meaning: 'Semantically invalid content.' },
    { code: 429, name: 'Too Many Requests', cls: '4xx', meaning: 'Rate limit exceeded.' },
    { code: 500, name: 'Internal Server Error', cls: '5xx', meaning: 'Unexpected server-side failure.' },
    { code: 501, name: 'Not Implemented', cls: '5xx', meaning: 'Feature or method not implemented.' },
    { code: 502, name: 'Bad Gateway', cls: '5xx', meaning: 'Upstream server returned invalid response.' },
    { code: 503, name: 'Service Unavailable', cls: '5xx', meaning: 'Server overloaded or down for maintenance.' },
    { code: 504, name: 'Gateway Timeout', cls: '5xx', meaning: 'Upstream timeout in gateway/proxy.' }
  ];

  function search(query) {
    var q = query.trim().toLowerCase();
    if (!q) return CODES;
    return CODES.filter(function (item) {
      return String(item.code).indexOf(q) !== -1 ||
        item.name.toLowerCase().indexOf(q) !== -1 ||
        item.meaning.toLowerCase().indexOf(q) !== -1 ||
        item.cls.toLowerCase().indexOf(q) !== -1;
    });
  }

  function render() {
    var query = document.getElementById('hsr-query').value;
    var rows = search(query);
    var tbody = document.querySelector('#hsr-results tbody');

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No status codes matched your query.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (item) {
      return '<tr>' +
        '<td>' + item.code + '</td>' +
        '<td>' + window.mtools.escapeHtml(item.name) + '</td>' +
        '<td>' + item.cls + '</td>' +
        '<td>' + window.mtools.escapeHtml(item.meaning) + '</td>' +
        '</tr>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-hsr-search').addEventListener('click', render);
    document.getElementById('hsr-query').addEventListener('input', render);
    render();
  });
})();