/* ============================================
   mstrhakr tools - Common JavaScript
   ============================================ */

(function () {
  'use strict';

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
    initTheme();
    initMobileNav();
    initActiveLink();
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
