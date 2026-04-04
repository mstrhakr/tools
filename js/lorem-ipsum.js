(function () {
  'use strict';

  var WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis elementum ligula faucibus pretium diam purus at orci'.split(' ');

  var CLASSIC = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function makeSentence(minWords, maxWords) {
    var len = minWords + Math.floor(Math.random() * (maxWords - minWords));
    var words = [];
    for (var i = 0; i < len; i++) words.push(pick(WORDS));
    return capitalize(words.join(' ')) + '.';
  }

  function makeParagraph(classic, first) {
    var sentences = 4 + Math.floor(Math.random() * 4);
    var result = [];
    if (classic && first) {
      result.push(CLASSIC);
      sentences--;
    }
    for (var i = 0; i < sentences; i++) result.push(makeSentence(6, 16));
    return result.join(' ');
  }

  function generate() {
    var count = Math.max(1, Math.min(100, parseInt(document.getElementById('lorem-count').value, 10) || 3));
    var unit = document.getElementById('lorem-unit').value;
    var classic = document.getElementById('lorem-classic').checked;
    var output = [];

    if (unit === 'paragraphs') {
      for (var i = 0; i < count; i++) output.push(makeParagraph(classic, i === 0));
    } else if (unit === 'sentences') {
      if (classic && count >= 1) {
        output.push(CLASSIC);
        for (var i = 1; i < count; i++) output.push(makeSentence(6, 16));
      } else {
        for (var i = 0; i < count; i++) output.push(makeSentence(6, 16));
      }
    } else {
      var words = [];
      if (classic) {
        var classicWords = CLASSIC.replace(/[.,]/g, '').toLowerCase().split(' ');
        for (var i = 0; i < Math.min(count, classicWords.length); i++) words.push(classicWords[i]);
        for (var i = classicWords.length; i < count; i++) words.push(pick(WORDS));
      } else {
        for (var i = 0; i < count; i++) words.push(pick(WORDS));
      }
      output.push(capitalize(words.join(' ')));
    }

    var el = document.getElementById('lorem-output');
    el.innerHTML = output.map(function (p) {
      return '<p style="margin-bottom:0.75rem;line-height:1.7">' + p + '</p>';
    }).join('');
    document.getElementById('lorem-output-section').style.display = 'block';
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-generate').addEventListener('click', generate);
    document.getElementById('btn-copy').addEventListener('click', function () {
      var el = document.getElementById('lorem-output');
      mtools.copyToClipboard(el.innerText.trim(), 'Copied');
    });
    generate();
  });
})();
