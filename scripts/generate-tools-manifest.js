'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CATEGORY_ORDER = ['converter', 'encoding', 'text', 'math', 'generator', 'network', 'security', 'dev'];

// Entities used by tool metadata. Numeric references support all Unicode code points.
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  copy: '©', divide: '÷', ldquo: '“', rdquo: '”', rsquo: '’',
  mdash: '—', ndash: '–', middot: '·', minus: '−', rarr: '→', times: '×'
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, reference) => {
    if (reference[0] !== '#') return ENTITIES[reference] || entity;
    const hex = reference[1].toLowerCase() === 'x';
    const code = Number.parseInt(reference.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
      ? String.fromCodePoint(code) : '\ufffd';
  });
}

function plainText(html) {
  // Strip markup before decoding so escaped angle brackets remain visible text.
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseToolHtml(html, category, slug) {
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const name = (title ? plainText(title[1]) : '')
    .replace(/\s*-\s*mstrhakr\s+tools\s*$/i, '').trim()
    || slug.replace(/-/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

  let description = '';
  for (const opening of html.matchAll(/<div\b([^>]*)>/gi)) {
    const attribute = opening[1].match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const classes = attribute && (attribute[1] || attribute[2] || attribute[3] || '');
    if (!classes || !classes.split(/\s+/).includes('tool-header')) continue;
    const body = html.slice(opening.index + opening[0].length).split(/<\/div\s*>/i)[0];
    const paragraph = body.match(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/i);
    if (paragraph) description = plainText(paragraph[1]);
    break;
  }

  return {
    category,
    name,
    url: '/tools/' + category + '/' + slug + '.html',
    tags: (slug + ' ' + category + ' ' + name).toLowerCase(),
    description
  };
}

function buildManifest(root = ROOT) {
  const tools = [];
  const toolsRoot = path.join(root, 'tools');
  for (const category of fs.readdirSync(toolsRoot, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryRoot = path.join(toolsRoot, category.name);
    for (const file of fs.readdirSync(categoryRoot, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.html')) continue;
      tools.push(parseToolHtml(
        fs.readFileSync(path.join(categoryRoot, file.name), 'utf8'),
        category.name, file.name.slice(0, -5)
      ));
    }
  }
  const rank = category => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  tools.sort((a, b) => rank(a.category) - rank(b.category)
    || a.name.localeCompare(b.name, 'en') || a.url.localeCompare(b.url, 'en'));
  if (!tools.length) throw new Error('No tool HTML files found');
  return { tools };
}

if (require.main === module) {
  const manifest = buildManifest();
  const output = process.argv[2] || path.join(ROOT, 'tools-manifest.json');
  fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('Wrote ' + output + ' with ' + manifest.tools.length + ' tools');
}

module.exports = { CATEGORY_ORDER, decodeEntities, parseToolHtml, buildManifest };