'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../js/ip-list-core');
const { parseIP, parseReference, parseList, buildIndex, findMatch, compare,
    MAX_TEXT_LENGTH, MAX_ENTRIES } = core;

test('CommonJS and browser exports expose the same API without dependencies', () => {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/ip-list-core.js'), 'utf8'), context);
    assert.deepEqual(Object.keys(context.window.IPListCore).sort(), Object.keys(core).sort());
    assert.equal(context.window.IPListCore.parseIP('::1').value, 1n);
});

test('strict IPv4: zero, maximum, numeric value and surrounding whitespace', () => {
    assert.deepEqual(parseIP(' 0.0.0.0 '), { family: 4, value: 0n });
    assert.deepEqual(parseIP('255.255.255.255'), { family: 4, value: (1n << 32n) - 1n });
    assert.equal(parseIP('192.0.2.1').value, 0xc0000201n);
    for (const input of ['', '1.2.3', '1.2.3.4.5', '1..3.4', '.1.2.3', '1.2.3.',
        '01.2.3.4', '1.02.3.4', '00.0.0.0', '256.0.0.1', '-1.2.3.4',
        '+1.2.3.4', '0x1.2.3.4', '1e0.2.3.4', '1. 2.3.4', '1.2.3.4:80']) {
        assert.throws(() => parseIP(input), Error, input);
    }
    for (const input of [null, undefined, 123, {}]) assert.throws(() => parseIP(input), /string/);
});

test('IPv6 full/compressed forms, edge compression, uppercase and embedded IPv4', () => {
    const equalForms = [
        ['::', '0:0:0:0:0:0:0:0'],
        ['::1', '0:0:0:0:0:0:0:1'],
        ['1::', '1:0:0:0:0:0:0:0'],
        ['1:2:3::4:5:6:7', '1:2:3:0:4:5:6:7'],
        ['2001:DB8::ABCD', '2001:db8:0:0:0:0:0:abcd'],
        ['::ffff:192.0.2.1', '0:0:0:0:0:ffff:c000:201'],
        ['1:2:3:4:5:6:192.0.2.1', '1:2:3:4:5:6:c000:201'],
        ['::192.0.2.1', '::c000:201']
    ];
    for (const [a, b] of equalForms) {
        assert.deepEqual(parseIP(a), parseIP(b), a);
        assert.equal(parseIP(a).family, 6);
    }
    assert.equal(parseIP('ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff').value, (1n << 128n) - 1n);
    assert.equal(parseIP('::ffff:255.255.255.255').family, 6);
});

test('IPv6 rejects malformed compression, groups, dotted placement, scopes and brackets', () => {
    for (const input of [':', ':::', '1:::2', '1::2::3', ':1:2:3:4:5:6:7',
        '1:2:3:4:5:6:7:', '1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9',
        '1:2:3:4:5:6:7:8::', '::1:2:3:4:5:6:7:8', '12345::', 'gggg::',
        '::ffff:192.0.2.01', '::ffff:256.0.2.1', '::ffff:192..2.1',
        '::192.0.2.1:1', '192.0.2.1::', '192.0.2.1::192.0.2.2',
        '1:2:3:4:5:192.0.2.1', '1:2:3:4:5:6:7:192.0.2.1',
        '::ffff:192.0.2.1:80', 'fe80::1%eth0', '[::1]', '[::1]:80', ':: 1']) {
        assert.throws(() => parseIP(input), Error, input);
    }
});

