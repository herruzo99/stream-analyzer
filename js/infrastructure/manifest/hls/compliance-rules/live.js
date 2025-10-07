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
export const liveRules = [
    {
        id: 'HLS-MEDIA-2',
        text: 'Live Media Playlist must not contain EXT-X-ENDLIST',
        isoRef: 'HLS 2nd Ed: 6.2.1',
        version: 1,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Live Stream Properties',
        check: (hls, { isLive }) => {
            if (!isLive) return 'skip';
            return !hls.tags.some((t) => t.name === 'EXT-X-ENDLIST');
        },
        passDetails: 'OK',
        failDetails:
            'A live Media Playlist MUST NOT contain the EXT-X-ENDLIST tag.',
    },
    {
        id: 'HLS-MEDIA-3',
        text: 'Live Media Playlist should have EXT-X-MEDIA-SEQUENCE',
        isoRef: 'HLS 2nd Ed: 6.2.2',
        version: 1,
        severity: 'warn',
        scope: 'MediaPlaylist',
        category: 'Live Stream Properties',
        check: (hls, { isLive }) => {
            if (!isLive) return 'skip';
            // It's only strictly required if segments are to be removed. We warn because this is common for live.
            return hls.tags.some((t) => t.name === 'EXT-X-MEDIA-SEQUENCE');
        },
        passDetails: 'OK',
        failDetails:
            'For live playlists where segments are removed, EXT-X-MEDIA-SEQUENCE is essential for clients to reload correctly.',
    },
];
