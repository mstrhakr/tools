(function () {
  'use strict';

  var rawHtml = '';

  function render() {
    var val = document.getElementById('md-input').value;
    // marked with safe defaults - no HTML passthrough
    var html = marked.parse(val, {
      gfm: true,
      breaks: true,
      mangle: false,
      headerIds: false
    });
    rawHtml = html;
    document.getElementById('md-preview').innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('md-input');
    input.addEventListener('input', render);

    document.getElementById('btn-clear').addEventListener('click', function () {
      input.value = '';
      document.getElementById('md-preview').innerHTML = '';
      rawHtml = '';
    });

    document.getElementById('btn-copy-html').addEventListener('click', function () {
      if (rawHtml) mtools.copyToClipboard(rawHtml, 'HTML copied');
    });

    // Starter text
    input.value = '# Welcome\n\nType **Markdown** here and see the *live* preview.\n\n## Features\n\n- GFM tables\n- Code blocks\n- Blockquotes\n\n```js\nconsole.log("hello");\n```\n';
    render();
  });
})();
