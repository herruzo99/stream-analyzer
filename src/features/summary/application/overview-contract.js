const REQUIRED_SUMMARY_SECTIONS = Object.freeze([
    'general',
    'content',
    'security',
    'videoTracks',
    'audioTracks',
    'textTracks',
]);

function missingSummarySections(summary) {
    return REQUIRED_SUMMARY_SECTIONS.filter((section) => {
        const value = summary?.[section];
        return (
            value == null ||
            (section.endsWith('Tracks') && !Array.isArray(value))
        );
    });
}

export function safeSourceLabel(value) {
    if (!value) return 'Source URL unavailable';
    try {
        const url = new URL(value);
        url.username = '';
        url.password = '';
        for (const key of [...url.searchParams.keys()]) {
            if (/auth|token|key|secret|signature|credential/i.test(key)) {
                url.searchParams.delete(key);
            }
        }
        return url.toString();
    } catch {
        return 'Local or inline source';
    }
}

export function createOverviewReportState({
    streams,
    activeStreamId,
    analysisStatus,
}) {
    if (analysisStatus === 'loading') {
        return Object.freeze({ kind: 'loading', stream: null });
    }
    const stream = streams.find((candidate) => candidate.id === activeStreamId);
    if (!stream) return Object.freeze({ kind: 'empty', stream: null });
    if (!stream.manifest?.summary) {
        return Object.freeze({ kind: 'error', stream });
    }
    const missing = missingSummarySections(stream.manifest.summary);
    if (missing.length > 0) {
        return Object.freeze({ kind: 'partial', stream, missing });
    }
    return Object.freeze({ kind: 'ready', stream });
}

export function getOverviewEvidenceLinks(stream) {
    const links = [];
    if (stream?.manifest) {
        links.push({
            route: 'interactive-manifest',
            label: 'Manifest evidence',
        });
    }
    const hasComplianceEvidence = stream?.manifestUpdates?.some(
        (update) =>
            Array.isArray(update.complianceResults) &&
            update.complianceResults.length > 0
    );
    if (hasComplianceEvidence) {
        links.push({ route: 'compliance', label: 'Compliance evidence' });
    }
    return Object.freeze(links);
}
