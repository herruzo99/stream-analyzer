/**
 * @typedef {import('../../../core/store.js').Manifest} Manifest
 * @typedef {object} FeatureCheckResult
 * @property {boolean} used
 * @property {string} details
 */

/**
 * Runs a series of HLS-specific checks against a manifest IR object.
 * @param {Manifest} manifestIR - The manifest IR object.
 * @returns {Record<string, FeatureCheckResult>} A map of feature names to their analysis results.
 */
export function analyzeHlsFeatures(manifestIR) {
    /** @type {Record<string, FeatureCheckResult>} */
    const results = {};
    const tags = manifestIR.tags || [];

    results['Presentation Type'] = {
        used: true,
        details:
            manifestIR.type === 'dynamic'
                ? '<code>EVENT</code> or Live'
                : '<code>VOD</code>',
    };

    results['Master Playlist'] = {
        used: manifestIR.isMaster,
        details: manifestIR.isMaster
            ? `${manifestIR.variants?.length || 0} Variant Streams found.`
            : 'Media Playlist.',
    };

    const hasDiscontinuity = (manifestIR.segments || []).some(
        (s) => s.discontinuity
    );
    results['Discontinuity'] = {
        used: hasDiscontinuity,
        details: hasDiscontinuity
            ? 'Contains #EXT-X-DISCONTINUITY tags.'
            : 'No discontinuities found.',
    };

    const keyTag = tags.find((t) => t.name === 'EXT-X-KEY');
    if (keyTag && keyTag.value.METHOD !== 'NONE') {
        const methods = [
            ...new Set(
                tags
                    .filter((t) => t.name === 'EXT-X-KEY')
                    .map((t) => t.value.METHOD)
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

    const hasFmp4 = tags.some((t) => t.name === 'EXT-X-MAP');
    results['Fragmented MP4 Segments'] = {
        used: hasFmp4,
        details: hasFmp4
            ? 'Uses #EXT-X-MAP, indicating fMP4 segments.'
            : 'Likely Transport Stream (TS) segments.',
    };

    results['I-Frame Playlists'] = {
        used: tags.some((t) => t.name === 'EXT-X-I-FRAME-STREAM-INF'),
        details: 'Provides dedicated playlists for trick-play modes.',
    };

    const mediaTags = tags.filter((t) => t.name === 'EXT-X-MEDIA');
    results['Alternative Renditions'] = {
        used: mediaTags.length > 0,
        details:
            mediaTags.length > 0
                ? `${mediaTags.length} #EXT-X-MEDIA tags found.`
                : 'No separate audio/video/subtitle renditions declared.',
    };

    results['Date Ranges / Timed Metadata'] = {
        used: manifestIR.events.some((e) => e.type === 'hls-daterange'),
        details:
            'Carries timed metadata, often used for ad insertion signaling.',
    };

    const hasSubtitles = mediaTags.some((m) => m.value.TYPE === 'SUBTITLES');
    results['Subtitles & Captions'] = {
        used: hasSubtitles,
        details: hasSubtitles
            ? 'Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES.'
            : 'No subtitle renditions declared.',
    };

    results['Session Data'] = {
        used: tags.some((t) => t.name === 'EXT-X-SESSION-DATA'),
        details: 'Carries arbitrary session data in the master playlist.',
    };
    results['Session Keys'] = {
        used: tags.some((t) => t.name === 'EXT-X-SESSION-KEY'),
        details:
            'Allows pre-loading of encryption keys from the master playlist.',
    };
    results['Independent Segments'] = {
        used: tags.some((t) => t.name === 'EXT-X-INDEPENDENT-SEGMENTS'),
        details: 'All segments are self-contained for decoding.',
    };
    results['Start Offset'] = {
        used: tags.some((t) => t.name === 'EXT-X-START'),
        details: 'Specifies a preferred starting position in the playlist.',
    };

    // --- Low-Latency HLS Feature Check ---
    const llhlsTags = [];
    if (manifestIR.partInf) llhlsTags.push('EXT-X-PART-INF');
    if ((manifestIR.segments || []).some((s) => (s.parts || []).length > 0))
        llhlsTags.push('EXT-X-PART');
    if (manifestIR.serverControl) llhlsTags.push('EXT-X-SERVER-CONTROL');
    if ((manifestIR.preloadHints || []).length > 0)
        llhlsTags.push('EXT-X-PRELOAD-HINT');
    if ((manifestIR.renditionReports || []).length > 0)
        llhlsTags.push('EXT-X-RENDITION-REPORT');

    results['Low-Latency HLS'] = {
        used: llhlsTags.length > 0,
        details:
            llhlsTags.length > 0
                ? `Detected low-latency tags: <b>${llhlsTags.join(', ')}</b>`
                : 'Standard latency HLS.',
    };

    const hasSkip = tags.some((t) => t.name === 'EXT-X-SKIP');
    results['Playlist Delta Updates'] = {
        used: hasSkip,
        details: hasSkip
            ? 'Contains #EXT-X-SKIP tag, indicating a partial playlist update.'
            : 'No delta updates detected.',
    };

    const hasDefine = tags.some((t) => t.name === 'EXT-X-DEFINE');
    results['Variable Substitution'] = {
        used: hasDefine,
        details: hasDefine
            ? 'Uses #EXT-X-DEFINE for variable substitution.'
            : 'No variables defined.',
    };

    const hasSteering = tags.some((t) => t.name === 'EXT-X-CONTENT-STEERING');
    results['Content Steering'] = {
        used: hasSteering,
        details: hasSteering
            ? 'Provides client-side CDN steering information.'
            : 'No content steering information found.',
    };

    // --- Advanced Metadata Check ---
    const advancedMetadata = [];
    if ((manifestIR.variants || []).some((v) => v.attributes.SCORE))
        advancedMetadata.push('SCORE');
    if ((manifestIR.variants || []).some((v) => v.attributes['VIDEO-RANGE']))
        advancedMetadata.push('VIDEO-RANGE');
    if (
        (manifestIR.variants || []).some(
            (v) => v.attributes['STABLE-VARIANT-ID']
        )
    )
        advancedMetadata.push('STABLE-VARIANT-ID');
    if (mediaTags.some((m) => m.value['STABLE-RENDITION-ID']))
        advancedMetadata.push('STABLE-RENDITION-ID');
    if (
        manifestIR.events.some(
            (e) =>
                e.type === 'hls-daterange' &&
                e.message.toLowerCase().includes('interstitial')
        )
    )
        advancedMetadata.push('Interstitials');

    results['Advanced Metadata & Rendition Selection'] = {
        used: advancedMetadata.length > 0,
        details:
            advancedMetadata.length > 0
                ? `Detected advanced attributes: <b>${advancedMetadata.join(
                      ', '
                  )}</b>`
                : 'Uses standard metadata.',
    };

    return results;
}
