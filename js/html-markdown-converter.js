(function () {
  'use strict';

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function inlineMarkdown(text) {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function markdownToHtml(input) {
    var lines = input.replace(/\r\n/g, '\n').split('\n');
    var out = [];
    var inCode = false;
    var inList = false;

    lines.forEach(function (line) {
      if (/^```/.test(line.trim())) {
        if (!inCode) {
          if (inList) {
            out.push('</ul>');
            inList = false;
          }
          out.push('<pre><code>');
          inCode = true;
        } else {
          out.push('</code></pre>');
          inCode = false;
        }
        return;
      }

      if (inCode) {
        out.push(escapeHtml(line));
        return;
      }

      var heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        var level = heading[1].length;
        out.push('<h' + level + '>' + inlineMarkdown(escapeHtml(heading[2])) + '</h' + level + '>');
        return;
      }

      var list = line.match(/^[-*]\s+(.+)$/);
      if (list) {
        if (!inList) {
          out.push('<ul>');
          inList = true;
        }
        out.push('<li>' + inlineMarkdown(escapeHtml(list[1])) + '</li>');
        return;
      }

      if (inList) {
        out.push('</ul>');
        inList = false;
      }

      if (!line.trim()) {
        out.push('');
        return;
      }

      out.push('<p>' + inlineMarkdown(escapeHtml(line)) + '</p>');
    });

    if (inList) out.push('</ul>');
    if (inCode) out.push('</code></pre>');

    return out.join('\n');
  }

  function htmlToMarkdown(input) {
    var output = input;
    output = output.replace(/\r\n/g, '\n');
    output = output.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
    output = output.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    output = output.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
    output = output.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
    output = output.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n');
    output = output.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n');

    output = output.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    output = output.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    output = output.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    output = output.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    output = output.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

    output = output.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    output = output.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    output = output.replace(/<ul[^>]*>/gi, '');
    output = output.replace(/<\/ul>/gi, '\n');

    output = output.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, function (_, code) {
      return '```\n' + code.replace(/<br\s*\/?\s*>/gi, '\n') + '\n```\n';
    });

    output = output.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    output = output.replace(/<br\s*\/?\s*>/gi, '\n');
    output = output.replace(/<[^>]+>/g, '');

    var textarea = document.createElement('textarea');
    textarea.innerHTML = output;
    return textarea.value.replace(/\n{3,}/g, '\n\n').trim();
  }

  function convert() {
    var input = document.getElementById('hm-input').value;
    var direction = document.getElementById('hm-direction').value;
    var output = document.getElementById('hm-output');
    var status = document.getElementById('hm-status');
    var preview = document.getElementById('hm-preview');

    var converted = direction === 'md2html'
      ? markdownToHtml(input)
      : htmlToMarkdown(input);

    output.value = converted;
    status.className = 'mt-2 text-success';
    status.textContent = 'Converted successfully.';

    if (direction === 'md2html') {
      preview.innerHTML = converted || '<span class="text-muted">Preview appears here.</span>';
    } else {
      preview.textContent = converted || 'Preview appears here.';
    }
  }

  function seed() {
    document.getElementById('hm-input').value = '# Release notes\n\n- Added parser\n- Improved logging\n\nVisit [tools](https://tools.mstrhakr.com).';
    convert();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-hm-convert').addEventListener('click', convert);
    document.getElementById('hm-input').addEventListener('input', convert);
    document.getElementById('hm-direction').addEventListener('change', convert);
    document.getElementById('btn-hm-copy').addEventListener('click', function () {
      window.mtools.copyToClipboard(document.getElementById('hm-output').value, 'Copied output');
    });
    seed();
  });
})();