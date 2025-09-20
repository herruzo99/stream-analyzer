/**
 * @typedef {import('../../state.js').Manifest} Manifest
 * @typedef {object} FeatureCheckResult
 * @property {boolean} used
 * @property {string} details
 */

/**
 * Runs a series of HLS-specific checks against a parsed manifest object.
 * @param {object} hlsParsed - The raw parsed HLS object.
 * @returns {Record<string, FeatureCheckResult>} A map of feature names to their analysis results.
 */
export function analyzeHlsFeatures(hlsParsed) {
    /** @type {Record<string, FeatureCheckResult>} */
    const results = {};

    results['Presentation Type'] = {
        used: true,
        details: hlsParsed.isLive ? '<code>EVENT</code> or Live' : '<code>VOD</code>',
    };

    results['Master Playlist (HLS)'] = {
        used: hlsParsed.isMaster,
        details: hlsParsed.isMaster
            ? `${hlsParsed.variants.length} Variant Streams found.`
            : 'Media Playlist.',
    };

    const hasDiscontinuity = hlsParsed.segments.some(s => s.discontinuity);
    results['Multi-Period (DASH) / Discontinuity (HLS)'] = {
        used: hasDiscontinuity,
        details: hasDiscontinuity ? 'Contains #EXT-X-DISCONTINUITY tags.' : 'No discontinuities found.',
    };

    const hasKey = hlsParsed.segments.some((s) => s.key && s.key.METHOD !== 'NONE');
    if (hasKey) {
        const methods = [
            ...new Set(
                hlsParsed.segments
                    .filter((s) => s.key)
                    .map((s) => s.key.METHOD)
            ),
        ];
        results['Content Protection'] = {
            used: true,
            details: `Methods: <b>${methods.join(', ')}</b>`,
        };
    } else {
        results['Content Protection'] = {
            used: false,
            details: 'No #EXT-X-KEY tags found.',
        };
    }

    const hasFmp4 = hlsParsed.tags.some(t => t.name === 'EXT-X-MAP');
    results['Fragmented MP4 Segments'] = {
        used: hasFmp4,
        details: hasFmp4 ? 'Uses #EXT-X-MAP, indicating fMP4 segments.' : 'Likely Transport Stream (TS) segments.',
    };

    results['I-Frame Playlists / Trick Modes'] = {
        used: hlsParsed.tags.some((t) => t.name === 'EXT-X-I-FRAME-STREAM-INF'),
        details: 'Provides dedicated playlists for trick-play modes.',
    };

    results['Alternative Renditions / Roles'] = {
        used: hlsParsed.media.length > 0,
        details:
            hlsParsed.media.length > 0
                ? `${hlsParsed.media.length} #EXT-X-MEDIA tags found.`
                : 'No separate audio/video/subtitle renditions declared.',
    };
    
    results['Date Ranges / Timed Metadata'] = {
        used: hlsParsed.tags.some(t => t.name === 'EXT-X-DATERANGE'),
        details: 'Carries timed metadata, often used for ad insertion signaling.'
    };
    
    const hasSubtitles = hlsParsed.media.some(m => m.TYPE === 'SUBTITLES');
    results['Subtitles & Captions'] = {
        used: hasSubtitles,
        details: hasSubtitles ? 'Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES.' : 'No subtitle renditions declared.',
    };

    return results;
}