import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { XMLValidator } from 'fast-xml-parser';

const corpusRoot = path.resolve('tests/fixtures');
const inventory = JSON.parse(
    await readFile(path.join(corpusRoot, 'manifest.json'), 'utf8')
);

async function listFiles(directory, prefix = '') {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const relative = path.posix.join(prefix, entry.name);
        if (entry.isDirectory()) {
            files.push(
                ...(await listFiles(path.join(directory, entry.name), relative))
            );
        } else {
            files.push(relative);
        }
    }

    return files.sort();
}

test('fixture inventory is complete, unique, and hash-locked', async () => {
    assert.equal(inventory.schemaVersion, 1);
    assert.equal(inventory.license, 'CC0-1.0');

    const ids = inventory.files.map((fixture) => fixture.id);
    assert.equal(new Set(ids).size, ids.length, 'fixture IDs must be unique');

    const paths = inventory.files.map((fixture) => fixture.path).sort();
    const actual = (await listFiles(corpusRoot)).filter(
        (file) => !['README.md', 'manifest.json'].includes(file)
    );
    assert.deepEqual(paths, actual, 'every fixture file must be inventoried');

    for (const fixture of inventory.files) {
        const bytes = await readFile(path.join(corpusRoot, fixture.path));
        const digest = createHash('sha256').update(bytes).digest('hex');
        assert.equal(digest, fixture.sha256, `${fixture.id} hash drifted`);
    }
});

test('fixture corpus contains no credential-shaped or private URL data', async () => {
    const forbidden = [
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
        /\bAKIA[0-9A-Z]{16}\b/,
        /\b(?:token|password|secret|api[_-]?key)\s*[:=]\s*["'][^"']+/i,
        /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/i,
    ];

    for (const fixture of inventory.files) {
        const text = await readFile(
            path.join(corpusRoot, fixture.path),
            'utf8'
        );
        for (const pattern of forbidden) {
            assert.doesNotMatch(text, pattern, `${fixture.id} sensitive data`);
        }
    }
});

test('valid and invalid manifest fixtures have deliberate structure', async () => {
    const master = await readFile(
        path.join(corpusRoot, 'hls/master-basic.m3u8'),
        'utf8'
    );
    const media = await readFile(
        path.join(corpusRoot, 'hls/media-basic.m3u8'),
        'utf8'
    );
    const truncated = await readFile(
        path.join(corpusRoot, 'invalid/truncated-hls.m3u8'),
        'utf8'
    );
    const dash = await readFile(
        path.join(corpusRoot, 'dash/vod-basic.mpd'),
        'utf8'
    );
    const malformedDash = await readFile(
        path.join(corpusRoot, 'invalid/malformed-dash.mpd'),
        'utf8'
    );

    assert.match(master, /^#EXTM3U/);
    assert.equal((master.match(/#EXT-X-STREAM-INF:/g) ?? []).length, 2);
    assert.match(media, /#EXT-X-ENDLIST/);
    assert.doesNotMatch(truncated, /#EXT-X-ENDLIST/);
    assert.equal(XMLValidator.validate(dash), true);
    assert.notEqual(XMLValidator.validate(malformedDash), true);
});

test('segment and network fixtures cover success and failure boundaries', async () => {
    const validHex = (
        await readFile(path.join(corpusRoot, 'segments/minimal-init.hex'), 'utf8')
    ).trim();
    const truncatedHex = (
        await readFile(
            path.join(corpusRoot, 'segments/truncated-box.hex'),
            'utf8'
        )
    ).trim();
    const network = JSON.parse(
        await readFile(
            path.join(corpusRoot, 'network/scenarios.json'),
            'utf8'
        )
    );

    assert.equal(validHex.length % 2, 0);
    assert.equal(Buffer.from(validHex, 'hex').length, 24);
    assert.ok(Buffer.from(truncatedHex, 'hex').length < 24);
    assert.deepEqual(
        network.scenarios.map((scenario) => scenario.expected),
        ['complete', 'http-error', 'truncated', 'timeout', 'cancelled']
    );
    assert.equal(new URL(network.origin).hostname, 'fixture.invalid');
});

test('generated fixture recipes are stable and bounded', () => {
    const large = ['#EXTM3U'];
    for (let index = 0; index < 10_000; index += 1) {
        large.push('#EXTINF:6.000,', `segment-${index}.m4s`);
    }
    const generated = `${large.join('\n')}\n`;

    assert.equal((generated.match(/#EXTINF:/g) ?? []).length, 10_000);
    assert.ok(generated.length < 500_000);
    assert.deepEqual(
        inventory.generated.map((fixture) => fixture.id),
        ['hls-large-10000', 'timing-boundaries']
    );
});
