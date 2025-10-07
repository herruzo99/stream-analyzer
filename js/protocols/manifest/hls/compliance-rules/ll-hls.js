/**
 * @typedef {'error' | 'warn' | 'info' | 'pass' | 'fail'} CheckStatus
 * @typedef {'Manifest Structure' | 'Live Stream Properties' | 'Segment & Timing Info' | 'Profile Conformance' | 'General Best Practices' | 'HLS Structure' | 'Encryption' | 'Interoperability' | 'Low-Latency HLS' | 'Variables & Steering'} RuleCategory
 * @typedef {'Playlist' | 'MediaPlaylist' | 'MasterPlaylist' | 'Segment' | 'Key' | 'MediaGroup' | 'Variant' | 'IframeVariant'} HlsRuleScope
 */

/**
 * @typedef {object} HlsRule
 * @property {string} id - A unique identifier for the rule.
 * @property {string} text - The human-readable title of the check.
 * @property {string} isoRef - The reference to the standard clause.
 * @property {number} version - The HLS protocol version where this rule was introduced.
 * @property {CheckStatus} severity - The status to assign if the check fails ('fail' or 'warn').
 * @property {HlsRuleScope} scope - The HLS manifest level this rule applies to.
 * @property {(element: object, context: object) => boolean | 'skip'} check - The function that performs the validation.
 * @property {string} passDetails - Details for a passing check.
 * @property {string | ((element: object, context: object) => string)} failDetails - Details for a failing or warning check.
 * @property {RuleCategory} category
 */

/** @type {HlsRule[]} */
export const llHlsRules = [
    {
        id: 'LL-HLS-1',
        text: 'LL-HLS requires EXT-X-PART-INF if PARTs are present',
        isoRef: 'HLS 2nd Ed: 4.4.3.7',
        version: 9,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Low-Latency HLS',
        check: (hls) => {
            const hasParts = hls.segments.some(
                (s) => s.parts && s.parts.length > 0
            );
            if (!hasParts && !hls.preloadHints.some((h) => h.TYPE === 'PART'))
                return 'skip';
            return !!hls.partInf;
        },
        passDetails: 'OK, EXT-X-PART-INF is present as required.',
        failDetails:
            'The playlist contains PARTs or PART hints but is missing the required EXT-X-PART-INF tag.',
    },
    {
        id: 'LL-HLS-2',
        text: 'LL-HLS requires EXT-X-VERSION of 9 or greater',
        isoRef: 'HLS 2nd Ed: 4.4.3.7',
        version: 9,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Low-Latency HLS',
        check: (hls) => {
            if (!hls.partInf) return 'skip';
            return hls.version >= 9;
        },
        passDetails: 'OK, EXT-X-VERSION is 9 or greater.',
        failDetails:
            'Playlists containing Partial Segments (PARTs) MUST have an EXT-X-VERSION of 9 or greater.',
    },
    {
        id: 'LL-HLS-3',
        text: 'EXT-X-PART-INF must have PART-TARGET attribute',
        isoRef: 'HLS 2nd Ed: 4.4.3.7',
        version: 9,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Low-Latency HLS',
        check: (hls) => {
            if (!hls.partInf) return 'skip';
            return hls.partInf['PART-TARGET'] !== undefined;
        },
        passDetails: 'OK, PART-TARGET is present.',
        failDetails: 'The EXT-X-PART-INF tag MUST have a PART-TARGET attribute.',
    },
    {
        id: 'LL-HLS-4',
        text: 'LL-HLS requires a PART-HOLD-BACK attribute',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
        version: 9,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Low-Latency HLS',
        check: (hls) => {
            if (!hls.partInf) return 'skip';
            return (
                hls.serverControl &&
                hls.serverControl['PART-HOLD-BACK'] !== undefined
            );
        },
        passDetails: 'OK, PART-HOLD-BACK is specified.',
        failDetails:
            'Playlists containing PARTs must specify a PART-HOLD-BACK attribute in the EXT-X-SERVER-CONTROL tag.',
    },
    {
        id: 'LL-HLS-5',
        text: 'LL-HLS PART-HOLD-BACK must be >= 2x PART-TARGET',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
        version: 9,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Low-Latency HLS',
        check: (hls) => {
            if (
                !hls.partInf?.['PART-TARGET'] ||
                !hls.serverControl?.['PART-HOLD-BACK']
            )
                return 'skip';
            const partHoldBack = hls.serverControl['PART-HOLD-BACK'];
            const partTarget = hls.partInf['PART-TARGET'];
            return partHoldBack >= 2 * partTarget;
        },
        passDetails: 'OK, PART-HOLD-BACK is a valid duration.',
        failDetails: (hls) =>
            `PART-HOLD-BACK (${hls.serverControl['PART-HOLD-BACK']}s) must be at least twice the PART-TARGET (${hls.partInf['PART-TARGET']}s).`,
    },
    {
        id: 'LL-HLS-6',
        text: 'LL-HLS profile requires EXT-X-PROGRAM-DATE-TIME tags',
        isoRef: 'HLS 2nd Ed: Appendix B.1',
        version: 9,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Low-Latency HLS',
        check: (hls) => {
            if (!hls.partInf) return 'skip';
            return hls.segments.some((s) => s.dateTime);
        },
        passDetails: 'OK, at least one PDT tag is present.',
        failDetails:
            'The Low-Latency HLS profile requires EXT-X-PROGRAM-DATE-TIME tags for precise synchronization.',
    },
    {
        id: 'LL-HLS-7',
        text: 'LL-HLS profile requires EXT-X-PRELOAD-HINT for the next Partial Segment',
        isoRef: 'HLS 2nd Ed: Appendix B.1',
        version: 9,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Low-Latency HLS',
        check: (hls) => {
            if (!hls.partInf || !hls.isLive) return 'skip';
            return hls.preloadHints.some((t) => t.TYPE === 'PART');
        },
        passDetails: 'OK, a preload hint for a partial segment was found.',
        failDetails:
            'The Low-Latency HLS profile requires a preload hint for the next expected partial segment to reduce latency.',
    },
    {
        id: 'LL-HLS-8',
        text: 'LL-HLS profile requires EXT-X-RENDITION-REPORT tags in media playlists',
        isoRef: 'HLS 2nd Ed: Appendix B.1',
        version: 9,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Low-Latency HLS',
        check: (hls) => {
            if (!hls.partInf || !hls.isLive) return 'skip';
            return hls.renditionReports.length > 0;
        },
        passDetails: 'OK, rendition reports are present.',
        failDetails:
            'The Low-Latency HLS profile requires rendition reports in each media playlist to avoid tune-in delays.',
    },
];