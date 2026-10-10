import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { XMLParser } from 'fast-xml-parser';
import {
    highlightDash,
    highlightHls,
} from '../../src/ui/shared/syntax-highlighter.js';

const LOCAL_HEUX_SPECIFIER = 'file:vendor/heux-framework-3.0.0-local.tgz';
const LOCAL_HEUX_LOCK_PATH = 'node_modules/@heux/framework';

test('resolved lockfile packages use registry or approved artifact integrity', async () => {
    const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));

    for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
        if (!packagePath || !metadata.resolved) continue;
        if (packagePath === LOCAL_HEUX_LOCK_PATH) {
            assert.equal(metadata.resolved, LOCAL_HEUX_SPECIFIER);
            assert.ok(metadata.integrity, `${packagePath} has no integrity`);
            continue;
        }
        assert.match(
            metadata.resolved,
            /^https:\/\/registry\.npmjs\.org\//,
            `${packagePath} has a non-registry resolved URL`
        );
        assert.ok(metadata.integrity, `${packagePath} has no integrity`);
    }
});

test('source CSP retains minimum fail-closed directives and nonce markers', async () => {
    const html = await readFile('index.html', 'utf8');

    assert.match(html, /default-src 'self'/);
    assert.match(html, /object-src 'none'/);
    assert.match(html, /base-uri 'self'/);
    assert.match(html, /form-action 'self'/);
    assert.match(html, /script-src[^;]*'nonce-__CSP_NONCE__'/);
    assert.doesNotMatch(html, /script-src[^;]*'unsafe-inline'/);
});

test('hostile XML cannot expand entities and parser boundaries are explicit', async () => {
    const parser = new XMLParser({
        processEntities: false,
        maxNestedTags: 2,
        strictReservedNames: true,
    });
    const hostile = '<!DOCTYPE root [<!ENTITY x "expanded">]><root>&x;</root>';
    assert.equal(parser.parse(hostile).root, '&x;');
    assert.throws(
        () => parser.parse('<a><b><c><d><e/></d></c></b></a>'),
        /Maximum nested tags exceeded/
    );

    const parserFiles = [
        'src/infrastructure/parsing/dash/parser.js',
        'src/infrastructure/parsing/ttml/parser.js',
        'src/infrastructure/parsing/ads/vmap-parser.js',
        'src/infrastructure/parsing/ads/scte224-parser.js',
        'src/infrastructure/parsing/ads/vast-parser.js',
    ];
    for (const path of parserFiles) {
        const source = await readFile(path, 'utf8');
        assert.match(
            source,
            /processEntities:\s*false/,
            `${path} entity policy`
        );
        assert.match(source, /maxNestedTags:\s*50/, `${path} depth policy`);
        assert.match(
            source,
            /strictReservedNames:\s*true/,
            `${path} reserved-name policy`
        );
    }
});

test('untrusted caption text uses DOM text sinks', async () => {
    // NOTE: src/ui/components/tooltip.js deliberately renders innerHTML for
    // self-generated rich tooltips (base64 HTML + iso references produced by
    // our own badge renderers, never remote input) and is exempt here.
    const safeSinkFiles = [
        'src/features/segmentAnalysis/ui/vtt-analysis.js',
        'src/features/segmentAnalysis/ui/ttml-analysis.js',
    ];
    for (const path of safeSinkFiles) {
        const source = await readFile(path, 'utf8');
        assert.doesNotMatch(source, /innerHTML\s*=/, `${path} raw HTML sink`);
        assert.doesNotMatch(
            source,
            /unsafeHTML/,
            `${path} unsafe HTML directive`
        );
    }
});

test('syntax highlighters escape hostile source before fixed markup', () => {
    const hostile = '<img src=x onerror=alert(1)>&"';
    for (const highlighted of [highlightDash(hostile), highlightHls(hostile)]) {
        assert.match(highlighted, /&lt;/);
        assert.doesNotMatch(highlighted, /<img[\s>]/);
        assert.doesNotMatch(highlighted, /<span[^>]*onerror/);
    }
});
