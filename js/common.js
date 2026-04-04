/* ============================================
   mstrhakr tools - Common JavaScript
   ============================================ */

(function () {
  'use strict';

  // --- Tool Catalog (single source of truth for nav) ---
  // Add new tools here: { category, name, url }
  // New categories appear automatically in the nav.
  var TOOLS = [
    // Converters
    { category: 'converter', name: 'Data Size Converter',    url: '/tools/data-size-converter.html' },
    { category: 'converter', name: 'Download Time Calc',     url: '/tools/download-time.html' },
    { category: 'converter', name: 'Unix Timestamp',         url: '/tools/unix-timestamp.html' },
    { category: 'converter', name: 'Color Picker',           url: '/tools/color-picker.html' },
    { category: 'converter', name: 'CSS Unit Converter',     url: '/tools/css-unit-converter.html' },
    { category: 'converter', name: 'Epoch / Duration',       url: '/tools/epoch-calculator.html' },
    { category: 'converter', name: 'Number Base',            url: '/tools/number-base.html' },
    // Encoding
    { category: 'encoding',  name: 'Base64',                 url: '/tools/base64.html' },
    { category: 'encoding',  name: 'URL Encode / Decode',    url: '/tools/url-encode-decode.html' },
    { category: 'encoding',  name: 'JSON Formatter',         url: '/tools/json-formatter.html' },
    { category: 'encoding',  name: 'YAML Formatter',         url: '/tools/yaml-formatter.html' },
    { category: 'encoding',  name: 'HTML Entities',          url: '/tools/html-entities.html' },
    { category: 'encoding',  name: 'CSV \u2194 JSON',        url: '/tools/csv-json.html' },
    // Text
    { category: 'text',      name: 'Text Counter',           url: '/tools/text-counter.html' },
    { category: 'text',      name: 'Text Diff',              url: '/tools/diff.html' },
    { category: 'text',      name: 'Markdown Previewer',     url: '/tools/markdown-previewer.html' },
    { category: 'text',      name: 'Lorem Ipsum',            url: '/tools/lorem-ipsum.html' },
    { category: 'text',      name: 'ASCII / Unicode Table',  url: '/tools/unicode-table.html' },
    // Math
    { category: 'math',      name: 'Calculator',             url: '/tools/calculator.html' },
    { category: 'math',      name: 'Percentage Calculator',  url: '/tools/percentage-calc.html' },
    // Generator
    { category: 'generator', name: 'Password Generator',     url: '/tools/password-generator.html' },
    { category: 'generator', name: 'UUID Generator',         url: '/tools/uuid-generator.html' },
    { category: 'generator', name: 'QR Code Generator',      url: '/tools/qr-generator.html' },
    { category: 'generator', name: 'Image to Base64',        url: '/tools/image-base64.html' },
    // Network
    { category: 'network',   name: 'Subnet Calculator',      url: '/tools/subnet-calculator.html' },
    { category: 'network',   name: 'IP Address Info',        url: '/tools/ip-info.html' },
    { category: 'network',   name: 'MAC Address Lookup',     url: '/tools/mac-lookup.html' },
    { category: 'network',   name: 'DNS Lookup',             url: '/tools/dns-lookup.html' },
    { category: 'network',   name: 'Ping',                   url: '/tools/ping.html' },
    { category: 'network',   name: 'SSL Cert Checker',       url: '/tools/ssl-checker.html' },
    { category: 'network',   name: 'HTTP Headers',           url: '/tools/http-headers.html' },
    { category: 'network',   name: 'Port Scanner',           url: '/tools/port-scanner.html' },
    { category: 'network',   name: 'GeoIP Lookup',           url: '/tools/geoip.html' },
    { category: 'network',   name: 'Reverse DNS',            url: '/tools/reverse-dns.html' },
    { category: 'network',   name: 'WHOIS Lookup',           url: '/tools/whois.html' },
    { category: 'network',   name: 'Traceroute',             url: '/tools/traceroute.html' },
    { category: 'network',   name: 'DNSBL Check',            url: '/tools/dnsbl.html' },
    { category: 'network',   name: 'CIDR Merge / Dedup',     url: '/tools/cidr-merge.html' },
    // Security
    { category: 'security',  name: 'Hash Generator',         url: '/tools/hash-generator.html' },
    { category: 'security',  name: 'JWT Decoder',            url: '/tools/jwt-decoder.html' },
    // Dev
    { category: 'dev',       name: 'Regex Tester',           url: '/tools/regex-tester.html' },
    { category: 'dev',       name: 'Chmod Calculator',       url: '/tools/chmod-calculator.html' },
    { category: 'dev',       name: 'Cron Parser',            url: '/tools/cron-parser.html' },
    { category: 'dev',       name: 'User-Agent Parser',      url: '/tools/ua-parser.html' }
  ];

  // --- Dynamic Nav Builder ---
  function initNav() {
    var navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    function closeAllDropdowns() {
      navLinks.querySelectorAll('.nav-has-dropdown.open').forEach(function (li) {
        li.classList.remove('open');
        var t = li.querySelector('.nav-dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }

    // Group tools by category, preserving insertion order
    var categoryOrder = [];
    var categories = {};
    TOOLS.forEach(function (tool) {
      if (!categories[tool.category]) {
        categories[tool.category] = [];
        categoryOrder.push(tool.category);
      }
      categories[tool.category].push(tool);
    });

    var currentPath = window.location.pathname;

    // Build nav items
    var fragment = document.createDocumentFragment();

    // Home link
    var homeLi = document.createElement('li');
    var homeA = document.createElement('a');
    homeA.href = '/';
    homeA.textContent = 'home';
    if (currentPath === '/') homeA.classList.add('active');
    homeLi.appendChild(homeA);
    fragment.appendChild(homeLi);

    // Category dropdowns
    categoryOrder.forEach(function (cat) {
      var tools = categories[cat];
      var li = document.createElement('li');
      li.className = 'nav-has-dropdown';

      var toggle = document.createElement('button');
      toggle.className = 'nav-dropdown-toggle';
      toggle.setAttribute('aria-haspopup', 'true');
      toggle.setAttribute('aria-expanded', 'false');

      var label = document.createTextNode(cat + '\u00a0');
      var caret = document.createElement('span');
      caret.className = 'nav-caret';
      caret.setAttribute('aria-hidden', 'true');
      caret.textContent = '\u25be';
      toggle.appendChild(label);
      toggle.appendChild(caret);

      var dropdown = document.createElement('ul');
      dropdown.className = 'nav-dropdown';
      dropdown.setAttribute('aria-label', cat + ' tools');

      tools.forEach(function (tool) {
        var itemLi = document.createElement('li');
        var a = document.createElement('a');
        a.href = tool.url;
        a.textContent = tool.name;
        a.addEventListener('click', function () {
          closeAllDropdowns();
        });
        if (currentPath === tool.url) {
          a.classList.add('active');
          toggle.classList.add('active');
        }
        itemLi.appendChild(a);
        dropdown.appendChild(itemLi);
      });

      // Click toggle: for mobile and keyboard users
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = li.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        // Close sibling dropdowns
        navLinks.querySelectorAll('.nav-has-dropdown.open').forEach(function (other) {
          if (other !== li) {
            other.classList.remove('open');
            var otherToggle = other.querySelector('.nav-dropdown-toggle');
            if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
          }
        });
      });

      li.appendChild(toggle);
      li.appendChild(dropdown);
      fragment.appendChild(li);
    });

    // Stats link
    var statsLi = document.createElement('li');
    var statsA = document.createElement('a');
    statsA.href = 'https://stats.tools.mstrhakr.com';
    statsA.textContent = 'stats';
    statsA.className = 'nav-stats';
    statsA.target = '_blank';
    statsA.rel = 'noopener noreferrer';
    statsLi.appendChild(statsA);
    fragment.appendChild(statsLi);

    // Theme toggle
    var themeLi = document.createElement('li');
    var themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle';
    themeBtn.setAttribute('aria-label', 'Toggle theme');
    themeBtn.textContent = 'light';
    themeLi.appendChild(themeBtn);
    fragment.appendChild(themeLi);

    navLinks.innerHTML = '';
    navLinks.appendChild(fragment);

    // Close all dropdowns when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-has-dropdown')) {
        closeAllDropdowns();
      }
    });

    // Close all dropdowns on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeAllDropdowns();
      }
    });

    // When restoring from bfcache, avoid stale open dropdown state.
    window.addEventListener('pageshow', function () {
      closeAllDropdowns();
    });
  }

  // --- Theme Toggle ---
  function getPreferredTheme() {
    var stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.querySelector('.theme-toggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? 'light' : 'dark';
    }
  }

  function initTheme() {
    applyTheme(getPreferredTheme());

    var btn = document.querySelector('.theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') || 'dark';
        var next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        applyTheme(next);
      });
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // --- Mobile Nav ---
  function initMobileNav() {
    var hamburger = document.querySelector('.hamburger');
    var navLinks = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('open');
      var isOpen = navLinks.classList.contains('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      hamburger.textContent = isOpen ? '[x]' : '[=]';
    });

    // Close on link click (mobile)
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.textContent = '[=]';
      });
    });
  }

  // --- Active Nav Link ---
  function initActiveLink() {
    var path = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === path || (href !== '/' && path.startsWith(href))) {
        link.classList.add('active');
      }
    });
  }

  // --- HTML Escaping ---
  // Escapes a value for safe insertion into innerHTML. Apply to every piece of
  // data sourced from user input or external APIs before building HTML strings.
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Toast Notification ---
  var toastEl = null;
  var toastTimer = null;

  function showToast(message, duration) {
    duration = duration || 2000;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, duration);
  }

  // --- Copy to Clipboard ---
  function copyToClipboard(text, label) {
    label = label || 'Copied';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast(label + '!');
      }).catch(function () {
        fallbackCopy(text, label);
      });
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(label + '!');
    } catch (e) {
      showToast('Copy failed');
    }
    document.body.removeChild(ta);
  }

  // --- Homepage Search ---
  function initSearch() {
    var searchInput = document.getElementById('tool-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', function () {
      var query = searchInput.value.toLowerCase().trim();
      var cards = document.querySelectorAll('.tool-card');
      cards.forEach(function (card) {
        var name = (card.getAttribute('data-name') || '').toLowerCase();
        var tags = (card.getAttribute('data-tags') || '').toLowerCase();
        var desc = (card.querySelector('p') || {}).textContent || '';
        desc = desc.toLowerCase();
        var match = !query || name.indexOf(query) !== -1 || tags.indexOf(query) !== -1 || desc.indexOf(query) !== -1;
        card.classList.toggle('hidden', !match);
      });
    });
  }

  // --- GoatCounter Analytics ---
  function initGoatCounter() {
    var s = document.createElement('script');
    s.setAttribute('data-goatcounter', 'https://mstrhakr-tools.goatcounter.com/count');
    s.async = true;
    s.src = '//gc.zgo.at/count.js';
    document.head.appendChild(s);
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', function () {
    initNav();      // must run first — builds theme toggle and other nav elements
    initTheme();
    initMobileNav();
    initSearch();
    initGoatCounter();
  });

  // Expose utilities globally for tool pages
  window.mtools = {
    copyToClipboard: copyToClipboard,
    showToast: showToast,
    escapeHtml: escapeHtml
  };
})();
