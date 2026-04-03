(function () {
  'use strict';

  var algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

  function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  function hashText(text, alg) {
    var encoder = new TextEncoder();
    var data = encoder.encode(text);
    return crypto.subtle.digest(alg, data).then(bufToHex);
  }

  function renderResults(results) {
    var container = document.getElementById('hash-results');
    container.innerHTML = '';
    results.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'result mt-1';
      row.innerHTML =
        '<div class="result-label">' + r.alg + '</div>' +
        '<div class="result-value" style="font-size:0.85rem;word-break:break-all">' + r.hash + '</div>' +
        '<button class="btn btn-secondary btn-sm mt-1" data-hash="' + r.hash + '">copy</button>';
      row.querySelector('button').addEventListener('click', function (e) {
        window.mtools.copyToClipboard(e.currentTarget.dataset.hash);
      });
      container.appendChild(row);
    });
  }

  function run() {
    var text = document.getElementById('hash-input').value;
    if (!text) {
      document.getElementById('hash-results').innerHTML = '';
      return;
    }
    var promises = algorithms.map(function (alg) {
      return hashText(text, alg).then(function (hash) {
        return { alg: alg, hash: hash };
      });
    });
    Promise.all(promises).then(renderResults);
  }

  function init() {
    var input = document.getElementById('hash-input');
    var btn = document.getElementById('hash-btn');
    input.addEventListener('input', run);
    btn.addEventListener('click', run);

    document.getElementById('clear-btn').addEventListener('click', function () {
      input.value = '';
      document.getElementById('hash-results').innerHTML = '';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
