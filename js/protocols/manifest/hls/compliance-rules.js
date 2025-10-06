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
export const rules = [
    // --- Playlist Level Rules (Apply to the whole parsed HLS object) ---
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

    // --- Media Playlist Level Rules ---
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

    // --- Low-Latency HLS Profile Rules (Version 9+) ---
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
        id: 'LL-HLS-PART-INF-1',
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
        id: 'LL-HLS-3',
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
        id: 'LL-HLS-4',
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
        id: 'LL-HLS-5',
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
        id: 'LL-HLS-6',
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
        id: 'LL-HLS-7',
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

    // --- Master/Multivariant Playlist Level Rules ---
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

    // --- Variant Level Rules ---
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
        id: 'HLS-VARIANT-2',
        text: 'EXT-X-STREAM-INF should have CODECS attribute',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
        version: 1,
        severity: 'warn',
        scope: 'Variant',
        category: 'Interoperability',
        check: (variant) => variant.attributes.CODECS !== undefined,
        passDetails: 'OK',
        failDetails:
            'The CODECS attribute SHOULD be present for a client to make an informed selection.',
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

    // --- Segment Level Rules ---
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

    // --- Key/Encryption Rules ---
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

    // --- Media Group Rules ---
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
        failDetails: 'All EXT-X-MEDIA tags in the same Group MUST have different NAME attributes.',
    },
];