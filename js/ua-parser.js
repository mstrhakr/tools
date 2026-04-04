(function () {
  'use strict';

  // Lightweight UA parser — no external deps
  function parseUA(ua) {
    var result = {
      browser: { name: 'Unknown', version: '' },
      engine:  { name: 'Unknown', version: '' },
      os:      { name: 'Unknown', version: '' },
      device:  { type: 'desktop', vendor: '', model: '' },
      raw: ua
    };

    // Bot detection
    if (/bot|crawl|spider|slurp|mediapartners|googlebot|bingbot|yandex|baidu|duckduckbot|facebot|ia_archiver/i.test(ua)) {
      result.device.type = 'bot';
    }

    // OS
    if (/windows nt (\d+\.\d+)/i.test(ua)) {
      var map = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.1': 'XP' };
      result.os.name = 'Windows';
      result.os.version = map[RegExp.$1] || RegExp.$1;
    } else if (/mac os x ([\d_]+)/i.test(ua)) {
      result.os.name = 'macOS';
      result.os.version = RegExp.$1.replace(/_/g, '.');
    } else if (/android ([\d.]+)/i.test(ua)) {
      result.os.name = 'Android';
      result.os.version = RegExp.$1;
      result.device.type = 'mobile';
    } else if (/(iphone|ipad|ipod)/i.test(ua)) {
      result.os.name = 'iOS';
      if (/os ([\d_]+)/i.test(ua)) result.os.version = RegExp.$1.replace(/_/g, '.');
      result.device.type = /ipad/i.test(ua) ? 'tablet' : 'mobile';
      result.device.vendor = 'Apple';
      result.device.model = /ipad/i.test(ua) ? 'iPad' : 'iPhone';
    } else if (/linux/i.test(ua)) {
      result.os.name = 'Linux';
    } else if (/cros/i.test(ua)) {
      result.os.name = 'Chrome OS';
    }

    // Engine
    if (/edg\/([\d.]+)/i.test(ua)) {
      result.engine.name = 'Blink'; result.engine.version = RegExp.$1;
    } else if (/gecko\/([\d.]+)/i.test(ua)) {
      result.engine.name = 'Gecko'; result.engine.version = RegExp.$1;
    } else if (/applewebkit\/([\d.]+)/i.test(ua)) {
      result.engine.name = 'WebKit'; result.engine.version = RegExp.$1;
    } else if (/trident\/([\d.]+)/i.test(ua)) {
      result.engine.name = 'Trident'; result.engine.version = RegExp.$1;
    }

    // Browser
    if (/edg\/([\d.]+)/i.test(ua)) {
      result.browser.name = 'Edge'; result.browser.version = RegExp.$1;
    } else if (/opr\/([\d.]+)/i.test(ua) || /opera\/([\d.]+)/i.test(ua)) {
      result.browser.name = 'Opera';
      result.browser.version = RegExp.$1;
    } else if (/brave/i.test(ua)) {
      result.browser.name = 'Brave'; result.browser.version = '';
    } else if (/chrome\/([\d.]+)/i.test(ua)) {
      result.browser.name = 'Chrome'; result.browser.version = RegExp.$1;
    } else if (/firefox\/([\d.]+)/i.test(ua)) {
      result.browser.name = 'Firefox'; result.browser.version = RegExp.$1;
    } else if (/safari\/([\d.]+)/i.test(ua)) {
      result.browser.name = 'Safari';
      if (/version\/([\d.]+)/i.test(ua)) result.browser.version = RegExp.$1;
    } else if (/msie ([\d.]+)/i.test(ua) || /trident.*rv:([\d.]+)/i.test(ua)) {
      result.browser.name = 'Internet Explorer'; result.browser.version = RegExp.$1;
    } else if (/curl\/([\d.]+)/i.test(ua)) {
      result.browser.name = 'curl'; result.browser.version = RegExp.$1;
      result.device.type = 'cli';
    }

    return result;
  }

  function row(label, val) {
    return '<tr><td style="color:var(--fg-muted);padding:0.35rem 0.5rem;font-size:0.85rem">' + label + '</td>' +
      '<td style="padding:0.35rem 0.5rem;font-size:0.85rem;font-weight:500">' + (val || '<span style="color:var(--fg-muted)">unknown</span>') + '</td></tr>';
  }

  function render(parsed) {
    var el = document.getElementById('ua-results');
    el.innerHTML =
      '<div class="tool-section">' +
      '<h2>Browser</h2>' +
      '<table style="width:100%"><tbody>' +
      row('Name', parsed.browser.name) +
      row('Version', parsed.browser.version) +
      '</tbody></table>' +
      '</div>' +
      '<div class="tool-section">' +
      '<h2>Operating System</h2>' +
      '<table style="width:100%"><tbody>' +
      row('Name', parsed.os.name) +
      row('Version', parsed.os.version) +
      '</tbody></table>' +
      '</div>' +
      '<div class="tool-section">' +
      '<h2>Engine</h2>' +
      '<table style="width:100%"><tbody>' +
      row('Name', parsed.engine.name) +
      row('Version', parsed.engine.version) +
      '</tbody></table>' +
      '</div>' +
      '<div class="tool-section">' +
      '<h2>Device</h2>' +
      '<table style="width:100%"><tbody>' +
      row('Type', parsed.device.type) +
      row('Vendor', parsed.device.vendor) +
      row('Model', parsed.device.model) +
      '</tbody></table>' +
      '</div>';
  }

  function parse() {
    var ua = document.getElementById('ua-input').value.trim();
    if (!ua) return;
    render(parseUA(ua));
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-parse').addEventListener('click', parse);
    document.getElementById('btn-my-ua').addEventListener('click', function () {
      document.getElementById('ua-input').value = navigator.userAgent;
      parse();
    });
    document.getElementById('btn-clear').addEventListener('click', function () {
      document.getElementById('ua-input').value = '';
      document.getElementById('ua-results').innerHTML = '';
    });
  });
})();
