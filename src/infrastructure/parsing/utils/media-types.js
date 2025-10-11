/**
 * @typedef {'video' | 'audio' | 'text' | 'unknown'} ContentType
 * @typedef {{ contentType: ContentType, codec: string | null }} MediaInfo
 */

/**
 * A map of common media file extensions to their inferred content type and codec.
 * This provides a reasonable first-pass guess when more explicit information is not available.
 * @type {Record<string, MediaInfo>}
 */
const extensionMap = {
    // Video (often muxed)
    '.mp4': { contentType: 'video', codec: 'avc1, mp4a' },
    '.m4v': { contentType: 'video', codec: 'avc1' },
    '.cmfv': { contentType: 'video', codec: 'avc1, mp4a' }, // CMAF Video
    '.ts': { contentType: 'video', codec: 'avc1, mp4a' }, // Transport Stream

    // Audio
    '.m4a': { contentType: 'audio', codec: 'mp4a' },
    '.aac': { contentType: 'audio', codec: 'aac' },
    '.ac3': { contentType: 'audio', codec: 'ac-3' },
    '.ec3': { contentType: 'audio', codec: 'ec-3' },
    '.mp3': { contentType: 'audio', codec: 'mp3' },
    '.cmfa': { contentType: 'audio', codec: 'mp4a' }, // CMAF Audio

    // Text
    '.vtt': { contentType: 'text', codec: 'wvtt' },
    '.cmft': { contentType: 'text', codec: 'wvtt' }, // CMAF Text
};

/**
 * Infers the media content type and a likely codec from a filename's extension.
 * @param {string | null | undefined} filename The filename or URI of the media segment.
 * @returns {MediaInfo} An object with the inferred contentType and codec.
 */
export function inferMediaInfoFromExtension(filename) {
    if (!filename) {
        return { contentType: 'unknown', codec: null };
    }

    for (const ext in extensionMap) {
        if (filename.toLowerCase().endsWith(ext)) {
            return extensionMap[ext];
        }
    }

    return { contentType: 'video', codec: null }; // Default to video for unknown types
}