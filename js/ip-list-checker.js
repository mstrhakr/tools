(function () {
  'use strict';

  // Quote every cell; neutralize spreadsheet formulas, including invalid input.
  function csvCell(value) {
    var text = String(value == null ? '' : value);
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function toCSV(results) {
    var rows = [['IP', 'Result', 'Matching reference', 'Reference line', 'Normalized CIDR', 'Error']];
    results.forEach(function (result) {
      var match = result.match;
      rows.push([result.ip, result.status === 'excluded' ? 'Not included' : result.status,
        match ? match.entry : '', match ? match.line : '', match ? match.normalized : '', result.message || '']);
    });
    return rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { toCSV: toCSV };
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var core = window.IPListCore;
    function el(id) { return document.getElementById('ip-' + id); }
    var results = [];
    var filtered = [];
    var page = 0;
    var pageSize = 200;
    var revision = 0;
    var importing = false;
    var activeReader = null;
    var importSequence = 0;

    function message(text) { el('message').textContent = text; }
    function error(text) {
      el('error').textContent = text;
      el('error').hidden = !text;
    }
    function invalidate() {
      revision++;
      results = [];
      filtered = [];
      page = 0;
      el('results').hidden = true;
      el('result-rows').textContent = '';
      el('copy-included').disabled = true;
      el('copy-excluded').disabled = true;
      el('export').disabled = true;
      el('diagnostics').hidden = true;
      error('');
    }
    function inputsChanged() {
      invalidate();
      message('Inputs changed. Click Check IPs to refresh results.');
    }
    function renderPage() {
      var start = page * pageSize;
      var visible = filtered.slice(start, start + pageSize);
      var fragment = document.createDocumentFragment();
      visible.forEach(function (result) {
        var row = document.createElement('tr');
        var ip = document.createElement('td');
        ip.textContent = result.ip;
        var status = document.createElement('td');
        status.className = 'ip-' + result.status;
        status.textContent = result.status === 'included' ? 'Included' : result.status === 'excluded' ? 'Not included' : 'Invalid IP';
        var match = document.createElement('td');
        if (result.match) {
          match.textContent = result.match.entry + ' (reference line ' + result.match.line + ')' +
            (result.match.normalized ? ' → ' + result.match.normalized : '');
        } else {
          match.textContent = result.message || '—';
        }
        row.appendChild(ip);
        row.appendChild(status);
        row.appendChild(match);
        fragment.appendChild(row);
      });
      el('result-rows').textContent = '';
      el('result-rows').appendChild(fragment);
      el('page').textContent = filtered.length ?
        (start + 1) + '–' + Math.min(start + pageSize, filtered.length) + ' of ' + filtered.length + ' results' : 'No results for this filter.';
      el('prev').disabled = page === 0;
      el('next').disabled = start + pageSize >= filtered.length;
    }
    function applyFilter() {
      var status = el('filter').value;
      filtered = results.filter(function (result) { return status === 'all' || result.status === status; });
      page = 0;
      renderPage();
    }
    function diagnostics(reference) {
      var lines = reference.errors.slice(0, 100).map(function (item) {
        return 'Line ' + item.line + ': ' + item.input + ' — ' + item.message;
      });
      if (reference.errors.length > 100) lines.push('… ' + (reference.errors.length - 100) + ' more invalid entries.');
      reference.entries.filter(function (item) { return item.normalized; }).slice(0, 100).forEach(function (item) {
        lines.push('Line ' + item.line + ': ' + item.entry + ' → ' + item.normalized);
      });
      if (reference.normalizedCount > 100) lines.push('… ' + (reference.normalizedCount - 100) + ' more normalized CIDRs.');
      el('diagnostics').hidden = lines.length === 0;
      el('diagnostics').open = reference.errors.length > 0;
      el('diagnostics-summary').textContent = reference.errors.length + ' invalid reference entries; ' + reference.normalizedCount + ' normalized CIDRs';
      el('diagnostics-text').textContent = lines.join('\n');
    }
    function check() {
      if (importing) return;
      invalidate();
      try {
        var comparison = core.compare(el('reference').value, el('queries').value, el('skip-invalid').checked);
        diagnostics(comparison.reference);
        if (comparison.blocked) {
          error(comparison.reference.entries.length === 0 ? 'Provide at least one valid reference entry.' :
            'Invalid reference entries block comparison. Correct them or explicitly enable “Skip invalid reference entries.”');
          message('No comparison performed.');
          return;
        }
        results = comparison.results;
        if (!results.length) {
          error('Provide at least one IP to check.');
          message('No query IPs found.');
          return;
        }
        var counts = { included: 0, excluded: 0, invalid: 0 };
        results.forEach(function (result) { counts[result.status]++; });
        el('counts').textContent = '';
        [['included', 'Included'], ['excluded', 'Not included'], ['invalid', 'Invalid IPs']].forEach(function (pair) {
          var span = document.createElement('span');
          var count = document.createElement('strong');
          count.textContent = counts[pair[0]].toLocaleString();
          span.appendChild(count);
          span.appendChild(document.createTextNode(' ' + pair[1]));
          el('counts').appendChild(span);
        });
        el('results').hidden = false;
        el('copy-included').disabled = counts.included === 0;
        el('copy-excluded').disabled = counts.excluded === 0;
        el('export').disabled = false;
        applyFilter();
        message('Checked ' + results.length.toLocaleString() + ' IP entries against ' + comparison.reference.entries.length.toLocaleString() +
          ' valid reference entries.' + (comparison.reference.errors.length ?
            ' WARNING: ' + comparison.reference.errors.length + ' invalid reference entries skipped; results use only valid entries.' : ''));
      } catch (err) {
        error(err.message);
        message('No comparison performed.');
      }
    }
    function setImporting(value) {
      importing = value;
      el('check').disabled = value;
      el('reference-file').disabled = value;
      el('query-file').disabled = value;
    }
    function importFile(input, target) {
      var file = input.files && input.files[0];
      if (!file || importing) return;
      invalidate();
      if (file.size > core.MAX_TEXT_LENGTH) {
        error('File exceeds the 5 MiB limit.');
        input.value = '';
        return;
      }
      var currentRevision = revision;
      var sequence = ++importSequence;
      setImporting(true);
      message('Reading ' + file.name + ' locally…');
      var reader = new FileReader();
      activeReader = reader;
      function finish() {
        if (sequence !== importSequence) return;
        activeReader = null;
        input.value = '';
        setImporting(false);
      }
      reader.onload = function () {
        if (sequence !== importSequence) return;
        try {
          if (revision !== currentRevision) throw new Error('Inputs changed while reading. File was not appended; select it again.');
          var text = String(reader.result).replace(/^\uFEFF/, '');
          if (text.includes('\0')) throw new Error('File contains binary data. Select a plain-text list.');
          var combined = target.value + (target.value && !/[\r\n]$/.test(target.value) ? '\n' : '') + text;
          // Validate size and count limits before mutating the textarea; syntax errors
          // stay editable and are reported by the next comparison.
          core.parseList(combined, target === el('reference'));
          target.value = combined;
          invalidate();
          message('Appended ' + file.name + '. Click Check IPs to compare.');
        } catch (err) {
          error(err.message);
          message('File was not appended.');
        }
        finish();
      };
      reader.onerror = function () { if (sequence === importSequence) { error('Could not read this file.'); message('File was not appended.'); finish(); } };
      reader.onabort = finish;
      reader.readAsText(file);
    }
    function cancelImport() {
      importSequence++;
      if (activeReader) activeReader.abort();
      activeReader = null;
      setImporting(false);
      el('reference-file').value = '';
      el('query-file').value = '';
    }
    function copy(status) {
      var ips = results.filter(function (item) { return item.status === status; }).map(function (item) { return item.ip; });
      if (ips.length) window.mtools.copyToClipboard(ips.join('\n'), 'Copied ' + ips.length + ' IPs');
    }
    el('reference').addEventListener('input', inputsChanged);
    el('queries').addEventListener('input', inputsChanged);
    el('skip-invalid').addEventListener('change', inputsChanged);
    el('check').addEventListener('click', check);
    el('filter').addEventListener('change', applyFilter);
    el('prev').addEventListener('click', function () { if (page > 0) { page--; renderPage(); } });
    el('next').addEventListener('click', function () { if ((page + 1) * pageSize < filtered.length) { page++; renderPage(); } });
    el('copy-included').addEventListener('click', function () { copy('included'); });
    el('copy-excluded').addEventListener('click', function () { copy('excluded'); });
    el('reference-file').addEventListener('change', function () { importFile(this, el('reference')); });
    el('query-file').addEventListener('change', function () { importFile(this, el('queries')); });
    el('clear').addEventListener('click', function () {
      cancelImport();
      el('reference').value = '';
      el('queries').value = '';
      el('skip-invalid').checked = false;
      el('filter').value = 'all';
      invalidate();
      message('Cleared. Paste lists above to start again.');
    });
    el('example').addEventListener('click', function () {
      cancelImport();
      el('reference').value = '# Mixed IPv4 and IPv6 references\n192.168.1.23/24\n10.0.0.10 - 10.0.0.50\n203.0.113.7\n2001:db8::/32';
      el('queries').value = '192.168.1.0\n192.168.1.255\n10.0.0.50\n10.0.0.51\n203.0.113.7\n8.8.8.8\n2001:db8::1\n2001:db9::1\nnot-an-ip';
      el('skip-invalid').checked = false;
      el('filter').value = 'all';
      check();
    });
    el('export').addEventListener('click', function () {
      if (!results.length) return;
      var url = URL.createObjectURL(new Blob([toCSV(results)], { type: 'text/csv;charset=utf-8' }));
      var link = document.createElement('a');
      link.href = url;
      link.download = 'ip-list-results.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  });
}());