(function () {
  'use strict';

  function esc(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function get(id) {
    return document.getElementById(id).value.trim();
  }

  function pushTag(tags, property, content, isName) {
    if (!content) return;
    var attr = isName ? 'name' : 'property';
    tags.push('<meta ' + attr + '="' + property + '" content="' + esc(content) + '">');
  }

  function generate() {
    var title = get('og-title');
    var description = get('og-description');
    var url = get('og-url');
    var image = get('og-image');
    var siteName = get('og-site-name');
    var type = get('og-type') || 'website';
    var twitterCard = get('og-twitter-card') || 'summary_large_image';
    var twitterSite = get('og-twitter-site');

    var tags = [];
    pushTag(tags, 'og:title', title, false);
    pushTag(tags, 'og:description', description, false);
    pushTag(tags, 'og:type', type, false);
    pushTag(tags, 'og:url', url, false);
    pushTag(tags, 'og:image', image, false);
    pushTag(tags, 'og:site_name', siteName, false);

    pushTag(tags, 'twitter:card', twitterCard, true);
    pushTag(tags, 'twitter:title', title, true);
    pushTag(tags, 'twitter:description', description, true);
    pushTag(tags, 'twitter:image', image, true);
    pushTag(tags, 'twitter:site', twitterSite, true);

    document.getElementById('og-output').value = tags.join('\n');
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['og-title', 'og-description', 'og-url', 'og-image', 'og-site-name', 'og-type', 'og-twitter-card', 'og-twitter-site'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', generate);
      document.getElementById(id).addEventListener('change', generate);
    });
    document.getElementById('btn-og-generate').addEventListener('click', generate);
    document.getElementById('btn-og-copy').addEventListener('click', function () {
      var output = document.getElementById('og-output').value;
      if (output) window.mtools.copyToClipboard(output, 'Copied tags');
    });

    document.getElementById('og-type').value = 'website';
    document.getElementById('og-twitter-card').value = 'summary_large_image';
    generate();
  });
})();