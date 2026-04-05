(function () {
  'use strict';

  function escapeHtml(str) {
    if (window.mtools && typeof window.mtools.escapeHtml === 'function') {
      return window.mtools.escapeHtml(str);
    }
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getFlags() {
    var flags = '';
    ['g', 'i', 'm'].forEach(function (f) {
      if (document.getElementById('flag-' + f).checked) flags += f;
    });
    return flags;
  }

  function buildFromTemplate(type) {
    var templates = {
      email: {
        body: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
        help: 'Matches common email formats like name@example.com.'
      },
      url: {
        body: 'https?:\\/\\/(?:www\\.)?[A-Za-z0-9.-]+\\.[A-Za-z]{2,}(?:\\/[\\w./%+-]*)?',
        help: 'Matches http:// or https:// URLs with optional path.'
      },
      username: {
        body: '[A-Za-z0-9_]{3,20}',
        help: 'Allows letters, numbers, underscore, length 3 to 20.'
      },
      ipv4: {
        body: '(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)){3}',
        help: 'Matches IPv4 addresses from 0.0.0.0 to 255.255.255.255.'
      },
      'iso-date': {
        body: '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])',
        help: 'Matches dates like 2026-04-04 (format check only).'
      },
      'hex-color': {
        body: '#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})',
        help: 'Matches CSS hex colors like #fff or #12a4ef.'
      }
    };

    return templates[type] || null;
  }

  function buildCustomPattern() {
    var parts = [];
    if (document.getElementById('allow-lower').checked) parts.push('a-z');
    if (document.getElementById('allow-upper').checked) parts.push('A-Z');
    if (document.getElementById('allow-digits').checked) parts.push('0-9');
    if (document.getElementById('allow-space').checked) parts.push(' ');
    if (document.getElementById('allow-underscore').checked) parts.push('_');
    if (document.getElementById('allow-dash').checked) parts.push('-');
    if (document.getElementById('allow-dot').checked) parts.push('\\.');

    if (!parts.length) {
      throw new Error('Pick at least one allowed character set in custom builder.');
    }

    var minRaw = document.getElementById('min-length').value;
    var maxRaw = document.getElementById('max-length').value;

    var min = minRaw === '' ? 1 : parseInt(minRaw, 10);
    var max = maxRaw === '' ? null : parseInt(maxRaw, 10);

    if (isNaN(min) || min < 0) {
      throw new Error('Min length must be 0 or greater.');
    }
    if (max !== null && (isNaN(max) || max < 0)) {
      throw new Error('Max length must be 0 or greater.');
    }
    if (max !== null && max < min) {
      throw new Error('Max length must be greater than or equal to min length.');
    }

    var quantifier = '';
    if (max === null) {
      quantifier = '{' + min + ',}';
    } else if (min === max) {
      quantifier = '{' + min + '}';
    } else {
      quantifier = '{' + min + ',' + max + '}';
    }

    var lookaheads = '';
    if (document.getElementById('need-lower').checked) lookaheads += '(?=.*[a-z])';
    if (document.getElementById('need-upper').checked) lookaheads += '(?=.*[A-Z])';
    if (document.getElementById('need-digit').checked) lookaheads += '(?=.*\\d)';

    return {
      body: lookaheads + '[' + parts.join('') + ']' + quantifier,
      help: 'Custom rule set based on your allowed characters and length.'
    };
  }

  function highlight(text, regex) {
    var globalFlags = regex.flags.indexOf('g') >= 0 ? regex.flags : regex.flags + 'g';
    var re = new RegExp(regex.source, globalFlags);
    var out = '';
    var last = 0;
    var match;

    while ((match = re.exec(text)) !== null) {
      out += escapeHtml(text.slice(last, match.index));
      out += '<mark>' + escapeHtml(match[0]) + '</mark>';
      last = match.index + match[0].length;
      if (match[0].length === 0) {
        out += escapeHtml(text[last] || '');
        last += 1;
        re.lastIndex = last;
      }
    }

    out += escapeHtml(text.slice(last));
    return out;
  }

  function describe(pattern, flags, helpText) {
    var lines = [];
    lines.push('<strong>How to read this pattern:</strong>');
    lines.push('<br>' + escapeHtml(helpText));

    if (pattern.indexOf('^') === 0 && pattern.lastIndexOf('$') === pattern.length - 1) {
      lines.push('<br>^ and $ mean the whole value must match from start to end.');
    }

    if (pattern.indexOf('(?=.*') !== -1) {
      lines.push('<br>(?=...) blocks are lookaheads: they require something to exist somewhere in the value.');
    }

    if (flags) {
      lines.push('<br>Flags enabled: ' + escapeHtml(flags.split('').join(', ')) + '.');
    } else {
      lines.push('<br>No flags enabled.');
    }

    return lines.join('');
  }

  function generateAndTest() {
    var type = document.getElementById('pattern-type').value;
    var isCustom = type === 'custom';
    var anchorWhole = document.getElementById('anchor-whole').checked;
    var flags = getFlags();
    var errorEl = document.getElementById('regex-error');
    var outputEl = document.getElementById('regex-output');
    var breakdownEl = document.getElementById('regex-breakdown');
    var sampleText = document.getElementById('sample-text').value;
    var previewEl = document.getElementById('sample-preview');
    var statsEl = document.getElementById('sample-stats');
    var testerLinkEl = document.getElementById('open-tester-link');

    errorEl.style.display = 'none';

    try {
      var built = isCustom ? buildCustomPattern() : buildFromTemplate(type);
      if (!built) {
        throw new Error('Select a valid pattern type.');
      }

      var source = anchorWhole ? '^' + built.body + '$' : built.body;
      var regex = new RegExp(source, flags);

      outputEl.textContent = '/' + source + '/' + flags;
      breakdownEl.innerHTML = describe(source, flags, built.help);

      var testerUrl = '/tools/dev/regex-tester.html?pattern=' + encodeURIComponent(source) + '&flags=' + encodeURIComponent(flags) + '&test=' + encodeURIComponent(sampleText);
      testerLinkEl.setAttribute('href', testerUrl);

      var reForCount = new RegExp(source, flags.indexOf('g') >= 0 ? flags : flags + 'g');
      var count = 0;
      var m;
      while ((m = reForCount.exec(sampleText)) !== null) {
        count += 1;
        if (m[0].length === 0) reForCount.lastIndex += 1;
        if (count > 1000) break;
      }

      previewEl.innerHTML = sampleText ? highlight(sampleText, regex) : '';
      statsEl.textContent = count + ' match' + (count === 1 ? '' : 'es');

      outputEl.setAttribute('data-source', source);
      outputEl.setAttribute('data-flags', flags);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      previewEl.textContent = sampleText;
      statsEl.textContent = '';
      outputEl.removeAttribute('data-source');
      outputEl.removeAttribute('data-flags');
      testerLinkEl.setAttribute('href', '/tools/dev/regex-tester.html');
    }
  }

  function init() {
    var patternType = document.getElementById('pattern-type');
    var customBuilder = document.getElementById('custom-builder');

    function syncCustomVisibility() {
      customBuilder.style.display = patternType.value === 'custom' ? 'block' : 'none';
    }

    patternType.addEventListener('change', function () {
      syncCustomVisibility();
      generateAndTest();
    });

    [
      'allow-lower', 'allow-upper', 'allow-digits', 'allow-space', 'allow-underscore', 'allow-dash', 'allow-dot',
      'need-lower', 'need-upper', 'need-digit', 'anchor-whole', 'flag-g', 'flag-i', 'flag-m', 'min-length', 'max-length'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', generateAndTest);
      el.addEventListener('change', generateAndTest);
    });

    document.getElementById('sample-text').addEventListener('input', generateAndTest);

    document.getElementById('generate-btn').addEventListener('click', generateAndTest);

    document.getElementById('copy-btn').addEventListener('click', function () {
      var outputEl = document.getElementById('regex-output');
      var src = outputEl.getAttribute('data-source');
      var flags = outputEl.getAttribute('data-flags') || '';
      if (!src) return;
      if (window.mtools && typeof window.mtools.copyToClipboard === 'function') {
        window.mtools.copyToClipboard('/' + src + '/' + flags, 'Regex copied');
      }
    });

    syncCustomVisibility();
    generateAndTest();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
