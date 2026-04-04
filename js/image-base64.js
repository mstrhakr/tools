(function () {
  'use strict';

  var currentDataURI = '';
  var currentB64 = '';

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      mtools.showToast('Please select an image file');
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      var dataURI = e.target.result;
      currentDataURI = dataURI;
      currentB64 = dataURI.split(',')[1] || '';

      var preview = document.getElementById('img-preview');
      preview.src = dataURI;
      preview.style.display = 'block';

      var info = document.getElementById('img-info');
      info.textContent = file.name + ' \u00b7 ' + file.type + ' \u00b7 ' + (file.size / 1024).toFixed(1) + ' KB  \u2192  ' + (currentB64.length / 1024).toFixed(1) + ' KB base64';
      info.style.display = 'block';

      document.getElementById('output-uri').value = dataURI;
      document.getElementById('output-section').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var dropZone = document.getElementById('drop-zone');
    var fileInput = document.getElementById('file-input');

    dropZone.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      var file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    document.getElementById('btn-copy-uri').addEventListener('click', function () {
      if (currentDataURI) mtools.copyToClipboard(currentDataURI, 'Data URI copied');
    });
    document.getElementById('btn-copy-b64').addEventListener('click', function () {
      if (currentB64) mtools.copyToClipboard(currentB64, 'Base64 copied');
    });
    document.getElementById('btn-copy-css').addEventListener('click', function () {
      if (currentDataURI) mtools.copyToClipboard('background-image: url("' + currentDataURI + '");', 'CSS copied');
    });
  });
})();
