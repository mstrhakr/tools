(function () {
  'use strict';

  function countStats(text) {
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;
    var words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    var sentences = text.trim() === '' ? 0 : text.split(/[.!?]+/).filter(function (s) { return s.trim().length > 0; }).length;
    var paragraphs = text.trim() === '' ? 0 : text.split(/\n\s*\n/).filter(function (s) { return s.trim().length > 0; }).length;
    var lines = text === '' ? 0 : text.split('\n').length;
    var bytes = new Blob([text]).size;

    // Reading time at ~200 wpm
    var readingMinutes = words / 200;
    var readingTime;
    if (readingMinutes < 1) {
      readingTime = Math.ceil(readingMinutes * 60) + 's';
    } else if (readingMinutes < 60) {
      readingTime = Math.ceil(readingMinutes) + 'm';
    } else {
      var h = Math.floor(readingMinutes / 60);
      var m = Math.ceil(readingMinutes % 60);
      readingTime = h + 'h ' + m + 'm';
    }

    return {
      chars: chars,
      charsNoSpaces: charsNoSpaces,
      words: words,
      sentences: sentences,
      paragraphs: paragraphs,
      lines: lines,
      readingTime: readingTime,
      bytes: bytes
    };
  }

  function update() {
    var text = document.getElementById('text-input').value;
    var s = countStats(text);
    document.getElementById('s-chars').textContent = s.chars.toLocaleString();
    document.getElementById('s-chars-ns').textContent = s.charsNoSpaces.toLocaleString();
    document.getElementById('s-words').textContent = s.words.toLocaleString();
    document.getElementById('s-sentences').textContent = s.sentences.toLocaleString();
    document.getElementById('s-paragraphs').textContent = s.paragraphs.toLocaleString();
    document.getElementById('s-lines').textContent = s.lines.toLocaleString();
    document.getElementById('s-reading').textContent = s.readingTime;
    document.getElementById('s-bytes').textContent = s.bytes.toLocaleString();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('text-input').addEventListener('input', update);
    update();
  });
})();
