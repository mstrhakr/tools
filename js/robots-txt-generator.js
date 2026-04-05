(function () {
  'use strict';

  function lines(value) {
    return value.split(/\r?\n/).map(function (line) {
      return line.trim();
    }).filter(Boolean);
  }

  function generate() {
    var userAgent = document.getElementById('robots-user-agent').value.trim() || '*';
    var crawlDelay = document.getElementById('robots-crawl-delay').value.trim();
    var allow = lines(document.getElementById('robots-allow').value);
    var disallow = lines(document.getElementById('robots-disallow').value);
    var sitemaps = lines(document.getElementById('robots-sitemaps').value);

    var out = [];
    out.push('User-agent: ' + userAgent);

    if (!allow.length && !disallow.length) {
      out.push('Allow: /');
    }

    allow.forEach(function (path) {
      out.push('Allow: ' + path);
    });

    disallow.forEach(function (path) {
      out.push('Disallow: ' + path);
    });

    if (crawlDelay) {
      out.push('Crawl-delay: ' + crawlDelay);
    }

    if (sitemaps.length) {
      out.push('');
      sitemaps.forEach(function (url) {
        out.push('Sitemap: ' + url);
      });
    }

    document.getElementById('robots-output').value = out.join('\n');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-robots-generate').addEventListener('click', generate);
    ['robots-user-agent', 'robots-crawl-delay', 'robots-allow', 'robots-disallow', 'robots-sitemaps'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', generate);
    });
    document.getElementById('btn-robots-copy').addEventListener('click', function () {
      var output = document.getElementById('robots-output').value;
      if (output) window.mtools.copyToClipboard(output, 'Copied robots.txt');
    });
    generate();
  });
})();