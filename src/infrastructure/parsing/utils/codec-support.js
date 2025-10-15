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

    // Audio
    'mp4a', // MPEG-4 Audio (includes AAC)
    'ac-3', // Dolby Digital
    'ec-3', // Dolby Digital Plus

    // Text
    'stpp', // TTML in MP4
    'wvtt', // WebVTT in MP4
]);

/**
 * Checks if a given codec string is supported by the internal parsers.
 * The check is case-insensitive and matches prefixes.
 * @param {string} codecString The codec identifier from the manifest.
 * @returns {boolean} True if the codec is supported, false otherwise.
 */
export function isCodecSupported(codecString) {
    if (!codecString) {
        return false;
    }
    const lowerCodec = codecString.toLowerCase();
    for (const supported of SUPPORTED_CODECS) {
        if (lowerCodec.startsWith(supported)) {
            return true;
        }
    }
    return false;
}
