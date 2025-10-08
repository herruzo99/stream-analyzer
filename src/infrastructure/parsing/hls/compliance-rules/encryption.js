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
export const encryptionRules = [
    {
        id: 'HLS-KEY-1',
        text: 'EXT-X-KEY must have a URI if method is not NONE',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
        version: 1,
        severity: 'fail',
        scope: 'Key',
        category: 'Encryption',
        check: (key) =>
            key.METHOD === 'NONE' || (key.METHOD !== 'NONE' && key.URI),
        passDetails: 'OK',
        failDetails:
            'The URI attribute is REQUIRED for EXT-X-KEY unless the METHOD is NONE.',
    },
];
