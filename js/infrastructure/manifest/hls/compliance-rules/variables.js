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
export const variableRules = [
    {
        id: 'HLS-DEFINE-1',
        text: 'EXT-X-DEFINE tag must contain a NAME, IMPORT, or QUERYPARAM attribute',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
        version: 8,
        severity: 'fail',
        scope: 'Playlist',
        category: 'Variables & Steering',
        check: (hls) => {
            const defineTags = hls.tags.filter(
                (t) => t.name === 'EXT-X-DEFINE'
            );
            if (defineTags.length === 0) return 'skip';
            return defineTags.every(
                (t) =>
                    (t.value.NAME && t.value.VALUE !== undefined) ||
                    t.value.IMPORT ||
                    t.value.QUERYPARAM
            );
        },
        passDetails: 'OK',
        failDetails:
            'Every EXT-X-DEFINE tag MUST have a NAME/VALUE, IMPORT, or QUERYPARAM attribute.',
    },
    {
        id: 'HLS-DEFINE-2',
        text: 'EXT-X-DEFINE tag variable names must be unique within a playlist',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
        version: 8,
        severity: 'fail',
        scope: 'Playlist',
        category: 'Variables & Steering',
        check: (hls) => {
            const defineTags = hls.tags.filter(
                (t) => t.name === 'EXT-X-DEFINE'
            );
            if (defineTags.length === 0) return 'skip';
            const names = defineTags.map(
                (t) =>
                    t.value.NAME || t.value.IMPORT || t.value.QUERYPARAM || ''
            );
            return new Set(names).size === names.length;
        },
        passDetails: 'OK',
        failDetails:
            'An EXT-X-DEFINE tag MUST NOT specify the same Variable Name as any other EXT-X-DEFINE tag in the same Playlist.',
    },
];
