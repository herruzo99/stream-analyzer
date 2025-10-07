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
export const segmentRules = [
    {
        id: 'HLS-SEGMENT-2',
        text: 'EXTINF duration must be <= target duration (integer rounded)',
        isoRef: 'HLS 2nd Ed: 4.4.3.1',
        version: 1,
        severity: 'fail',
        scope: 'Segment',
        category: 'Segment & Timing Info',
        check: (segment, { targetDuration }) => {
            if (targetDuration === null) return 'skip';
            return Math.round(segment.duration) <= targetDuration;
        },
        passDetails: 'OK',
        failDetails: (segment, { targetDuration }) =>
            `Segment duration (${segment.duration}s) rounded to the nearest integer (${Math.round(segment.duration)}s) MUST be <= the target duration (${targetDuration}s).`,
    },
    {
        id: 'HLS-PART-1',
        text: 'EXT-X-PART must have URI and DURATION attributes',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
        version: 9,
        severity: 'fail',
        scope: 'Segment',
        category: 'Low-Latency HLS',
        check: (segment) => {
            if (!segment.parts || segment.parts.length === 0) return 'skip';
            return segment.parts.every(
                (p) => p.URI !== undefined && p.DURATION !== undefined
            );
        },
        passDetails: 'OK',
        failDetails: 'Each EXT-X-PART tag must have URI and DURATION attributes.',
    },
];