/**
 * @typedef {import('../dash/compliance-rules.js').CheckStatus} CheckStatus
 * @typedef {import('../dash/compliance-rules.js').RuleCategory} RuleCategory
 * @typedef {'Playlist' | 'MediaPlaylist' | 'MasterPlaylist' | 'Segment' | 'Key' | 'MediaGroup' | 'Variant' | 'IframeVariant'} HlsRuleScope
 */

/**
 * @typedef {object} HlsRule
 * @property {string} id - A unique identifier for the rule.
 * @property {string} text - The human-readable title of the check.
 * @property {string} isoRef - The reference to the RFC 8216 standard clause.
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
        isoRef: 'RFC 8216bis, 4.4.1.1',
        severity: 'fail',
        scope: 'Playlist',
        category: 'HLS Structure',
        check: (hls) => hls.raw && hls.raw.trim().startsWith('#EXTM3U'),
        passDetails: 'OK',
        failDetails: 'The playlist must begin with the #EXTM3U tag.',
    },
    {
        id: 'HLS-2',
        text: 'Playlist must contain no more than one EXT-X-VERSION tag',
        isoRef: 'RFC 8216bis, 4.4.1.2',
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
        text: 'Playlist must not mix Media and Master tags',
        isoRef: 'RFC 8216bis, 4.2 & 4.4.4',
        severity: 'fail',
        scope: 'Playlist',
        category: 'HLS Structure',
        check: (hls) => !(hls.isMaster && hls.segments.length > 0),
        passDetails: 'OK',
        failDetails:
            'A playlist cannot be both a Media Playlist (with segments) and a Master Playlist (with variants).',
    },
    {
        id: 'HLS-VAR-1',
        text: 'EXT-X-DEFINE tag must contain NAME attribute',
        isoRef: 'RFC 8216bis, 4.4.2.3',
        severity: 'fail',
        scope: 'Playlist',
        category: 'HLS Structure',
        check: (hls) => {
            const defineTags = hls.tags.filter(
                (t) => t.name === 'EXT-X-DEFINE'
            );
            if (defineTags.length === 0) return 'skip';
            return defineTags.every((t) => t.value.NAME !== undefined);
        },
        passDetails: 'OK',
        failDetails: 'Every EXT-X-DEFINE tag MUST have a NAME attribute.',
    },

    // --- Media Playlist Level Rules ---
    {
        id: 'HLS-MEDIA-1',
        text: 'Media Playlist must contain an EXT-X-TARGETDURATION tag',
        isoRef: 'RFC 8216bis, 4.4.3.1',
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
        isoRef: 'RFC 8216bis, 4.4.3.5',
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
        isoRef: 'RFC 8216bis, 4.4.3.2',
        severity: 'warn',
        scope: 'MediaPlaylist',
        category: 'Live Stream Properties',
        check: (hls, { isLive }) => {
            if (!isLive) return 'skip';
            return hls.tags.some((t) => t.name === 'EXT-X-MEDIA-SEQUENCE');
        },
        passDetails: 'OK',
        failDetails:
            'For live playlists, EXT-X-MEDIA-SEQUENCE is essential for clients to reload the playlist correctly.',
    },
    {
        id: 'HLS-MEDIA-4',
        text: 'VOD playlist implies EXT-X-ENDLIST must be present',
        isoRef: 'RFC 8216bis, 4.4.3.5',
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

    // --- Low-Latency HLS Profile Rules ---
    {
        id: 'LL-HLS-1',
        text: 'LL-HLS requires EXT-X-PART-INF if PARTs are present',
        isoRef: 'RFC 8216bis, 4.4.3.7',
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Profile Conformance',
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
        text: 'LL-HLS requires EXT-X-SERVER-CONTROL tag',
        isoRef: 'RFC 8216bis, 4.4.3.8',
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Profile Conformance',
        check: (hls) => {
            if (!hls.partInf) return 'skip';
            return !!hls.serverControl;
        },
        passDetails: 'OK, EXT-X-SERVER-CONTROL is present.',
        failDetails:
            'Low-Latency HLS playlists MUST contain an EXT-X-SERVER-CONTROL tag to enable client optimizations.',
    },
    {
        id: 'LL-HLS-3',
        text: 'LL-HLS requires a PART-HOLD-BACK attribute',
        isoRef: 'RFC 8216bis, 4.4.3.8',
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Profile Conformance',
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
        isoRef: 'RFC 8216bis, 4.4.3.8',
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Profile Conformance',
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
        text: 'LL-HLS requires EXT-X-PROGRAM-DATE-TIME tags',
        isoRef: 'RFC 8216bis, B.1',
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Profile Conformance',
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
        text: 'LL-HLS requires EXT-X-PRELOAD-HINT for the next Partial Segment',
        isoRef: 'RFC 8216bis, B.1',
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Profile Conformance',
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
        text: 'LL-HLS requires EXT-X-RENDITION-REPORT tags in media playlists',
        isoRef: 'RFC 8216bis, B.1',
        severity: 'fail',
        scope: 'MediaPlaylist',
        category: 'Profile Conformance',
        check: (hls) => {
            if (!hls.partInf || !hls.isLive) return 'skip';
            return hls.renditionReports.length > 0;
        },
        passDetails: 'OK, rendition reports are present.',
        failDetails:
            'The Low-Latency HLS profile requires rendition reports in each media playlist to avoid tune-in delays.',
    },
    {
        id: 'HLS-RENDITION-REPORT-VALID',
        text: 'Rendition Reports must be accurate',
        isoRef: 'RFC 8216bis, 4.4.5.4',
        severity: 'fail',
        scope: 'MasterPlaylist',
        category: 'Interoperability',
        check: (hls, context) => {
            const validationResults = context.stream?.semanticData?.get(
                'renditionReportValidation'
            );
            if (!validationResults || validationResults.length === 0)
                return 'skip';

            return validationResults.every((r) => r.isValid);
        },
        passDetails:
            'All Rendition Reports accurately reflect the state of their respective Media Playlists.',
        failDetails: (hls, context) => {
            const validationResults = context.stream?.semanticData?.get(
                'renditionReportValidation'
            );
            const errors = validationResults
                .filter((r) => !r.isValid)
                .map((r) => {
                    if (r.error) return `Report for ${r.uri}: ${r.error}`;
                    return `Report for ${r.uri}: Reported MSN/Part ${r.reportedMsn}/${r.reportedPart}, Actual ${r.actualMsn}/${r.actualPart}`;
                })
                .join('; ');
            return `One or more Rendition Reports are stale or incorrect. ${errors}`;
        },
    },

    // --- Master Playlist Level Rules ---
    {
        id: 'HLS-MASTER-1',
        text: 'Master Playlist must contain at least one EXT-X-STREAM-INF tag',
        isoRef: 'RFC 8216bis, 4.2',
        severity: 'fail',
        scope: 'MasterPlaylist',
        category: 'HLS Structure',
        check: (hls) => hls.variants && hls.variants.length > 0,
        passDetails: 'OK',
        failDetails: 'A Master Playlist must list at least one Variant Stream.',
    },

    // --- Variant Level Rules ---
    {
        id: 'HLS-VARIANT-1',
        text: 'EXT-X-STREAM-INF must have a BANDWIDTH attribute',
        isoRef: 'RFC 8216bis, 4.4.6.2',
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
        text: 'EXT-X-STREAM-INF should have CODECS or RESOLUTION',
        isoRef: 'RFC 8216bis, 4.4.6.2',
        severity: 'warn',
        scope: 'Variant',
        category: 'Interoperability',
        check: (variant) =>
            variant.attributes.RESOLUTION !== undefined ||
            variant.attributes.CODECS !== undefined,
        passDetails: 'OK',
        failDetails:
            'At least one of RESOLUTION or CODECS should be present for a client to make an informed selection.',
    },
    {
        id: 'HLS-VARIANT-3',
        text: 'EXT-X-STREAM-INF must be followed by a URI',
        isoRef: 'RFC 8216bis, 4.4.6.2',
        severity: 'fail',
        scope: 'Variant',
        category: 'HLS Structure',
        check: (variant) => variant.uri && variant.uri.trim() !== '',
        passDetails: 'OK',
        failDetails:
            'The EXT-X-STREAM-INF tag must be followed by the URI of its Media Playlist on the next line.',
    },

    // --- Segment Level Rules ---
    {
        id: 'HLS-SEGMENT-1',
        text: 'Each Media Segment must be preceded by an EXTINF tag',
        isoRef: 'RFC 8216bis, 4.4.2.1',
        severity: 'fail',
        scope: 'Segment',
        category: 'HLS Structure',
        check: (segment) => segment.duration !== undefined,
        passDetails: 'OK',
        failDetails: 'The EXTINF tag is REQUIRED for each Media Segment.',
    },
    {
        id: 'HLS-SEGMENT-2',
        text: 'EXTINF duration must be <= target duration (integer)',
        isoRef: 'RFC 8216bis, 4.4.3.1',
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
        id: 'HLS-SEGMENT-3',
        text: 'EXTINF duration should be <= target duration (float)',
        isoRef: 'RFC 8216bis, 4.4.3.1',
        severity: 'warn',
        scope: 'Segment',
        category: 'Segment & Timing Info',
        check: (segment, { targetDuration }) => {
            if (targetDuration === null) return 'skip';
            return segment.duration <= targetDuration;
        },
        passDetails: 'OK',
        failDetails: (segment, { targetDuration }) =>
            `Segment duration (${segment.duration}s) is greater than the target duration (${targetDuration}s), which can cause playback issues.`,
    },

    // --- Key/Encryption Rules ---
    {
        id: 'HLS-KEY-1',
        text: 'EXT-X-KEY must have a URI if method is not NONE',
        isoRef: 'RFC 8216bis, 4.4.2.4',
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