test('CIDR inclusive boundaries /0 /32 /128 and host-bit normalization', () => {
    for (const [input, family, start, end, normalized] of [
        ['192.0.2.3/0', 4, 0n, (1n << 32n) - 1n, '0.0.0.0/0'],
        ['0.0.0.0/0', 4, 0n, (1n << 32n) - 1n, null],
        ['192.0.2.129/24', 4, 0xc0000200n, 0xc00002ffn, '192.0.2.0/24'],
        ['255.255.255.255/32', 4, (1n << 32n) - 1n, (1n << 32n) - 1n, null],
        ['::1/0', 6, 0n, (1n << 128n) - 1n, '::/0'],
        ['::/0', 6, 0n, (1n << 128n) - 1n, null],
        ['::1/128', 6, 1n, 1n, null],
        ['ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/128', 6,
            (1n << 128n) - 1n, (1n << 128n) - 1n, null]
    ]) {
        assert.deepEqual(parseReference(' ' + input + ' '), { family, start, end, entry: input, normalized });
    }
    const v6 = parseReference('2001:DB8::1234/64');
    assert.equal(v6.normalized, '2001:db8::/64');
    assert.equal(v6.end - v6.start, (1n << 64n) - 1n);
    assert.equal(parseReference('::ffff:192.0.2.129/120').normalized, '::ffff:c000:200/120');
    assert.equal(parseReference('1:0:0:2:0:0:3:ffff/112').normalized, '1::2:0:0:3:0/112');
    assert.equal(parseReference('ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/16').normalized, 'ffff::/16');
});

