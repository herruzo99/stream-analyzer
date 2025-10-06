/**
 * @typedef {import('../../../core/types.js').Manifest} Manifest
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
    const allAdaptationSets = manifestIR.periods.flatMap(
        (p) => p.adaptationSets
    );

    results['Presentation Type'] = {
        used: true,
        details:
            manifestIR.type === 'dynamic'
                ? '<code>EVENT</code> or Live'
                : '<code>VOD</code>',
    };

    results['Multivariant Playlist'] = {
        used: manifestIR.isMaster,
        details: manifestIR.isMaster
            ? `${manifestIR.variants?.length || 0} Variant Streams found.`
            : 'Media Playlist.',
    };

    results['Byte-Range Segments'] = {
        used: tags.some((t) => t.name === 'EXT-X-BYTERANGE'),
        details: 'Uses #EXT-X-BYTERANGE to define segments as sub-ranges.',
    };

    results['Discontinuity Sequence'] = {
        used: tags.some((t) => t.name === 'EXT-X-DISCONTINUITY-SEQUENCE'),
        details: 'Uses #EXT-X-DISCONTINUITY-SEQUENCE for synchronization.',
    };

    results['HDCP Level'] = {
        used: (manifestIR.variants || []).some(
            (v) => v.attributes['HDCP-LEVEL']
        ),
        details: 'HDCP-LEVEL attribute is present on one or more variants.',
    };

    const hasStableIds =
        (manifestIR.variants || []).some(
            (v) => v.attributes['STABLE-VARIANT-ID']
        ) || allAdaptationSets.some((as) => as.stableRenditionId);
    results['Stable Variant/Rendition IDs'] = {
        used: hasStableIds,
        details: hasStableIds
            ? 'Uses STABLE-VARIANT-ID and/or STABLE-RENDITION-ID for persistent references.'
            : 'Not used.',
    };

    const hasAdvancedChannels = allAdaptationSets.some(
        (as) => as.channels && as.channels.includes('/')
    );
    results['Advanced Spatial Audio (CHANNELS)'] = {
        used: hasAdvancedChannels,
        details: hasAdvancedChannels
            ? 'CHANNELS attribute contains advanced spatial audio parameters.'
            : 'Not used.',
    };

    const hasMachineGenerated = allAdaptationSets.some(
        (as) =>
            as.characteristics &&
            as.characteristics.includes('public.machine-generated')
    );
    results['Machine-Generated Content Flag'] = {
        used: hasMachineGenerated,
        details: hasMachineGenerated
            ? 'One or more renditions are marked as machine-generated.'
            : 'Not used.',
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

    const hasGap = (manifestIR.segments || []).some((s) => s.gap);
    results['Gap Segments'] = {
        used: hasGap,
        details: hasGap
            ? 'Contains #EXT-X-GAP tags to signal missing media.'
            : 'No gap tags found.',
    };

    const hasBitrate = (manifestIR.segments || []).some((s) => s.bitrate);
    results['Bitrate Hinting'] = {
        used: hasBitrate,
        details: hasBitrate
            ? 'Contains #EXT-X-BITRATE tags.'
            : 'No bitrate tags found.',
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

    results['Associated Language'] = {
        used: allAdaptationSets.some((as) => as.assocLanguage),
        details: 'Uses ASSOC-LANGUAGE to link related language renditions.',
    };

    results['Forced Subtitles'] = {
        used: allAdaptationSets.some((as) => as.forced),
        details: 'Contains subtitle renditions marked as FORCED.',
    };

    const allCharacteristics = [
        ...new Set(allAdaptationSets.flatMap((as) => as.characteristics || [])),
    ];
    results['Rendition Characteristics'] = {
        used: allCharacteristics.length > 0,
        details:
            allCharacteristics.length > 0
                ? `Detected: ${allCharacteristics.join(', ')}`
                : 'Not used.',
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
        details: 'Carries arbitrary session data in the multivariant playlist.',
    };
    results['Session Keys'] = {
        used: tags.some((t) => t.name === 'EXT-X-SESSION-KEY'),
        details:
            'Allows pre-loading of encryption keys from the multivariant playlist.',
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

    const videoRangeValues = new Set(
        manifestIR.periods
            .flatMap((p) => p.adaptationSets)
            .flatMap((as) => as.representations)
            .map((r) => r.videoRange)
            .filter(Boolean)
    );
    results['Video Range (SDR/PQ/HLG)'] = {
        used: videoRangeValues.size > 0,
        details:
            videoRangeValues.size > 0
                ? `Detected: ${Array.from(videoRangeValues).join(', ')}`
                : 'Not specified.',
    };

    const hasGeneralizedInstreamId = (manifestIR.periods || [])
        .flatMap((p) => p.adaptationSets)
        .some(
            (as) =>
                as.serializedManifest['INSTREAM-ID'] &&
                as.serializedManifest.TYPE !== 'CLOSED-CAPTIONS'
        );
    results['Generalized INSTREAM-ID'] = {
        used: hasGeneralizedInstreamId,
        details: hasGeneralizedInstreamId
            ? 'INSTREAM-ID used on non-CC media types.'
            : 'Not used.',
    };

    const hasImmersiveVideo = (manifestIR.periods || [])
        .flatMap((p) => p.adaptationSets)
        .flatMap((as) => as.representations)
        .some((r) => r.reqVideoLayout);
    results['Immersive Video (REQ-VIDEO-LAYOUT)'] = {
        used: hasImmersiveVideo,
        details: hasImmersiveVideo
            ? 'REQ-VIDEO-LAYOUT attribute found on one or more variants.'
            : 'Not used.',
    };

    // --- Advanced Metadata Check ---
    const advancedMetadata = [];
    if ((manifestIR.variants || []).some((v) => v.attributes.SCORE))
        advancedMetadata.push('SCORE');
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