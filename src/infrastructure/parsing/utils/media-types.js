/**
 * @typedef {'video' | 'audio' | 'text' | 'init' | 'unknown'} ContentType
 * @typedef {{ contentType: ContentType, codec: string | null }} MediaInfo
 */

/**
 * An ordered list of patterns to infer media type from a filename's extension.
 * More specific patterns must come before more general ones.
 * @type {[string, MediaInfo][]}
 */
const extensionPatterns = [
    // Init Segments (most specific)
    ['init.mp4', { contentType: 'init', codec: null }],
    ['init.m4s', { contentType: 'init', codec: null }],

    // Media Segments
    ['.m4s', { contentType: 'video', codec: 'avc1, mp4a' }],
    // REMOVED: ['.mp4', { contentType: 'video', codec: 'avc1, mp4a' }],
    ['.m4v', { contentType: 'video', codec: 'avc1' }],
    ['.cmfv', { contentType: 'video', codec: 'avc1, mp4a' }], // CMAF Video
    ['.ts', { contentType: 'video', codec: 'avc1, mp4a' }], // Transport Stream

    // Audio
    ['.m4a', { contentType: 'audio', codec: 'mp4a' }],
    ['.aac', { contentType: 'audio', codec: 'aac' }],
    ['.ac3', { contentType: 'audio', codec: 'ac-3' }],
    ['.ec3', { contentType: 'audio', codec: 'ec-3' }],
    ['.mp3', { contentType: 'audio', codec: 'mp3' }],
    ['.cmfa', { contentType: 'audio', codec: 'mp4a' }], // CMAF Audio

    // Text
    ['.vtt', { contentType: 'text', codec: 'wvtt' }],
    ['.webvtt', { contentType: 'text', codec: 'wvtt' }],
    ['.cmft', { contentType: 'text', codec: 'wvtt' }], // CMAF Text
    ['.ttml', { contentType: 'text', codec: 'stpp' }],
    ['.dfxp', { contentType: 'text', codec: 'stpp' }],
    ['.xml', { contentType: 'text', codec: 'stpp' }], // Generic XML, often TTML in streaming context
];

/**
 * Infers the media content type and a likely codec from a filename's extension and content.
 * @param {string | null | undefined} filename The filename or URI of the media segment.
 * @returns {MediaInfo} An object with the inferred contentType and codec.
 */
export function inferMediaInfoFromExtension(filename) {
    if (!filename) {
        return { contentType: 'unknown', codec: null };
    }

    const lowerFilename = filename.toLowerCase();

    // --- Heuristic based on URL content ---

    // Strong Video Signals: Explicit names or video codec keywords
    if (
        lowerFilename.includes('video') ||
        lowerFilename.includes('vid_') ||
        lowerFilename.includes('h264') ||
        lowerFilename.includes('h265') ||
        lowerFilename.includes('hevc') ||
        lowerFilename.includes('avc')
    ) {
        return { contentType: 'video', codec: 'avc1' };
    }

    // Strong Audio Signals: Explicit names
    if (
        lowerFilename.includes('audio') ||
        lowerFilename.includes('aud_') ||
        lowerFilename.includes('sound')
    ) {
        return { contentType: 'audio', codec: 'mp4a.40.2' };
    }
    // --- END Heuristics ---

    try {
        const path = new URL(filename).pathname;
        const lowerPath = path.toLowerCase();

        for (const [pattern, info] of extensionPatterns) {
            if (pattern.startsWith('init.')) {
                if (lowerPath.includes(pattern)) {
                    return info;
                }
            } else if (lowerPath.endsWith(pattern)) {
                return info;
            }
        }
    } catch (_e) {
        // Fallback for non-URL strings or parsing errors
        for (const [pattern, info] of extensionPatterns) {
            if (lowerFilename.endsWith(pattern)) {
                return info;
            }
        }
    }
    // If no specific audio extension is found, but it is an mp4, assume video as a last resort.
    if (lowerFilename.endsWith('.mp4')) {
        return { contentType: 'video', codec: 'avc1, mp4a' };
    }

    return { contentType: 'unknown', codec: null };
}

/**
 * Determines the segment format for an HLS manifest using reliable heuristics.
 * @param {object} hlsParsed - The parsed HLS manifest data from the parser.
 * @returns {'isobmff' | 'ts' | 'unknown'}
 */
export function determineSegmentFormat(hlsParsed) {
    // 1. Definitive check: If EXT-X-MAP is present, it's fMP4 (ISOBFF).
    if (hlsParsed.map) {
        return 'isobmff';
    }

    // 2. Media Playlist Check: Check segment extensions directly. This is highly reliable.
    const segments = (hlsParsed.segmentGroups || []).flat();
    if (segments && segments.length > 0) {
        for (const segment of segments) {
            const lowerUri = (segment.uri || '').toLowerCase();
            if (
                lowerUri.endsWith('.m4s') ||
                lowerUri.endsWith('.mp4') ||
                lowerUri.includes('.cmf')
            ) {
                return 'isobmff';
            }
            if (lowerUri.endsWith('.ts')) {
                return 'ts';
            }
        }
    }

    // 3. Master Playlist Heuristics
    if (
        hlsParsed.isMaster &&
        hlsParsed.variants &&
        hlsParsed.variants.length > 0
    ) {
        // 3a. Check extensions of variant stream URIs.
        // NOTE: We REMOVED the codec check (avc1/mp4a) because those codecs are valid for both TS and fMP4.
        for (const variant of hlsParsed.variants) {
            const lowerUri = (variant.uri || '').toLowerCase();
            if (lowerUri.includes('.m4s') || lowerUri.includes('.mp4')) {
                return 'isobmff';
            }
            if (lowerUri.includes('.ts')) {
                return 'ts';
            }
        }
    }

    // 4. Final Fallback: The default for HLS is MPEG-2 Transport Stream.
    return 'ts';
}