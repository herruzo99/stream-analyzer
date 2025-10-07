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
export const structureRules = [
    {
        id: 'HLS-1',
        text: 'Playlist must start with #EXTM3U',
        isoRef: 'HLS 2nd Ed: 4.4.1.1',
        version: 1,
        severity: 'fail',
        scope: 'Playlist',
        category: 'HLS Structure',
        check: (hls) =>
            hls.serializedManifest.raw &&
            hls.serializedManifest.raw.trim().startsWith('#EXTM3U'),
        passDetails: 'OK',
        failDetails: 'The playlist must begin with the #EXTM3U tag.',
    },
    {
        id: 'HLS-2',
        text: 'Playlist must contain no more than one EXT-X-VERSION tag',
        isoRef: 'HLS 2nd Ed: 4.4.1.2',
        version: 1,
        severity: 'fail',
        scope: 'Playlist',
        category: 'HLS Structure',
        check: (hls) =>
            hls.tags.filter((t) => t.name === 'EXT-X-VERSION').length <= 1,
        passDetails: 'OK',
        failDetails:
            'A playlist MUST NOT contain more than one EXT-X-VERSION tag.',
    },
    {
        id: 'HLS-5',
        text: 'Playlist must not mix Media and Multivariant tags',
        isoRef: 'HLS 2nd Ed: 4.1',
        version: 1,
        severity: 'fail',
        scope: 'Playlist',
        category: 'HLS Structure',
        check: (hls) => !(hls.isMaster && hls.segments.length > 0),
        passDetails: 'OK',
        failDetails:
            'A playlist cannot be both a Media Playlist (with segments) and a Multivariant Playlist (with variants). It must be one or the other.',
    },
    {
        id: 'HLS-MEDIA-1',
        text: 'Media Playlist must contain an EXT-X-TARGETDURATION tag',
        isoRef: 'HLS 2nd Ed: 4.4.3.1',
        version: 1,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'HLS Structure',
        check: (hls) =>
            hls.targetDuration !== undefined && hls.targetDuration !== null,
        passDetails: 'OK',
        failDetails:
            'The EXT-X-TARGETDURATION tag is REQUIRED for Media Playlists.',
    },
    {
        id: 'HLS-MEDIA-4',
        text: 'VOD playlist implies EXT-X-ENDLIST must be present',
        isoRef: 'HLS 2nd Ed: 4.4.3.4',
        version: 1,
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'HLS Structure',
        check: (hls) => {
            if (hls.playlistType === 'VOD' || !hls.isLive) {
                return hls.tags.some((t) => t.name === 'EXT-X-ENDLIST');
            }
            return 'skip';
        },
        passDetails: 'OK',
        failDetails:
            'A VOD or non-live playlist MUST contain the EXT-X-ENDLIST tag.',
    },
    {
        id: 'HLS-MASTER-1',
        text: 'Multivariant Playlist must contain at least one EXT-X-STREAM-INF tag',
        isoRef: 'HLS 2nd Ed: 4.1',
        version: 1,
        severity: 'fail',
        scope: 'MasterPlaylist',
        category: 'HLS Structure',
        check: (hls) => hls.variants && hls.variants.length > 0,
        passDetails: 'OK',
        failDetails:
            'A Multivariant Playlist must list at least one Variant Stream.',
    },
    {
        id: 'HLS-INSTREAM-ID-VERSION',
        text: 'INSTREAM-ID for non-CC types requires version 13',
        isoRef: 'HLS 2nd Ed: 8',
        version: 13,
        severity: 'fail',
        scope: 'MasterPlaylist',
        category: 'HLS Structure',
        check: (hls, context) => {
            const hasAdvancedInstreamId = (hls.tags || []).some(
                (t) =>
                    t.name === 'EXT-X-MEDIA' &&
                    t.value['INSTREAM-ID'] &&
                    t.value.TYPE !== 'CLOSED-CAPTIONS'
            );
            if (!hasAdvancedInstreamId) {
                return 'skip';
            }
            return context.standardVersion >= 13;
        },
        passDetails:
            'OK, playlist version is sufficient for advanced INSTREAM-ID usage.',
        failDetails:
            'EXT-X-MEDIA with INSTREAM-ID for types other than CLOSED-CAPTIONS requires EXT-X-VERSION 13 or higher.',
    },
    {
        id: 'HLS-VARIANT-1',
        text: 'EXT-X-STREAM-INF must have a BANDWIDTH attribute',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
        version: 1,
        severity: 'fail',
        scope: 'Variant',
        category: 'HLS Structure',
        check: (variant) =>
            variant.attributes && variant.attributes.BANDWIDTH !== undefined,
        passDetails: 'OK',
        failDetails:
            'Every EXT-X-STREAM-INF tag MUST include the BANDWIDTH attribute.',
    },
    {
        id: 'HLS-VARIANT-3',
        text: 'EXT-X-STREAM-INF must be followed by a URI',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
        version: 1,
        severity: 'fail',
        scope: 'Variant',
        category: 'HLS Structure',
        check: (variant) => variant.uri && variant.uri.trim() !== '',
        passDetails: 'OK',
        failDetails:
            'The EXT-X-STREAM-INF tag must be followed by the URI of its Media Playlist on the next line.',
    },
    {
        id: 'HLS-VARIANT-4',
        text: 'CLOSED-CAPTIONS=NONE must apply to all variants if used',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
        version: 4,
        severity: 'fail',
        scope: 'MasterPlaylist',
        category: 'HLS Structure',
        check: (hls) => {
            const variantsWithCC = hls.variants.filter(
                (v) => v.attributes['CLOSED-CAPTIONS'] !== undefined
            );
            if (variantsWithCC.length === 0) return 'skip';
            const hasNone = variantsWithCC.some(
                (v) => v.attributes['CLOSED-CAPTIONS'] === 'NONE'
            );
            if (!hasNone) return 'skip';
            return hls.variants.every(
                (v) => v.attributes['CLOSED-CAPTIONS'] === 'NONE'
            );
        },
        passDetails: 'OK',
        failDetails:
            'If the value of the CLOSED-CAPTIONS attribute is NONE, all EXT-X-STREAM-INF tags MUST have this attribute with a value of NONE.',
    },
    {
        id: 'HLS-SEGMENT-1',
        text: 'Each Media Segment must be preceded by an EXTINF tag',
        isoRef: 'HLS 2nd Ed: 4.4.4.1',
        version: 1,
        severity: 'fail',
        scope: 'Segment',
        category: 'HLS Structure',
        check: (segment) => segment.duration !== undefined,
        passDetails: 'OK',
        failDetails: 'The EXTINF tag is REQUIRED for each Media Segment.',
    },
    {
        id: 'HLS-MEDIA-5',
        text: 'A Rendition Group must not have more than one DEFAULT=YES member',
        isoRef: 'HLS 2nd Ed: 4.4.6.1.1',
        version: 4,
        severity: 'fail',
        scope: 'MediaGroup',
        category: 'HLS Structure',
        check: (group) => group.filter((m) => m.DEFAULT === 'YES').length <= 1,
        passDetails: 'OK',
        failDetails:
            'A group of renditions MUST NOT have more than one member with DEFAULT=YES.',
    },
    {
        id: 'HLS-MEDIA-6',
        text: 'All members of a Rendition Group must have different NAME attributes',
        isoRef: 'HLS 2nd Ed: 4.4.6.1.1',
        version: 4,
        severity: 'fail',
        scope: 'MediaGroup',
        category: 'HLS Structure',
        check: (group) => {
            const names = group.map((m) => m.NAME);
            return new Set(names).size === names.length;
        },
        passDetails: 'OK',
        failDetails:
            'All EXT-X-MEDIA tags in the same Group MUST have different NAME attributes.',
    },
];