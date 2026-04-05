(function () {
  'use strict';

  function includesRegex(text, regex) {
    return regex.test(text);
  }

  function characterPool(password) {
    var pool = 0;
    if (includesRegex(password, /[a-z]/)) pool += 26;
    if (includesRegex(password, /[A-Z]/)) pool += 26;
    if (includesRegex(password, /[0-9]/)) pool += 10;
    if (includesRegex(password, /[^A-Za-z0-9]/)) pool += 33;
    return pool;
  }

  function hasSequence(password) {
    var lower = password.toLowerCase();
    var alpha = 'abcdefghijklmnopqrstuvwxyz';
    var digits = '0123456789';
    for (var i = 0; i < lower.length - 2; i++) {
      var tri = lower.slice(i, i + 3);
      if (alpha.indexOf(tri) !== -1 || digits.indexOf(tri) !== -1) return true;
    }
    return false;
  }

  function hasRepeatedChunk(password) {
    return /(.{2,})\1+/.test(password);
  }

  function rating(bits) {
    if (bits < 30) return { name: 'very weak', color: 'var(--red)', pct: 15 };
    if (bits < 45) return { name: 'weak', color: 'var(--orange)', pct: 35 };
    if (bits < 60) return { name: 'fair', color: 'var(--yellow)', pct: 55 };
    if (bits < 80) return { name: 'strong', color: 'var(--cyan)', pct: 75 };
    return { name: 'very strong', color: 'var(--green)', pct: 100 };
  }

  function analyze() {
    var password = document.getElementById('psc-input').value;
    var pool = characterPool(password);
    var bits = password.length && pool ? password.length * Math.log2(pool) : 0;

    var checks = [
      { ok: password.length >= 12, msg: 'Length at least 12 characters' },
      { ok: includesRegex(password, /[a-z]/), msg: 'Contains lowercase letters' },
      { ok: includesRegex(password, /[A-Z]/), msg: 'Contains uppercase letters' },
      { ok: includesRegex(password, /[0-9]/), msg: 'Contains digits' },
      { ok: includesRegex(password, /[^A-Za-z0-9]/), msg: 'Contains symbols' },
      { ok: !hasSequence(password), msg: 'No obvious sequential patterns' },
      { ok: !hasRepeatedChunk(password), msg: 'No repeated chunk patterns' }
    ];

    var failed = checks.filter(function (check) { return !check.ok; }).length;
    var penalizedBits = Math.max(bits - failed * 4, 0);
    var level = rating(penalizedBits);

    document.getElementById('psc-length').textContent = password.length.toString();
    document.getElementById('psc-entropy').textContent = Math.round(penalizedBits).toString();
    document.getElementById('psc-pool').textContent = pool.toString();

    var fill = document.getElementById('psc-fill');
    fill.style.width = level.pct + '%';
    fill.style.backgroundColor = level.color;

    var label = document.getElementById('psc-label');
    label.textContent = level.name;
    label.style.color = level.color;

    var checksEl = document.getElementById('psc-checks');
    checksEl.innerHTML = checks.map(function (check) {
      var mark = check.ok ? 'PASS' : 'FAIL';
      var cls = check.ok ? 'text-success' : 'text-error';
      return '<div class="' + cls + '">' + mark + ' - ' + window.mtools.escapeHtml(check.msg) + '</div>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('psc-input').addEventListener('input', analyze);
    analyze();
  });
})();