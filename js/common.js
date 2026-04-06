/* ============================================
   mstrhakr tools - Common JavaScript
   ============================================ */

(function () {
  'use strict';

  // --- Manifest (single source of truth) ---
  var _manifestPromise = null;
  function loadManifest() {
    if (!_manifestPromise) {
      _manifestPromise = fetch('/tools-manifest.json')
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .catch(function () { return { tools: [], subcategories: {} }; });
    }
    return _manifestPromise;
  }

  // --- Dynamic Nav Builder ---
  function initNav(manifest) {
    var tools = manifest.tools || [];
    var subcategoryMeta = manifest.subcategories || {};
    var navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Group tools by category, preserving manifest order
    var categoryOrder = [];
    var categories = {};
    tools.forEach(function (tool) {
      if (!categories[tool.category]) {
        categories[tool.category] = { tools: [], displayName: tool.categoryName || tool.category };
        categoryOrder.push(tool.category);
      }
      categories[tool.category].tools.push(tool);
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
      var catData = categories[cat];
      var catTools = catData.tools;
      var subs = subcategoryMeta[cat] || [];
      var li = document.createElement('li');
      li.className = 'nav-has-dropdown';

      var toggle = document.createElement('button');
      toggle.className = 'nav-dropdown-toggle';
      toggle.setAttribute('aria-haspopup', 'true');
      toggle.setAttribute('aria-expanded', 'false');

      var label = document.createTextNode(catData.displayName + '\u00a0');
      var caret = document.createElement('span');
      caret.className = 'nav-caret';
      caret.setAttribute('aria-hidden', 'true');
      caret.textContent = '\u25be';
      toggle.appendChild(label);
      toggle.appendChild(caret);

      var dropdown = document.createElement('ul');
      dropdown.className = 'nav-dropdown';
      dropdown.setAttribute('aria-label', catData.displayName + ' tools');

      if (subs.length > 0) {
        // Build subcategory tool groups
        var subToolMap = {};
        var uncategorized = [];
        catTools.forEach(function (tool) {
          if (tool.subcategory) {
            if (!subToolMap[tool.subcategory]) subToolMap[tool.subcategory] = [];
            subToolMap[tool.subcategory].push(tool);
          } else {
            uncategorized.push(tool);
          }
        });

        // Render subcategory flyout items
        subs.forEach(function (sub) {
          var subTools = subToolMap[sub.slug] || [];
          if (subTools.length === 0) return;

          var subLi = document.createElement('li');
          subLi.className = 'nav-has-submenu';

          var subBtn = document.createElement('button');
          subBtn.className = 'nav-submenu-toggle';
          subBtn.setAttribute('aria-haspopup', 'true');
          subBtn.setAttribute('aria-expanded', 'false');

          var subLabel = document.createTextNode(sub.name);
          var subCaret = document.createElement('span');
          subCaret.className = 'nav-submenu-caret';
          subCaret.setAttribute('aria-hidden', 'true');
          subCaret.textContent = '\u25b8';
          subBtn.appendChild(subLabel);
          subBtn.appendChild(subCaret);

          var submenu = document.createElement('ul');
          submenu.className = 'nav-submenu';
          submenu.setAttribute('aria-label', sub.name + ' tools');

          subTools.forEach(function (tool) {
            var itemLi = document.createElement('li');
            var a = document.createElement('a');
            a.href = tool.url;
            a.textContent = tool.name;
            if (currentPath === tool.url) {
              a.classList.add('active');
              toggle.classList.add('active');
            }
            itemLi.appendChild(a);
            submenu.appendChild(itemLi);
          });

          // Desktop: open on hover. Mobile: toggle on click.
          subBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = subLi.classList.toggle('open');
            subBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            // Close sibling submenus
            dropdown.querySelectorAll('.nav-has-submenu.open').forEach(function (other) {
              if (other !== subLi) {
                other.classList.remove('open');
                var ob = other.querySelector('.nav-submenu-toggle');
                if (ob) ob.setAttribute('aria-expanded', 'false');
              }
            });
          });

          // Viewport edge detection for flyout positioning
          subLi.addEventListener('mouseenter', function () {
            submenu.classList.remove('flip-left');
            var rect = submenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
              submenu.classList.add('flip-left');
            }
          });

          subLi.appendChild(subBtn);
          subLi.appendChild(submenu);
          dropdown.appendChild(subLi);
        });

        // Divider between subcategories and uncategorized tools
        if (uncategorized.length > 0 && subs.length > 0) {
          var divLi = document.createElement('li');
          divLi.className = 'nav-divider';
          divLi.setAttribute('role', 'separator');
          dropdown.appendChild(divLi);
        }

        // Uncategorized tools below
        uncategorized.forEach(function (tool) {
          var itemLi = document.createElement('li');
          var a = document.createElement('a');
          a.href = tool.url;
          a.textContent = tool.name;
          if (currentPath === tool.url) {
            a.classList.add('active');
            toggle.classList.add('active');
          }
          itemLi.appendChild(a);
          dropdown.appendChild(itemLi);
        });
      } else {
        // No subcategories — flat list (same as before)
        catTools.forEach(function (tool) {
          var itemLi = document.createElement('li');
          var a = document.createElement('a');
          a.href = tool.url;
          a.textContent = tool.name;
          if (currentPath === tool.url) {
            a.classList.add('active');
            toggle.classList.add('active');
          }
          itemLi.appendChild(a);
          dropdown.appendChild(itemLi);
        });
      }

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

    // Helper: close all open submenus within an element
    function closeSubmenus(container) {
      container.querySelectorAll('.nav-has-submenu.open').forEach(function (sub) {
        sub.classList.remove('open');
        var btn = sub.querySelector('.nav-submenu-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    // Close all dropdowns when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-has-dropdown')) {
        navLinks.querySelectorAll('.nav-has-dropdown.open').forEach(function (openLi) {
          openLi.classList.remove('open');
          closeSubmenus(openLi);
          var t = openLi.querySelector('.nav-dropdown-toggle');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
      }
    });

    // Close all dropdowns on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        navLinks.querySelectorAll('.nav-has-dropdown.open').forEach(function (openLi) {
          openLi.classList.remove('open');
          closeSubmenus(openLi);
          var t = openLi.querySelector('.nav-dropdown-toggle');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
      }
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

  // --- Homepage Cards ---
  function initHomepageCards(tools) {
    var grid = document.querySelector('.tool-grid');
    if (!grid) return;

    var fragment = document.createDocumentFragment();
    tools.forEach(function (tool) {
      var card = document.createElement('a');
      card.className = 'tool-card';
      card.href = tool.url;
      card.setAttribute('data-name', tool.name.toLowerCase());
      card.setAttribute('data-tags', tool.tags || '');

      var cat = document.createElement('span');
      cat.className = 'card-category';
      cat.textContent = tool.categoryName || tool.category;

      var title = document.createElement('h3');
      title.textContent = tool.name;

      card.appendChild(cat);
      card.appendChild(title);

      if (tool.description) {
        var desc = document.createElement('p');
        desc.textContent = tool.description;
        card.appendChild(desc);
      }

      fragment.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);
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
    loadManifest().then(function (manifest) {
      initNav(manifest);   // builds theme toggle and other nav elements
      initTheme();
      initMobileNav();
      initHomepageCards(manifest.tools || []);
      initSearch();
    });
    initGoatCounter();
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
