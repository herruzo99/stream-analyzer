import { redactNetworkUrl } from '@/features/networkAnalysis/application/network-contract.js';

export const PARSER_COVERAGE_VERSION = 'sa-parser-coverage/1';
export const PARSER_FINDING_VERSION = 'sa-parser-finding/1';
export const PARSER_SOURCE_VERSION = 'sa-parser-source/1';
export const PARSER_COVERAGE_LIMITS = Object.freeze({
    findings: 256,
    name: 160,
    details: 800,
    path: 240,
    manifestCharacters: 24_000,
    manifestLines: 500,
    copyCharacters: 32_000,
    manifestNodes: 20_000,
});

const SECRET_TEXT =
    /\b(authorization|bearer|credential|password|secret|token)\b\s*[:=]?\s*[^\s,;]+/gi;
const URL_TEXT = /https?:\/\/[^\s"'<>]+/gi;

function hashText(value) {
    let hash = 2166136261;
    for (const character of value) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

const stableId = (prefix, value) => `${prefix}-${hashText(String(value))}`;

/** @param {number} limit */
export function redactParserCoverageText(value, limit) {
    const redacted = String(value ?? '')
        .replace(URL_TEXT, (url) => redactNetworkUrl(url))
        .replace(SECRET_TEXT, '$1=[redacted]');
    return redacted.slice(0, limit);
}

function countManifestNodes(root) {
    if (!root || typeof root !== 'object')
        return Object.freeze({ count: 0, truncated: false });
    const stack = [root];
    let count = 0;
    while (stack.length && count < PARSER_COVERAGE_LIMITS.manifestNodes) {
        const node = stack.pop();
        if (!node || typeof node !== 'object') continue;
        count += 1;
        const attributes = node[':@'];
        if (attributes && typeof attributes === 'object')
            count += Object.keys(attributes).length;
        for (const [key, value] of Object.entries(node)) {
            if (key === ':@' || key === '#text') continue;
            const children = Array.isArray(value) ? value : [value];
            for (let index = children.length - 1; index >= 0; index -= 1)
                stack.push(children[index]);
        }
    }
    return Object.freeze({
        count,
        truncated: stack.length > 0,
    });
}

const unavailable = (reason) =>
    Object.freeze({
        contractVersion: PARSER_COVERAGE_VERSION,
        findingVersion: PARSER_FINDING_VERSION,
        sourceVersion: PARSER_SOURCE_VERSION,
        state: 'unavailable',
        reason,
        indexId: '',
        sourceId: '',
        deterministic: true,
        protocol: '',
        coveragePercentage: 0,
        unparsedCount: 0,
        driftCount: 0,
        totalFindingCount: 0,
        visibleFindingCount: 0,
        truncated: false,
        findings: Object.freeze([]),
        manifestPreview: '',
        copyText: '',
    });

const error = (reason) =>
    Object.freeze({
        contractVersion: PARSER_COVERAGE_VERSION,
        findingVersion: PARSER_FINDING_VERSION,
        sourceVersion: PARSER_SOURCE_VERSION,
        state: 'error',
        reason,
        indexId: '',
        sourceId: '',
        deterministic: true,
        protocol: '',
        coveragePercentage: 0,
        unparsedCount: 0,
        driftCount: 0,
        totalFindingCount: 0,
        visibleFindingCount: 0,
        truncated: false,
        findings: Object.freeze([]),
        manifestPreview: '',
        copyText: '',
    });

/**
 * Builds the bounded, immutable, application-owned debug parser projection.
 * @param {import('@/types').Stream | null | undefined} stream
 */
export function createParserCoverageIndex(stream) {
    if (!stream)
        return unavailable('Analyze a stream to inspect parser coverage.');
    if (!stream.manifest)
        return unavailable('The selected stream has no parsed manifest.');
    if (!['dash', 'hls'].includes(stream.protocol))
        return error('Parser coverage supports DASH and HLS streams only.');
    if (!Array.isArray(stream.coverageReport))
        return error('The parser coverage report is unavailable.');

    const sourceSeed = [
        stream.id ?? 'stream',
        stream.activeManifestUpdateId ?? 'initial',
        stream.protocol,
        PARSER_SOURCE_VERSION,
    ].join(':');
    const sourceId = stableId('sa-parser-source', sourceSeed);
    let malformed = false;
    let truncated =
        stream.coverageReport.length > PARSER_COVERAGE_LIMITS.findings;

    const findings = stream.coverageReport
        .slice(0, PARSER_COVERAGE_LIMITS.findings)
        .flatMap((finding, index) => {
            if (!finding || typeof finding !== 'object') {
                malformed = true;
                return [];
            }
            const status =
                finding.status === 'unparsed' || finding.status === 'drift'
                    ? finding.status
                    : 'unparsed';
            if (status !== finding.status) malformed = true;
            const name = redactParserCoverageText(
                finding.name,
                PARSER_COVERAGE_LIMITS.name
            );
            const details = redactParserCoverageText(
                finding.details,
                PARSER_COVERAGE_LIMITS.details
            );
            const path = redactParserCoverageText(
                finding.pathOrLine,
                PARSER_COVERAGE_LIMITS.path
            );
            if (
                name.length < String(finding.name ?? '').length ||
                details.length < String(finding.details ?? '').length ||
                path.length < String(finding.pathOrLine ?? '').length
            )
                truncated = true;
            const type = redactParserCoverageText(
                finding.type ?? 'finding',
                48
            );
            return [
                Object.freeze({
                    contractVersion: PARSER_FINDING_VERSION,
                    findingId: stableId(
                        'sa-parser-finding',
                        `${sourceId}:${index}:${status}:${type}:${name}:${path}`
                    ),
                    status,
                    type,
                    name,
                    details,
                    path,
                    lineNumber: Number.isFinite(Number(finding.lineNumber))
                        ? Math.max(0, Number(finding.lineNumber))
                        : null,
                }),
            ];
        });

    const rawManifest = String(stream.rawManifest ?? '');
    const safeManifest = redactParserCoverageText(
        rawManifest,
        PARSER_COVERAGE_LIMITS.manifestCharacters
    );
    const manifestLines = safeManifest
        .split('\n')
        .slice(0, PARSER_COVERAGE_LIMITS.manifestLines);
    if (
        safeManifest.length < rawManifest.length ||
        safeManifest.split('\n').length > PARSER_COVERAGE_LIMITS.manifestLines
    )
        truncated = true;

    const nodeObservation =
        stream.protocol === 'dash'
            ? countManifestNodes(stream.manifest.serializedManifest)
            : Object.freeze({ count: 0, truncated: false });
    if (nodeObservation.truncated) truncated = true;
    const unparsedCount = stream.coverageReport.filter(
        (finding) => finding?.status === 'unparsed'
    ).length;
    const driftCount = stream.coverageReport.filter(
        (finding) => finding?.status === 'drift'
    ).length;
    const coveragePercentage =
        stream.protocol === 'dash' && nodeObservation.count > 0
            ? Math.max(
                  0,
                  Math.min(
                      100,
                      (1 - unparsedCount / nodeObservation.count) * 100
                  )
              )
            : 100;

    const state =
        malformed || truncated
            ? 'partial'
            : findings.length === 0
              ? 'empty'
              : 'complete';
    const reason =
        state === 'partial'
            ? 'Some parser evidence was malformed, redacted or truncated.'
            : state === 'empty'
              ? 'No parser coverage findings were reported.'
              : '';
    const findingSeed = findings
        .map(({ findingId, status }) => `${findingId}:${status}`)
        .join('|');
    const indexId = stableId(
        'sa-parser-coverage',
        `${sourceId}:${findingSeed}:${state}:${PARSER_COVERAGE_VERSION}`
    );
    const reportText = findings
        .map(
            ({ status, type, name, path, details }) =>
                `[${status.toUpperCase()}] ${type}: ${name}\nLocation: ${path}\nDetails: ${details}`
        )
        .join('\n\n---\n\n');
    const copyText = redactParserCoverageText(
        `Parser coverage ${indexId}\nState: ${state}\nSource: ${sourceId}\n\n--- MANIFEST PREVIEW ---\n${manifestLines.join(
            '\n'
        )}\n\n--- FINDINGS (${findings.length}) ---\n${reportText}`,
        PARSER_COVERAGE_LIMITS.copyCharacters
    );
    if (copyText.length >= PARSER_COVERAGE_LIMITS.copyCharacters)
        truncated = true;

    return Object.freeze({
        contractVersion: PARSER_COVERAGE_VERSION,
        findingVersion: PARSER_FINDING_VERSION,
        sourceVersion: PARSER_SOURCE_VERSION,
        indexId,
        sourceId,
        deterministic: true,
        state: truncated && state !== 'partial' ? 'partial' : state,
        reason:
            truncated && state !== 'partial'
                ? 'Some parser evidence was redacted or truncated.'
                : reason,
        protocol: stream.protocol,
        coveragePercentage,
        unparsedCount,
        driftCount,
        totalFindingCount: stream.coverageReport.length,
        visibleFindingCount: findings.length,
        truncated,
        findings: Object.freeze([...findings]),
        manifestPreview: manifestLines.join('\n'),
        copyText,
    });
}
