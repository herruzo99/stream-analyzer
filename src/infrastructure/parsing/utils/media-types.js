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

    // Media Segments - these are now more generic fallbacks
    ['.m4s', { contentType: 'video', codec: 'avc1, mp4a' }],
    ['.mp4', { contentType: 'video', codec: 'avc1, mp4a' }],
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

    // --- NEW: Heuristic based on URL content ---
    if (
        lowerFilename.includes('_video_') ||
        lowerFilename.includes('/video/')
    ) {
        return { contentType: 'video', codec: 'avc1' };
    }
    if (
        lowerFilename.includes('_audio_') ||
        lowerFilename.includes('/audio/')
    ) {
        return { contentType: 'audio', codec: 'mp4a.40.2' };
    }
    // --- END NEW ---

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
    } catch (e) {
        // Fallback for non-URL strings or parsing errors
        for (const [pattern, info] of extensionPatterns) {
            if (lowerFilename.endsWith(pattern)) {
                return info;
            }
        }
    }

    return { contentType: 'unknown', codec: null };
}
