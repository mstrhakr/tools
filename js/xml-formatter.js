(function () {
  'use strict';

  function repeat(count) {
    return new Array(count + 1).join('  ');
  }

  function escapeAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function formatNode(node, depth) {
    var indent = repeat(depth);

    if (node.nodeType === 1) {
      var attrs = Array.prototype.map.call(node.attributes, function (attr) {
        return attr.name + '="' + escapeAttribute(attr.value) + '"';
      }).join(' ');
      var open = '<' + node.nodeName + (attrs ? ' ' + attrs : '') + '>';
      var close = '</' + node.nodeName + '>';
      var children = Array.prototype.filter.call(node.childNodes, function (child) {
        return child.nodeType !== 3 || child.nodeValue.trim() !== '';
      });

      if (!children.length) {
        return indent + open.replace(/>$/, ' />');
      }

      if (children.length === 1 && children[0].nodeType === 3) {
        return indent + open + children[0].nodeValue.trim() + close;
      }

      return indent + open + '\n' + children.map(function (child) {
        return formatNode(child, depth + 1);
      }).join('\n') + '\n' + indent + close;
    }

    if (node.nodeType === 3) {
      return indent + node.nodeValue.trim();
    }

    if (node.nodeType === 7) {
      return indent + '<?' + node.nodeName + ' ' + node.nodeValue + '?>';
    }

    if (node.nodeType === 8) {
      return indent + '<!--' + node.nodeValue + '-->';
    }

    return '';
  }

  function formatXml(xmlText) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(xmlText, 'application/xml');
    var parseError = doc.getElementsByTagName('parsererror')[0];

    if (parseError) {
      throw new Error(parseError.textContent.replace(/\s+/g, ' ').trim());
    }

    var parts = [];
    Array.prototype.forEach.call(doc.childNodes, function (node) {
      var formatted = formatNode(node, 0);
      if (formatted) parts.push(formatted);
    });

    return parts.join('\n');
  }

  function run() {
    var input = document.getElementById('xml-input').value.trim();
    var output = document.getElementById('xml-output');
    var status = document.getElementById('xml-status');

    if (!input) {
      output.value = '';
      status.className = 'mt-2 text-muted';
      status.textContent = 'Paste XML to validate and format it.';
      return;
    }

    try {
      output.value = formatXml(input);
      status.className = 'mt-2 text-success';
      status.textContent = 'XML is well formed and has been formatted.';
    } catch (error) {
      output.value = '';
      status.className = 'mt-2 text-error';
      status.textContent = error.message || 'Invalid XML.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btn-format-xml').addEventListener('click', run);
    document.getElementById('copy-xml').addEventListener('click', function () {
      window.mtools.copyToClipboard(document.getElementById('xml-output').value, 'Copied output');
    });
    run();
  });
})();