test('every IPv4/IPv6 prefix includes both boundaries and excludes adjacent addresses', () => {
    for (const [address, bits] of [['255.255.255.255', 32],
        ['ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 128]]) {
        const maximum = (1n << BigInt(bits)) - 1n;
        for (let prefix = 0; prefix <= bits; prefix++) {
            const ref = parseReference(address + '/' + prefix);
            const size = 1n << BigInt(bits - prefix);
            assert.equal(ref.start, maximum - size + 1n);
            assert.equal(ref.end, maximum);
            assert.equal(ref.normalized === null, prefix === bits);
            if (ref.normalized) {
                const normalized = parseReference(ref.normalized);
                assert.equal(normalized.start, ref.start);
                assert.equal(normalized.end, ref.end);
                assert.equal(normalized.normalized, null);
            }
            const index = buildIndex([ref]);
            assert.equal(findMatch(index, { family: ref.family, value: ref.start }), ref);
            assert.equal(findMatch(index, { family: ref.family, value: ref.end }), ref);
            if (ref.start > 0n) {
                assert.equal(findMatch(index, { family: ref.family, value: ref.start - 1n }), null);
            }
        }
    }
});

test('CIDR rejects junk, signed/fractional/exponential/zero-padded and out-of-range prefixes', () => {
    for (const prefix of ['', 'junk', '24junk', 'junk24', '+24', '-1', '1.5',
        '1e1', '0x10', ' 24', '24 ', '024', '00', '33', '999999999999999999999999']) {
        // Outer whitespace is trimmed as required; use a trailing non-space
        // marker to test whitespace inside the prefix rather than outside entry.
        const input = '192.0.2.1/' + prefix + (prefix.endsWith(' ') ? 'junk' : '');
        assert.throws(() => parseReference(input), Error, input);
    }
    for (const input of ['::/129', '::/64/64', '1.2.3.4/24-1.2.3.5', '1.2.3.4-/24']) {
        assert.throws(() => parseReference(input), Error, input);
    }
});

test('single references and spaced ranges preserve originals; invalid endpoints fail', () => {
    assert.deepEqual(parseReference(' ::1 '), { family: 6, start: 1n, end: 1n, entry: '::1', normalized: null });
    assert.deepEqual(parseReference(' 1.2.3.4 - 1.2.3.5 '), {
        family: 4, start: 0x01020304n, end: 0x01020305n, entry: '1.2.3.4 - 1.2.3.5', normalized: null
    });
    assert.equal(parseReference(':: - ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff').end, (1n << 128n) - 1n);
    assert.equal(parseReference('1.2.3.4-1.2.3.4').start, parseReference('1.2.3.4-1.2.3.4').end);
    for (const input of ['::2 - ::1', '1.2.3.5-1.2.3.4', '1.2.3.4-::1',
        '1.2.3.4-', '-1.2.3.4', '::1-::2-::3', 'bad-::1']) {
        assert.throws(() => parseReference(input), Error, input);
    }
});

test('lists preserve commas, duplicates, lines, original tokens and errors; comments ignored', () => {
    const parsed = parseList('# comment\r\n 192.0.2.129/24 , bad,192.0.2.129/24 # ::bad,more\n\n::1 - ::3, ,\r::1', true);
    assert.deepEqual(parsed.entries.map(({ line, input }) => ({ line, input })), [
        { line: 2, input: '192.0.2.129/24' }, { line: 2, input: '192.0.2.129/24' },
        { line: 4, input: '::1 - ::3' }, { line: 5, input: '::1' }
    ]);
    assert.equal(parsed.normalizedCount, 2);
    assert.equal(parsed.errors.length, 1);
    assert.equal(parsed.errors[0].line, 2);
    assert.equal(parsed.errors[0].input, 'bad');
    assert.ok(parsed.errors[0].message);
    assert.deepEqual(parseList(' ,\n# comment\n,', true), { entries: [], errors: [], normalizedCount: 0 });
    const queries = parseList('1.2.3.4 1.2.3.5,::1/128,::1-::2,::1', false);
    assert.equal(queries.errors.length, 3);
    assert.equal(queries.entries.length, 1);
    assert.equal(queries.entries[0].input, '::1');
    assert.equal(queries.normalizedCount, 0);
});

test('text and entry guards accept boundaries; invalid tokens count; comments/blanks do not', () => {
    assert.equal(MAX_TEXT_LENGTH, 5 * 1024 * 1024);
    assert.equal(MAX_ENTRIES, 100000);
    assert.deepEqual(parseList('#' + 'x'.repeat(MAX_TEXT_LENGTH - 1), true).entries, []);
    assert.throws(() => parseList(' '.repeat(MAX_TEXT_LENGTH + 1), true), /5 MiB/);
    assert.equal(parseList(Array(MAX_ENTRIES).fill('::1').join(','), false).entries.length, MAX_ENTRIES);
    assert.throws(() => parseList(Array(MAX_ENTRIES + 1).fill('bad').join(','), true), /100000/);
    assert.equal(parseList(','.repeat(MAX_ENTRIES + 1) + '#x,x,x', true).entries.length, 0);
    assert.throws(() => parseList(null, true), /string/);
});

test('index is sorted/disjoint, non-mutating, inclusive and preserves real owners through overlaps', () => {
    const entries = parseList('10.0.0.5-10.0.0.15,10.0.0.0-10.0.0.10,10.0.0.8,' +
        '10.0.0.14-10.0.0.20,10.0.0.22,10.0.0.22,::1-::3,::2-::5', true).entries;
    const original = entries.slice();
    const index = buildIndex(entries);
    assert.deepEqual(entries, original);
    for (const family of [4, 6]) {
        for (let i = 0; i < index[family].length; i++) {
            const segment = index[family][i];
            assert.ok(segment.start <= segment.end);
            assert.ok(segment.owner.start <= segment.start && segment.owner.end >= segment.end);
            assert.ok(entries.includes(segment.owner));
            if (i) assert.ok(index[family][i - 1].end < segment.start);
        }
    }
    for (let i = 0; i <= 23; i++) {
        const ip = parseIP('10.0.0.' + i);
        const match = findMatch(index, ip);
        assert.equal(Boolean(match), i <= 20 || i === 22);
        if (match) {
            assert.ok(entries.includes(match));
            assert.ok(match.start <= ip.value && ip.value <= match.end);
        }
    }
    assert.equal(findMatch(index, parseIP('::')), null);
    assert.ok(findMatch(index, parseIP('::5')));
    assert.equal(findMatch(index, parseIP('::6')), null);
    assert.equal(findMatch(buildIndex([]), parseIP('::1')), null);
});

test('full networks cover endpoints without expansion; mapped IPv6 never matches IPv4', () => {
    const entries = parseList('0.0.0.0/0,::/0', true).entries;
    const index = buildIndex(entries);
    assert.equal(index[4].length, 1);
    assert.equal(index[6].length, 1);
    for (const input of ['0.0.0.0', '255.255.255.255', '::', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff']) {
        assert.ok(findMatch(index, parseIP(input)));
    }
    assert.equal(findMatch(buildIndex([entries[0]]), parseIP('::ffff:192.0.2.1')), null);
    assert.equal(findMatch(buildIndex([entries[1]]), parseIP('192.0.2.1')), null);
});

test('compare preserves mixed query order, duplicates and original reference attribution', () => {
    const result = compare('192.0.2.129/24,::1-::3',
        '# header\n192.0.2.0, bad,192.0.2.255,192.0.3.0,::3/128,::3-::4,::3,::3 # ignore');
    assert.equal(result.blocked, false);
    assert.equal(result.reference.normalizedCount, 1);
    assert.deepEqual(result.results.map(item => item.status),
        ['included', 'invalid', 'included', 'excluded', 'invalid', 'invalid', 'included', 'included']);
    assert.deepEqual(result.results.map(item => item.ip),
        ['192.0.2.0', 'bad', '192.0.2.255', '192.0.3.0', '::3/128', '::3-::4', '::3', '::3']);
    for (const item of result.results) {
        assert.equal(item.line, 2);
        if (item.status === 'included') assert.ok(result.reference.entries.includes(item.match));
        else assert.equal(item.match, null);
        if (item.status === 'invalid') assert.ok(item.message);
    }
    assert.equal(result.results[0].match.entry, '192.0.2.129/24');
    assert.deepEqual(compare('::/0', '# empty\n,').results, []);
});

test('reference errors block unless skipped; zero valid references always block', () => {
    const blocked = compare('::1,bad', '::1,bad');
    assert.equal(blocked.blocked, true);
    assert.deepEqual(blocked.results, []);
    assert.equal(blocked.reference.errors.length, 1);
    const skipped = compare('::1,bad', '::1,::2,bad', true);
    assert.equal(skipped.blocked, false);
    assert.deepEqual(skipped.results.map(item => item.status), ['included', 'excluded', 'invalid']);
    for (const refs of ['', '# nothing', 'bad']) {
        for (const skip of [false, true]) {
            assert.equal(compare(refs, '::1', skip).blocked, true);
            assert.deepEqual(compare(refs, '::1', skip).results, []);
        }
    }
    assert.throws(() => compare('bad', ' '.repeat(MAX_TEXT_LENGTH + 1)), /5 MiB/);
    assert.throws(() => compare('bad', Array(MAX_ENTRIES + 1).fill('bad').join(',')), /100000/);
});

function randomGenerator(seed) {
    return function () {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed;
    };
}

function ipv4(value) {
    return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}

test('deterministic randomized IPv4 indexes agree with brute-force inclusion and provenance', () => {
    const random = randomGenerator(0x12345678);
    for (let trial = 0; trial < 40; trial++) {
        const references = [];
        for (let i = 0; i < 150; i++) {
            const a = random() % 4096;
            const b = Math.min(4095, a + random() % 128);
            references.push(ipv4(a) + '-' + ipv4(b));
            if (i % 10 === 0) references.push(ipv4(random() % 4096) + '/' + (24 + random() % 9));
        }
        const entries = parseList(references.join(','), true).entries;
        const index = buildIndex(entries);
        const values = [0, 4095, 4096, 0xffffffff];
        for (let i = 0; i < 400; i++) values.push(random() % 4608);
        for (const entry of entries) values.push(Number(entry.start), Number(entry.end));
        for (const value of values) {
            const ip = parseIP(ipv4(value));
            const expected = entries.some(entry => entry.start <= ip.value && ip.value <= entry.end);
            const match = findMatch(index, ip);
            assert.equal(Boolean(match), expected, 'trial ' + trial + ', IP ' + ipv4(value));
            if (match) {
                assert.ok(entries.includes(match));
                assert.ok(match.start <= ip.value && ip.value <= match.end);
            }
        }
    }
});

test('scale smoke: 100000 sparse references, 100000 queries, no network expansion', () => {
    const inputs = Array.from({ length: MAX_ENTRIES }, (_, i) => ipv4(i * 2));
    const entries = parseList(inputs.reverse().join(','), true).entries;
    const index = buildIndex(entries);
    assert.equal(index[4].length, MAX_ENTRIES);
    for (let i = 0; i < MAX_ENTRIES; i++) {
        const value = BigInt(i);
        const match = findMatch(index, { family: 4, value });
        assert.equal(Boolean(match), i % 2 === 0);
        if (match) assert.equal(match.start, value);
    }
    assert.equal(findMatch(index, parseIP('255.255.255.255')), null);
});