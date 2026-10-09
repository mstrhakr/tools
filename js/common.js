/* ============================================
   mstrhakr tools - Common JavaScript
   ============================================ */

(function () {
  'use strict';

  // --- Tool Catalog (auto-generated from tool HTML files) ---
  var CATEGORY_ORDER = ['converter', 'encoding', 'text', 'math', 'generator', 'network', 'security', 'dev'];
  var TOOLS_CACHE_KEY = 'mtools:catalog:v3';
  var TOOLS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
  var MANIFEST_URL = '/tools-manifest.json';

  function normalizeAndSortTools(tools) {
    tools.sort(function (a, b) {
      var ai = CATEGORY_ORDER.indexOf(a.category);
      var bi = CATEGORY_ORDER.indexOf(b.category);
      if (ai !== bi) {
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      return a.name.localeCompare(b.name, 'en') || a.url.localeCompare(b.url, 'en');
    });
    return tools;
  }

  function readCachedTools() {
    try {
      var raw = localStorage.getItem(TOOLS_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tools) || !parsed.updatedAt) return null;
      if ((Date.now() - parsed.updatedAt) > TOOLS_CACHE_TTL_MS) return null;
      return parsed.tools;
    } catch (e) {
      return null;
    }
  }

  function writeCachedTools(tools) {
    try {
      localStorage.setItem(TOOLS_CACHE_KEY, JSON.stringify({
        updatedAt: Date.now(),
        tools: tools
      }));
    } catch (e) {
      // Ignore cache write failures.
    }
  }

  function fetchToolsFromManifest() {
    return fetch(MANIFEST_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load tools manifest');
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.tools) || !data.tools.length) {
          throw new Error('Invalid tools manifest format');
        }
        return data.tools;
      })
      .then(normalizeAndSortTools);
  }

  function loadToolsCatalog() {
    return fetchToolsFromManifest().then(function (tools) {
      writeCachedTools(tools);
      return tools;
    }).catch(function (error) {
      var cached = readCachedTools();
      if (cached && cached.length) return normalizeAndSortTools(cached);
      throw error;
    });
  }

  function buildLegacyToolPathMap(tools) {
    var map = {};
    tools.forEach(function (tool) {
      var m = tool.url.match(/^\/tools\/([a-z0-9-]+)\/([a-z0-9-]+)\.html$/i);
      if (!m) return;
      var slug = m[2];
      map['/tools/' + slug + '.html'] = tool.url;
    });
    return map;
  }

  function rewriteLegacyToolLinks(legacyMap) {
    document.querySelectorAll('a[href^="/tools/"]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var pieces = href.split('?');
      var base = pieces[0];
      if (legacyMap[base]) {
        var next = legacyMap[base] + (pieces[1] ? ('?' + pieces[1]) : '');
        a.setAttribute('href', next);
      }
    });
  }

  // --- Dynamic Nav Builder ---
  function initNav(toolsCatalog) {
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
    toolsCatalog.forEach(function (tool) {
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

  // --- Homepage Tool Cards ---
  function initHomepageCards(toolsCatalog) {
    var grid = document.querySelector('.tool-grid');
    if (!grid) return;

    var fragment = document.createDocumentFragment();
    toolsCatalog.forEach(function (tool) {
      var card = document.createElement('a');
      card.className = 'tool-card';
      card.href = tool.url;
      card.setAttribute('data-name', tool.name.toLowerCase());
      card.setAttribute('data-tags', (tool.tags || '').toLowerCase());

      var category = document.createElement('span');
      category.className = 'card-category';
      category.textContent = tool.category;

      var h3 = document.createElement('h3');
      h3.textContent = tool.name;

      var p = document.createElement('p');
      p.textContent = tool.description || (tool.name + ' tool');

      card.appendChild(category);
      card.appendChild(h3);
      card.appendChild(p);
      fragment.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);
  }

  // --- Theme Toggle ---
  function readStoredTheme() {
    try {
      return localStorage.getItem('theme');
    } catch (e) {
      return null;
    }
  }

  function getPreferredTheme() {
    var stored = readStoredTheme();
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
        try {
          localStorage.setItem('theme', next);
        } catch (e) {
          // Theme switching still works when storage is unavailable.
        }
        applyTheme(next);
      });
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!readStoredTheme()) {
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
    loadToolsCatalog().then(function (toolsCatalog) {
      var legacyMap = buildLegacyToolPathMap(toolsCatalog);
      rewriteLegacyToolLinks(legacyMap);
      initNav(toolsCatalog); // must run first — builds theme toggle and other nav elements
      initTheme();
      initMobileNav();
      initHomepageCards(toolsCatalog);
      initSearch();
      initGoatCounter();
    }).catch(function () {
      // If discovery fails, still initialize non-catalog features.
      var grid = document.querySelector('.tool-grid');
      if (grid) {
        var message = document.createElement('p');
        message.setAttribute('role', 'status');
        message.textContent = 'Unable to load tools. Please reload to try again.';
        grid.innerHTML = '';
        grid.appendChild(message);
      }
      initTheme();
      initMobileNav();
      initSearch();
      initGoatCounter();
    });
  });

  var API_BASE = 'https://api.tools.mstrhakr.com';

  // Unified API fetch: calls the backend, unwraps the {ok, data} envelope,
  // and returns data on success or rejects with an Error on failure.
  // Gracefully handles non-JSON responses (e.g. reverse-proxy errors).
  function apiFetch(path) {
    return fetch(API_BASE + path).then(function (res) {
      var contentType = res.headers.get('content-type') || '';
      if (contentType.indexOf('application/json') === -1) {
        return res.text().then(function (text) {
          return Promise.reject(new Error(text || ('HTTP ' + res.status)));
        });
      }
      return res.json().then(function (body) {
        if (body.ok === false || !res.ok) {
          return Promise.reject(new Error(body.error || ('HTTP ' + res.status)));
        }
        return body.data !== undefined ? body.data : body;
      });
    });
  }

  // Expose utilities globally for tool pages
  window.mtools = {
    copyToClipboard: copyToClipboard,
    showToast: showToast,
    escapeHtml: escapeHtml,
    apiFetch: apiFetch
  };
})();
