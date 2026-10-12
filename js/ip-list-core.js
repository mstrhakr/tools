(function () {
    'use strict';

    const MAX_TEXT_LENGTH = 5 * 1024 * 1024;
    const MAX_ENTRIES = 100000;

    function requireText(text) {
        if (typeof text !== 'string') throw new Error('Input must be a string.');
        return text.trim();
    }

    function ipv4Value(text) {
        const octets = text.split('.');
        if (octets.length !== 4) throw new Error('IPv4 must contain four decimal octets.');
        let value = 0n;
        for (const octet of octets) {
            if (!/^(0|[1-9][0-9]{0,2})$/.test(octet) || Number(octet) > 255) {
                throw new Error('IPv4 octets must be 0–255, without leading zeroes.');
            }
            value = (value << 8n) | BigInt(octet);
        }
        return value;
    }

    function parseIP(text) {
        text = requireText(text);
        if (!text) throw new Error('IP address is empty.');
        if (/[\s%\[\]/-]/.test(text)) {
            throw new Error('Expected a bare IP address: no spaces, scopes, brackets, CIDRs or ranges.');
        }
        if (!text.includes(':')) return { family: 4, value: ipv4Value(text) };

        if (text.includes('.')) {
            const colon = text.lastIndexOf(':');
            const tail = text.slice(colon + 1);
            if (!tail.includes('.') || text.slice(0, colon).includes('.')) {
                throw new Error('Embedded IPv4 must appear only at the final IPv6 position.');
            }
            const dotted = ipv4Value(tail);
            text = text.slice(0, colon + 1) + (dotted >> 16n).toString(16) + ':' +
                (dotted & 65535n).toString(16);
        }

        const halves = text.split('::');
        if (halves.length > 2) throw new Error('IPv6 may contain only one :: compression.');
        const left = halves[0] ? halves[0].split(':') : [];
        const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
        const groups = left.concat(right);
        if (groups.some(group => !/^[0-9a-fA-F]{1,4}$/.test(group))) {
            throw new Error('IPv6 groups must contain one to four hexadecimal digits.');
        }
        if (halves.length === 1 ? groups.length !== 8 : groups.length >= 8) {
            throw new Error('IPv6 requires eight groups; :: must replace at least one group.');
        }
        const expanded = halves.length === 2
            ? left.concat(Array(8 - groups.length).fill('0'), right) : left;
        let value = 0n;
        for (const group of expanded) value = (value << 16n) | BigInt('0x' + group);
        return { family: 6, value };
    }

    function formatIP(family, value) {
        if (family === 4) {
            return [24n, 16n, 8n, 0n].map(shift => ((value >> shift) & 255n).toString()).join('.');
        }
        const groups = [];
        for (let shift = 112n; shift >= 0n; shift -= 16n) {
            groups.push(((value >> shift) & 65535n).toString(16));
        }
        let bestStart = -1;
        let bestLength = 1;
        for (let i = 0; i < 8;) {
            if (groups[i] !== '0') { i++; continue; }
            const start = i;
            while (i < 8 && groups[i] === '0') i++;
            if (i - start > bestLength) { bestStart = start; bestLength = i - start; }
        }
        if (bestStart < 0) return groups.join(':');
        return groups.slice(0, bestStart).join(':') + '::' +
            groups.slice(bestStart + bestLength).join(':');
    }

    function parseReference(text) {
        const entry = requireText(text);
        if (entry.includes('/')) {
            const parts = entry.split('/');
            if (parts.length !== 2 || !/^(0|[1-9][0-9]*)$/.test(parts[1])) {
                throw new Error('CIDR prefix must be a plain decimal integer without leading zeroes.');
            }
            const ip = parseIP(parts[0]);
            const bits = ip.family === 4 ? 32 : 128;
            const prefix = Number(parts[1]);
            if (prefix > bits) throw new Error('CIDR prefix must be between 0 and ' + bits + '.');
            const hostBits = BigInt(bits - prefix);
            const start = (ip.value >> hostBits) << hostBits;
            const end = start + (1n << hostBits) - 1n;
            return {
                family: ip.family, start, end, entry,
                normalized: start === ip.value ? null : formatIP(ip.family, start) + '/' + prefix
            };
        }
        if (entry.includes('-')) {
            const parts = entry.split('-');
            if (parts.length !== 2) throw new Error('Range must contain exactly two IP addresses.');
            const start = parseIP(parts[0]);
            const end = parseIP(parts[1]);
            if (start.family !== end.family) throw new Error('Range endpoints must use the same IP family.');
            if (start.value > end.value) throw new Error('Range start must not exceed range end.');
            return { family: start.family, start: start.value, end: end.value, entry, normalized: null };
        }
        const ip = parseIP(entry);
        return { family: ip.family, start: ip.value, end: ip.value, entry, normalized: null };
    }

    // Streaming tokens retain comma order without splitting ranges on whitespace.
    function* tokens(text) {
        if (typeof text !== 'string') throw new Error('List input must be a string.');
        if (text.length > MAX_TEXT_LENGTH) throw new Error('List exceeds the 5 MiB character limit.');
        let count = 0;
        let line = 0;
        for (const rawLine of text.split(/\r\n|\n|\r/)) {
            line++;
            for (const rawToken of rawLine.split('#', 1)[0].split(',')) {
                const input = rawToken.trim();
                if (!input) continue;
                if (++count > MAX_ENTRIES) throw new Error('List exceeds the 100000 entry limit.');
                yield { line, input };
            }
        }
    }

    function parseList(text, referenceBoolean) {
        const entries = [];
        const errors = [];
        let normalizedCount = 0;
        for (const token of tokens(text)) {
            try {
                const parsed = referenceBoolean ? parseReference(token.input) : parseIP(token.input);
                entries.push(Object.assign(parsed, token));
                if (parsed.normalized != null) normalizedCount++;
            } catch (error) {
                errors.push({ line: token.line, input: token.input, message: error.message });
            }
        }
        return { entries, errors, normalizedCount };
    }

    function buildIndex(entries) {
        const index = { 4: [], 6: [] };
        for (const family of [4, 6]) {
            const sorted = entries.filter(entry => entry.family === family).sort((a, b) =>
                a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
            let covered = -1n;
            for (const owner of sorted) {
                if (owner.end <= covered) continue;
                // Keep existing owners for overlap; attribute only the uncovered tail
                // to this original reference. Every segment lies inside its owner.
                const start = owner.start > covered ? owner.start : covered + 1n;
                index[family].push({ start, end: owner.end, owner });
                covered = owner.end;
            }
        }
        return index;
    }

    function findMatch(index, ip) {
        const ranges = index[ip.family];
        let low = 0;
        let high = ranges.length;
        while (low < high) {
            const middle = low + Math.floor((high - low) / 2);
            if (ranges[middle].start <= ip.value) low = middle + 1;
            else high = middle;
        }
        const candidate = ranges[low - 1];
        return candidate && ip.value <= candidate.end ? candidate.owner : null;
    }

    function compare(referenceText, queryText, skipInvalid = false) {
        const reference = parseList(referenceText, true);
        const blocked = reference.entries.length === 0 || (!skipInvalid && reference.errors.length > 0);
        const results = [];
        const index = blocked ? null : buildIndex(reference.entries);
        // Even blocked comparisons validate list limits; blocked results stay empty
        // so callers cannot accidentally present incomplete-reference exclusions.
        for (const token of tokens(queryText)) {
            if (blocked) continue;
            try {
                const match = findMatch(index, parseIP(token.input));
                results.push({ ip: token.input, line: token.line,
                    status: match ? 'included' : 'excluded', match });
            } catch (error) {
                results.push({ ip: token.input, line: token.line, status: 'invalid',
                    match: null, message: error.message });
            }
        }
        return { reference, results, blocked };
    }

    const api = { parseIP, parseReference, parseList, buildIndex, findMatch, compare,
        MAX_TEXT_LENGTH, MAX_ENTRIES };
    if (typeof window !== 'undefined') window.IPListCore = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
}());