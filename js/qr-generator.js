(function () {
  'use strict';

  var uploadedAssets = {
    backgroundImageData: null,
    centerImageData: null
  };

  function getValue(id) {
    return document.getElementById(id).value.trim();
  }

  function getNumber(id, fallback, min, max) {
    var value = parseInt(document.getElementById(id).value, 10);
    if (Number.isNaN(value)) value = fallback;
    if (typeof min === 'number') value = Math.max(min, value);
    if (typeof max === 'number') value = Math.min(max, value);
    return value;
  }

  function sanitizeHexColor(color, fallback) {
    var raw = (color || '').trim().replace(/^#/, '');
    return /^[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
  }

  function escapeWifiValue(value) {
    return (value || '').replace(/([\\;,:"])/g, '\\$1');
  }

  function escapeVCardValue(value) {
    return (value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  function escapeIcsValue(value) {
    return (value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  function toIcsDateTime(localDateTimeString) {
    if (!localDateTimeString) return '';
    var date = new Date(localDateTimeString);
    if (Number.isNaN(date.getTime())) return '';

    function pad(num) {
      return String(num).padStart(2, '0');
    }

    return date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) + 'T' +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) + 'Z';
  }

  function buildPayload(type) {
    var params;
    var value;

    if (type === 'text') {
      value = getValue('qr-text');
      if (!value) throw new Error('Enter text to encode');
      return value;
    }

    if (type === 'url') {
      value = getValue('qr-url');
      if (!value) throw new Error('Enter a URL');
      return value;
    }

    if (type === 'email') {
      var to = getValue('qr-email-to');
      if (!to) throw new Error('Email "To" is required');
      params = new URLSearchParams();
      var cc = getValue('qr-email-cc');
      var bcc = getValue('qr-email-bcc');
      var subject = getValue('qr-email-subject');
      var body = getValue('qr-email-body');
      if (cc) params.set('cc', cc);
      if (bcc) params.set('bcc', bcc);
      if (subject) params.set('subject', subject);
      if (body) params.set('body', body);
      return 'mailto:' + encodeURIComponent(to) + (params.toString() ? '?' + params.toString() : '');
    }

    if (type === 'phone') {
      value = getValue('qr-phone');
      if (!value) throw new Error('Phone number is required');
      return 'tel:' + value;
    }

    if (type === 'sms') {
      var smsNumber = getValue('qr-sms-number');
      if (!smsNumber) throw new Error('SMS phone number is required');
      return 'SMSTO:' + smsNumber + ':' + getValue('qr-sms-message');
    }

    if (type === 'wifi') {
      var ssid = getValue('qr-wifi-ssid');
      var encryption = document.getElementById('qr-wifi-encryption').value;
      var password = getValue('qr-wifi-password');
      var hidden = document.getElementById('qr-wifi-hidden').checked;
      if (!ssid) throw new Error('Wi-Fi SSID is required');
      if (encryption !== 'nopass' && !password) throw new Error('Wi-Fi password is required for secured networks');

      var wifiPayload = 'WIFI:T:' + encryption + ';S:' + escapeWifiValue(ssid) + ';';
      if (encryption !== 'nopass') wifiPayload += 'P:' + escapeWifiValue(password) + ';';
      if (hidden) wifiPayload += 'H:true;';
      wifiPayload += ';';
      return wifiPayload;
    }

    if (type === 'vcard') {
      var firstName = getValue('qr-vcard-first');
      var lastName = getValue('qr-vcard-last');
      var fullName = (firstName + ' ' + lastName).trim();
      if (!fullName) throw new Error('At least a first or last name is required for vCard');

      var lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:' + escapeVCardValue(lastName) + ';' + escapeVCardValue(firstName) + ';;;',
        'FN:' + escapeVCardValue(fullName)
      ];

      var org = getValue('qr-vcard-org');
      var title = getValue('qr-vcard-title');
      var phone = getValue('qr-vcard-phone');
      var email = getValue('qr-vcard-email');
      var website = getValue('qr-vcard-website');
      var address = getValue('qr-vcard-address');
      var note = getValue('qr-vcard-note');

      if (org) lines.push('ORG:' + escapeVCardValue(org));
      if (title) lines.push('TITLE:' + escapeVCardValue(title));
      if (phone) lines.push('TEL;TYPE=CELL:' + escapeVCardValue(phone));
      if (email) lines.push('EMAIL:' + escapeVCardValue(email));
      if (website) lines.push('URL:' + escapeVCardValue(website));
      if (address) lines.push('ADR:;;' + escapeVCardValue(address) + ';;;;');
      if (note) lines.push('NOTE:' + escapeVCardValue(note));

      lines.push('END:VCARD');
      return lines.join('\n');
    }

    if (type === 'geo') {
      var lat = getValue('qr-geo-lat');
      var lng = getValue('qr-geo-lng');
      if (!lat || !lng) throw new Error('Latitude and longitude are required');

      var latNum = parseFloat(lat);
      var lngNum = parseFloat(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) throw new Error('Latitude and longitude must be numeric');

      var geoPayload = 'geo:' + latNum + ',' + lngNum;
      var geoQuery = getValue('qr-geo-query');
      if (geoQuery) geoPayload += '?q=' + encodeURIComponent(geoQuery);
      return geoPayload;
    }

    if (type === 'event') {
      var eventTitle = getValue('qr-event-title');
      var eventStart = toIcsDateTime(getValue('qr-event-start'));
      var eventEnd = toIcsDateTime(getValue('qr-event-end'));
      if (!eventTitle) throw new Error('Event title is required');
      if (!eventStart) throw new Error('Event start date/time is required');

      var eventLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//mstrhakr tools//QR//EN',
        'BEGIN:VEVENT',
        'UID:' + Date.now() + '@mstrhakr-tools',
        'SUMMARY:' + escapeIcsValue(eventTitle),
        'DTSTART:' + eventStart
      ];

      if (eventEnd) eventLines.push('DTEND:' + eventEnd);

      var eventLocation = getValue('qr-event-location');
      var eventDescription = getValue('qr-event-description');
      if (eventLocation) eventLines.push('LOCATION:' + escapeIcsValue(eventLocation));
      if (eventDescription) eventLines.push('DESCRIPTION:' + escapeIcsValue(eventDescription));

      eventLines.push('END:VEVENT', 'END:VCALENDAR');
      return eventLines.join('\r\n');
    }

    if (type === 'whatsapp') {
      var waNumber = getValue('qr-wa-number').replace(/[^0-9]/g, '');
      if (!waNumber) throw new Error('WhatsApp phone number is required');
      params = new URLSearchParams();
      var waMessage = getValue('qr-wa-message');
      if (waMessage) params.set('text', waMessage);
      return 'https://wa.me/' + waNumber + (params.toString() ? '?' + params.toString() : '');
    }

    if (type === 'otp') {
      var otpLabel = getValue('qr-otp-label');
      var otpIssuer = getValue('qr-otp-issuer');
      var otpSecret = getValue('qr-otp-secret').replace(/\s+/g, '');
      if (!otpLabel) throw new Error('OTP account label is required');
      if (!otpSecret) throw new Error('OTP secret is required');

      params = new URLSearchParams();
      params.set('secret', otpSecret);
      if (otpIssuer) params.set('issuer', otpIssuer);
      params.set('digits', document.getElementById('qr-otp-digits').value);
      params.set('period', String(getNumber('qr-otp-period', 30, 10, 120)));

      var labelPath = otpIssuer ? otpIssuer + ':' + otpLabel : otpLabel;
      return 'otpauth://totp/' + encodeURIComponent(labelPath) + '?' + params.toString();
    }

    throw new Error('Unsupported QR type');
  }

  function buildQrUrl(text, options) {
    var params = new URLSearchParams();
    params.set('text', text);
    params.set('size', String(options.size));
    params.set('ecLevel', options.ec);
    params.set('format', 'png');
    params.set('margin', String(options.margin));
    params.set('dark', sanitizeHexColor(options.dark, '000000'));
    params.set('light', sanitizeHexColor(options.light, 'ffffff'));
    return 'https://quickchart.io/qr?' + params.toString();
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Failed to load image')); };
      img.src = src;
    });
  }

  function drawCover(ctx, img, x, y, targetWidth, targetHeight) {
    var scale = Math.max(targetWidth / img.width, targetHeight / img.height);
    var width = img.width * scale;
    var height = img.height * scale;
    var offsetX = x + (targetWidth - width) / 2;
    var offsetY = y + (targetHeight - height) / 2;
    ctx.drawImage(img, offsetX, offsetY, width, height);
  }

  function roundRectPath(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  async function renderQrImage(payload, options) {
    var canvas = document.getElementById('qr-canvas');
    var ctx = canvas.getContext('2d');

    var qrSourceUrl = buildQrUrl(payload, options);
    var qrImage = await loadImage(qrSourceUrl);

    var paddedSize = options.size + (options.framePadding * 2);
    canvas.width = paddedSize;
    canvas.height = paddedSize;

    ctx.fillStyle = options.frameColor;
    ctx.fillRect(0, 0, paddedSize, paddedSize);

    if (uploadedAssets.backgroundImageData) {
      var backgroundImage = await loadImage(uploadedAssets.backgroundImageData);
      ctx.save();
      ctx.globalAlpha = options.backgroundOpacity;
      drawCover(ctx, backgroundImage, 0, 0, paddedSize, paddedSize);
      ctx.restore();
    }

    ctx.drawImage(qrImage, options.framePadding, options.framePadding, options.size, options.size);

    if (uploadedAssets.centerImageData) {
      var centerImage = await loadImage(uploadedAssets.centerImageData);
      var logoSize = Math.round(options.size * options.centerScale / 100);
      var logoX = options.framePadding + Math.round((options.size - logoSize) / 2);
      var logoY = options.framePadding + Math.round((options.size - logoSize) / 2);
      var platePadding = options.centerPadding;

      if (platePadding > 0) {
        var plateX = logoX - platePadding;
        var plateY = logoY - platePadding;
        var plateSize = logoSize + (platePadding * 2);
        roundRectPath(ctx, plateX, plateY, plateSize, plateSize, Math.max(4, platePadding));
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      ctx.drawImage(centerImage, logoX, logoY, logoSize, logoSize);
    }
  }

  function showActivePanel(type) {
    var panels = document.querySelectorAll('.qr-type-panel');
    panels.forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-type') === type);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Unable to read image file')); };
      reader.readAsDataURL(file);
    });
  }

  function attachImageInputHandler(inputId, assetKey) {
    var input = document.getElementById(inputId);
    input.addEventListener('change', function () {
      if (!input.files || !input.files[0]) {
        uploadedAssets[assetKey] = null;
        return;
      }
      readFileAsDataUrl(input.files[0])
        .then(function (dataUrl) {
          uploadedAssets[assetKey] = dataUrl;
        })
        .catch(function () {
          uploadedAssets[assetKey] = null;
        });
    });
  }

  async function generate() {
    var type = document.getElementById('qr-type').value;
    var size = getNumber('qr-size', 256, 64, 1024);
    var ec = document.getElementById('qr-ec').value;
    var margin = getNumber('qr-margin', 2, 0, 20);
    var dark = document.getElementById('qr-dark').value;
    var light = document.getElementById('qr-light').value;
    var framePadding = getNumber('qr-frame-padding', 0, 0, 256);
    var frameColor = document.getElementById('qr-frame-bg').value;
    var backgroundOpacity = getNumber('qr-bg-opacity', 30, 0, 100) / 100;
    var centerScale = getNumber('qr-center-scale', 20, 10, 35);
    var centerPadding = getNumber('qr-center-padding', 8, 0, 32);
    var errorEl = document.getElementById('qr-error');
    var outputEl = document.getElementById('qr-output');
    var generateButton = document.getElementById('btn-generate');

    errorEl.style.display = 'none';

    try {
      generateButton.disabled = true;
      var payload = buildPayload(type);
      await renderQrImage(payload, {
        size: size,
        ec: ec,
        margin: margin,
        dark: dark,
        light: light,
        framePadding: framePadding,
        frameColor: frameColor,
        backgroundOpacity: backgroundOpacity,
        centerScale: centerScale,
        centerPadding: centerPadding
      });
      outputEl.style.display = 'block';
    } catch (err) {
      errorEl.textContent = 'QR generation failed: ' + (err.message || 'Unknown error');
      errorEl.style.display = 'block';
      outputEl.style.display = 'none';
    } finally {
      generateButton.disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var typeSelect = document.getElementById('qr-type');
    showActivePanel(typeSelect.value);
    typeSelect.addEventListener('change', function () {
      showActivePanel(typeSelect.value);
    });

    attachImageInputHandler('qr-bg-image', 'backgroundImageData');
    attachImageInputHandler('qr-center-image', 'centerImageData');

    document.getElementById('btn-generate').addEventListener('click', function () {
      generate();
    });

    document.getElementById('btn-download').addEventListener('click', function () {
      var canvas = document.getElementById('qr-canvas');
      if (!canvas.width || !canvas.height) return;
      var link = document.createElement('a');
      link.download = 'qrcode.png';
      try {
        link.href = canvas.toDataURL('image/png');
      } catch (err) {
        return;
      }
      link.click();
    });

    document.querySelector('main').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        generate();
      }
    });
  });
})();
