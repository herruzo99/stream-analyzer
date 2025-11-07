/**
 * A centralized manifest of codec identifiers supported by the application's internal parsers.
 * The identifiers are prefixes; a codec string is considered supported if it starts with one of these.
 */
const SUPPORTED_CODECS = new Set([
    // Video
    'avc1', // H.264
    'avc3', // H.264
    'hvc1', // H.265 / HEVC
    'hev1', // H.265 / HEVC
    'mp4v', // MPEG-4 Visual
    'dvh1', // Dolby Vision HEVC
    'dvhe', // Dolby Vision HEVC
    'av01', // AV1
    'vp09', // VP9
    'mjpg', // Motion JPEG

    // Audio
    'mp4a', // MPEG-4 Audio (includes AAC variants like .40.2, .40.5, .40.29)
    'ac-3', // Dolby Digital
    'ec-3', // Dolby Digital Plus
    'opus', // Opus
    'flac', // FLAC

    // Text
    'stpp', // TTML in MP4
    'wvtt', // WebVTT in MP4
    'text/vtt',
]);

/**
 * Checks if a given codec string is supported by the internal parsers.
 * The check is case-insensitive, handles comma-separated lists, and matches prefixes.
 * @param {string} codecString The codec identifier from the manifest.
 * @returns {boolean} True if all codecs in the string are supported, false otherwise.
 */
export function isCodecSupported(codecString) {
    if (!codecString || typeof codecString !== 'string') {
        return false;
    }

    const codecs = codecString.split(',').map((c) => c.trim().toLowerCase());

    // Every codec in the comma-separated list must be supported.
    return codecs.every((codec) => {
        for (const supported of SUPPORTED_CODECS) {
            if (codec.startsWith(supported)) {
                return true;
            }
        }
        return false;
    });
}
