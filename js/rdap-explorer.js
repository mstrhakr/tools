(function () {
  'use strict';

  var API_BASE = 'https://api.tools.mstrhakr.com';

  function esc(v) {
    return window.mtools.escapeHtml(v == null ? '' : String(v));
  }

  function makeStatItem(label, value) {
    return '<div class="stat-item">' +
      '<div class="stat-value" style="font-size:1rem;word-break:break-word">' + esc(value || 'N/A') + '</div>' +
      '<div class="stat-label">' + esc(label) + '</div>' +
      '</div>';
  }

  function fromVCard(entity, key) {
    if (!entity || !Array.isArray(entity.vcardArray) || !Array.isArray(entity.vcardArray[1])) return '';
    for (var i = 0; i < entity.vcardArray[1].length; i += 1) {
      var row = entity.vcardArray[1][i];
      if (Array.isArray(row) && row[0] === key) {
        return row[3] || '';
      }
    }
    return '';
  }

  function summarizeEntities(entities) {
    if (!Array.isArray(entities) || !entities.length) return '';
    var html = '<div class="tool-section mt-2"><h2>Entities</h2>';

    entities.forEach(function (entity) {
      var handle = entity.handle || '';
      var roles = Array.isArray(entity.roles) ? entity.roles.join(', ') : '';
      var name = fromVCard(entity, 'fn') || fromVCard(entity, 'org');
      var email = fromVCard(entity, 'email');

      html += '<div class="result mt-1">' +
        '<div><strong>' + esc(name || handle || 'Entity') + '</strong></div>' +
        (roles ? '<div class="text-muted">Roles: ' + esc(roles) + '</div>' : '') +
        (handle ? '<div class="text-muted">Handle: ' + esc(handle) + '</div>' : '') +
        (email ? '<div class="text-muted">Email: ' + esc(email) + '</div>' : '') +
        '</div>';
    });

    html += '</div>';
    return html;
  }

  function summarizeEvents(events) {
    if (!Array.isArray(events) || !events.length) return '';
    var html = '<div class="tool-section mt-2"><h2>Events</h2><div class="result">';
    events.forEach(function (evt) {
      var action = evt.eventAction || 'event';
      var date = evt.eventDate || '';
      html += '<div>' + esc(action) + (date ? ': ' + esc(date) : '') + '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function summarizeNameservers(nameservers) {
    if (!Array.isArray(nameservers) || !nameservers.length) return '';
    var html = '<div class="tool-section mt-2"><h2>Nameservers</h2><div class="result">';
    nameservers.forEach(function (ns) {
      var name = ns.ldhName || ns.unicodeName || ns.handle || 'unknown';
      html += '<div>' + esc(name) + '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function render(data, query) {
    var parts = [];
    parts.push('<div class="tool-section">');
    parts.push('<h2>Summary</h2>');
    parts.push('<div class="stats-grid">');
    parts.push(makeStatItem('Query', query));
    parts.push(makeStatItem('Class', data.objectClassName));
    parts.push(makeStatItem('Handle', data.handle));
    parts.push(makeStatItem('Name', data.name || data.ldhName || data.unicodeName));
    parts.push(makeStatItem('Country', data.country));
    parts.push(makeStatItem('IP Version', data.ipVersion));
    parts.push(makeStatItem('Range Start', data.startAddress));
    parts.push(makeStatItem('Range End', data.endAddress));
    parts.push(makeStatItem('Port43', data.port43));
    parts.push('</div>');
    parts.push('</div>');

    parts.push(summarizeNameservers(data.nameservers));
    parts.push(summarizeEntities(data.entities));
    parts.push(summarizeEvents(data.events));

    parts.push('<div class="tool-section mt-2">');
    parts.push('<div class="btn-group mb-1"><button class="btn btn-secondary btn-sm" id="rdap-copy-raw">Copy raw JSON</button></div>');
    parts.push('<pre style="white-space:pre-wrap;word-break:break-word;max-height:420px;overflow:auto">' + esc(JSON.stringify(data, null, 2)) + '</pre>');
    parts.push('</div>');

    return parts.join('');
  }

  function lookup() {
    var input = document.getElementById('rdap-input').value.trim();
    var errorEl = document.getElementById('rdap-error');
    var resultsEl = document.getElementById('rdap-results');
    var loader = document.getElementById('rdap-loader');
    var btn = document.getElementById('rdap-btn');

    errorEl.style.display = 'none';
    errorEl.textContent = '';
    resultsEl.innerHTML = '';

    if (!input) {
      errorEl.textContent = 'Enter a domain or IP address.';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    loader.style.display = 'inline';

    fetch(API_BASE + '/api/rdap?query=' + encodeURIComponent(input))
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (resp) {
        if (!resp.ok || resp.body.error) {
          throw new Error(resp.body.error || 'RDAP lookup failed');
        }

        resultsEl.innerHTML = render(resp.body, input);
        var copyBtn = document.getElementById('rdap-copy-raw');
        if (copyBtn) {
          copyBtn.addEventListener('click', function () {
            window.mtools.copyToClipboard(JSON.stringify(resp.body, null, 2), 'Copied RDAP JSON');
          });
        }
      })
      .catch(function (err) {
        errorEl.textContent = err.message || 'Request failed.';
        errorEl.style.display = 'block';
      })
      .finally(function () {
        btn.disabled = false;
        loader.style.display = 'none';
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('rdap-btn').addEventListener('click', lookup);
    document.getElementById('rdap-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') lookup();
    });
  });
})();