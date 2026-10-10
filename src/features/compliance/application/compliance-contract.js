import { calculateComplianceScore } from '../domain/compliance-scoring.js';

export const COMPLIANCE_CONTRACT_VERSION = 'sa-compliance-report/1';
export const COMPLIANCE_RULESET_VERSION = 'sa-compliance-rules/1';
export const COMPLIANCE_LIMITS = Object.freeze({
    findings: 200,
    evidenceLines: 9,
    label: 160,
    detail: 480,
    path: 240,
});

const SECRET = /((?:token|key|secret|signature|authorization)=)[^&\s]+/gi;
const URL_LIKE = /https?:\/\/[^\s<>'"]+/gi;

const stripControlCharacters = (value) =>
    Array.from(String(value ?? ''))
        .filter((character) => {
            const code = character.codePointAt(0) ?? 0;
            return character === '\n' || character === '\t' || code >= 32;
        })
        .join('');

/** @param {unknown} value @param {number} [limit] */
const safeText = (value, limit = COMPLIANCE_LIMITS.label) =>
    stripControlCharacters(value)
        .replace(SECRET, '$1[redacted]')
        .replace(URL_LIKE, '[redacted-url]')
        .slice(0, limit);

function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

const stableId = (prefix, value) => `${prefix}-${stableHash(value)}`;
const record = (value) =>
    value && typeof value === 'object'
        ? /** @type {Record<string, unknown>} */ (value)
        : {};

const severity = (status) => {
    if (status === 'fail') return 'error';
    if (status === 'warn') return 'warning';
    if (status === 'info') return 'info';
    return 'pass';
};

/** @param {string} raw @param {Record<string, unknown>} location */
function projectEvidence(raw, location) {
    const lines = safeText(raw, 100_000).split('\n');
    const start = Number(location.startLine);
    const end = Number(location.endLine);
    if (Number.isFinite(start) && start > 0) {
        const first = Math.max(0, start - 2);
        const last = Math.min(
            lines.length,
            Math.max(start, Number.isFinite(end) ? end : start) + 1
        );
        return Object.freeze({
            kind: 'lines',
            label: `Lines ${start}–${Number.isFinite(end) ? end : start}`,
            lines: Object.freeze(
                lines
                    .slice(first, last)
                    .slice(0, COMPLIANCE_LIMITS.evidenceLines)
            ),
        });
    }
    const path = safeText(location.path, COMPLIANCE_LIMITS.path);
    return Object.freeze({
        kind: path ? 'path' : 'unavailable',
        label: path || 'Source evidence unavailable',
        lines: Object.freeze([]),
    });
}

/**
 * Builds the bounded, immutable application-owned Compliance projection.
 * @param {import('@/types').Stream | null | undefined} stream
 * @param {number} standardVersion
 */
export function createComplianceReport(stream, standardVersion) {
    if (!stream?.manifest) {
        return Object.freeze({
            contractVersion: COMPLIANCE_CONTRACT_VERSION,
            state: 'unavailable',
            reason: 'Analyze a stream to create a compliance report.',
            findings: Object.freeze([]),
        });
    }

    const update =
        stream.manifestUpdates?.find(
            (candidate) => candidate.id === stream.activeManifestUpdateId
        ) ?? stream.manifestUpdates?.[0];
    const updateRecord = record(update);
    const hasResults = Object.hasOwn(updateRecord, 'complianceResults');
    const rawResults = Array.isArray(updateRecord.complianceResults)
        ? updateRecord.complianceResults
        : [];
    const rawManifest = safeText(
        updateRecord.rawManifest ?? stream.rawManifest,
        100_000
    );
    const protocol = safeText(stream.protocol, 16).toUpperCase();
    const standard =
        stream.protocol === 'hls'
            ? `HLS v${Number.isFinite(standardVersion) ? standardVersion : 13}`
            : 'MPEG-DASH';
    const inputHash = stableHash(rawManifest);
    const updateKey = safeText(updateRecord.id ?? 'missing-update', 96);
    const findings = Object.freeze(
        rawResults.slice(0, COMPLIANCE_LIMITS.findings).map((item, index) => {
            const finding = record(item);
            const ruleId = safeText(finding.id ?? `rule-${index + 1}`, 96);
            const location = record(finding.location);
            const evidence = projectEvidence(rawManifest, location);
            return Object.freeze({
                id: stableId(
                    'sa-compliance-finding',
                    `${stream.id}:${updateKey}:${ruleId}:${index}`
                ),
                ruleId,
                ruleVersion: `${COMPLIANCE_RULESET_VERSION}:${ruleId}`,
                title: safeText(finding.text || ruleId),
                status: safeText(finding.status || 'info', 16),
                severity: severity(finding.status),
                details: safeText(finding.details, COMPLIANCE_LIMITS.detail),
                category: safeText(finding.category || 'General'),
                standardReference: safeText(finding.isoRef || 'N/A', 120),
                evidenceId: stableId(
                    'sa-compliance-evidence',
                    `${inputHash}:${ruleId}:${JSON.stringify(location)}`
                ),
                evidence,
            });
        })
    );
    const score = calculateComplianceScore(
        /** @type {import('@/types').ComplianceResult[]} */ (
            rawResults.slice(0, COMPLIANCE_LIMITS.findings)
        )
    );
    const state = hasResults ? 'complete' : 'partial';
    const identitySeed = [
        COMPLIANCE_CONTRACT_VERSION,
        COMPLIANCE_RULESET_VERSION,
        stream.id,
        updateKey,
        protocol,
        standard,
        inputHash,
        findings
            .map((finding) => `${finding.ruleId}:${finding.status}`)
            .join('|'),
    ].join(':');

    return Object.freeze({
        contractVersion: COMPLIANCE_CONTRACT_VERSION,
        rulesetVersion: COMPLIANCE_RULESET_VERSION,
        runId: stableId('sa-compliance-run', identitySeed),
        inputHash: stableId('sa-compliance-input', inputHash),
        deterministic: true,
        environmentClass: 'browser-local',
        state,
        reason: hasResults
            ? ''
            : 'The selected manifest update has no compliance result set.',
        streamId: stream.id,
        streamLabel: safeText(stream.name || 'Unnamed stream'),
        protocol,
        standard,
        standardVersion:
            stream.protocol === 'hls' ? Number(standardVersion) || 13 : null,
        updateId: stableId('sa-compliance-update', updateKey),
        updateOrdinal:
            Math.max(0, stream.manifestUpdates?.indexOf(update) ?? 0) + 1,
        updateCount: Math.max(1, stream.manifestUpdates?.length ?? 0),
        truncated: rawResults.length > COMPLIANCE_LIMITS.findings,
        score: Object.freeze({
            value: score.totalScore,
            label: score.label,
            errors: score.summary.errors,
            warnings: score.summary.warnings,
            info: score.summary.info,
        }),
        findings,
    });
}
