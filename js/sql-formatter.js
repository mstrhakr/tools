(function () {
  'use strict';

  var KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
    'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'JOIN', 'LEFT JOIN',
    'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'ON', 'AND', 'OR', 'UNION', 'UNION ALL'
  ];

  function normalizeWhitespace(sql) {
    return sql.replace(/\s+/g, ' ').trim();
  }

  function uppercaseKeywords(sql) {
    var out = sql;
    KEYWORDS.sort(function (a, b) { return b.length - a.length; }).forEach(function (kw) {
      var escaped = kw.replace(/ /g, '\\s+');
      var re = new RegExp('\\b' + escaped + '\\b', 'ig');
      out = out.replace(re, kw);
    });
    return out;
  }

  function lineBreak(sql) {
    var out = sql;
    out = out.replace(/\b(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|SET|VALUES|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|UNION ALL|UNION)\b/g, '\n$1');
    out = out.replace(/\b(AND|OR)\b/g, '\n  $1');
    return out.replace(/\n{2,}/g, '\n').trim();
  }

  function indentCommas(sql) {
    return sql.replace(/,\s*/g, ',\n  ');
  }

  function formatSql(sql) {
    var step1 = normalizeWhitespace(sql);
    var step2 = uppercaseKeywords(step1);
    var step3 = indentCommas(step2);
    var step4 = lineBreak(step3);
    return step4;
  }

  function run() {
    var input = document.getElementById('sqlf-input').value;
    var output = document.getElementById('sqlf-output');
    var status = document.getElementById('sqlf-status');

    if (!input.trim()) {
      output.value = '';
      status.className = 'mt-1 text-muted';
      status.textContent = 'Enter SQL to format.';
      return;
    }

    try {
      output.value = formatSql(input);
      status.className = 'mt-1 text-success';
      status.textContent = 'SQL formatted.';
    } catch (error) {
      output.value = '';
      status.className = 'mt-1 text-error';
      status.textContent = error.message || 'Formatting failed.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('sqlf-input').value = 'select id, name, email from users where status = "active" and created_at > now() - interval 30 day order by created_at desc limit 50';
    document.getElementById('btn-sqlf-format').addEventListener('click', run);
    document.getElementById('sqlf-input').addEventListener('input', run);
    document.getElementById('btn-sqlf-copy').addEventListener('click', function () {
      var out = document.getElementById('sqlf-output').value;
      if (out) window.mtools.copyToClipboard(out, 'Copied SQL');
    });
    run();
  });
})();