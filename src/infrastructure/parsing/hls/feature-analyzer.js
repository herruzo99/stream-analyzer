/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {object} FeatureCheckResult
 * @property {boolean} used
 * @property {string} details
 */

import { appLog } from '@/shared/utils/debug';

/**
 * Runs a series of HLS-specific checks against a manifest IR object.
 * @param {Manifest} manifestIR - The manifest IR object.
 * @returns {Record<string, FeatureCheckResult>} A map of feature names to their analysis results.
 */
export function analyzeHlsFeatures(manifestIR) {
    /** @type {Record<string, FeatureCheckResult>} */
    const results = {};
    if (!manifestIR) return results;

    try {
        const tags = manifestIR.tags || [];
        const allAdaptationSets = manifestIR.periods.flatMap(
            (p) => p.adaptationSets
        );
        const isMaster = manifestIR.isMaster;
        const segments = manifestIR.segments || [];
        const hasSegments = segments.length > 0;

        // Helper for Media Playlist dependent checks
        const mediaCheck = (condition, successMsg) => {
            if (isMaster && !hasSegments) {
                // If we are a master and haven't loaded segments (only variants),
                // we can't check segment-level tags unless we look at parsed sub-playlists
                // which aren't fully available here in the IR.
                return { used: false, details: 'N/A (Master Playlist)' };
            }
            const result = condition();
            return {
                used: result,
                details: result ? successMsg : 'Not detected.',
            };
        };

        results['Presentation Type'] = {
            used: true,
            details:
                manifestIR.type === 'dynamic'
                    ? '<code>EVENT</code> or Live'
                    : '<code>VOD</code>',
        };

        results['Multivariant Playlist'] = {
            used: isMaster,
            details: isMaster
                ? `${manifestIR.variants?.length || 0} Variant Streams found.`
                : 'Media Playlist.',
        };

        results['Byte-Range Segments'] = mediaCheck(
            () => tags.some((t) => t.name === 'EXT-X-BYTERANGE'),
            'Uses #EXT-X-BYTERANGE.'
        );

        results['Discontinuity Sequence'] = mediaCheck(
            () => tags.some((t) => t.name === 'EXT-X-DISCONTINUITY-SEQUENCE'),
            'Uses #EXT-X-DISCONTINUITY-SEQUENCE.'
        );

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
                ? 'Uses STABLE-VARIANT-ID and/or STABLE-RENDITION-ID.'
                : 'Not used.',
        };

        const hasAdvancedChannels = allAdaptationSets.some(
            (as) => as.channels && String(as.channels).includes('/')
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

        results['Discontinuity'] = mediaCheck(
            () => segments.some((s) => s.discontinuity),
            'Contains #EXT-X-DISCONTINUITY tags.'
        );

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

        results['Gap Segments'] = mediaCheck(
            () => segments.some((s) => s.gap),
            'Contains #EXT-X-GAP tags.'
        );

        results['Bitrate Hinting'] = mediaCheck(
            () => segments.some((s) => s.bitrate),
            'Contains #EXT-X-BITRATE tags.'
        );

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
            ...new Set(
                allAdaptationSets.flatMap((as) => as.characteristics || [])
            ),
        ];
        results['Rendition Characteristics'] = {
            used: allCharacteristics.length > 0,
            details:
                allCharacteristics.length > 0
                    ? `Detected: ${allCharacteristics.join(', ')}`
                    : 'Not used.',
        };

        // Check specifically for Interstitials (HLS Ad Insertion v2)
        const hasInterstitials = manifestIR.events.some(
            (e) =>
                e.type === 'hls-daterange' &&
                e.messageData &&
                e.messageData['CLASS'] === 'com.apple.hls.interstitial'
        );
        results['Interstitials'] = {
            used: hasInterstitials,
            details: hasInterstitials
                ? 'HLS Interstitial DATERANGE found.'
                : 'Not detected.',
        };

        results['Date Ranges / Timed Metadata'] = {
            used: manifestIR.events.some((e) => e.type === 'hls-daterange'),
            details:
                'Carries timed metadata, often used for ad insertion signaling.',
        };

        results['Program Date Time'] = mediaCheck(
            () => segments.some((s) => s.dateTime),
            'Segments associated with Wall Clock time.'
        );

        const hasSubtitles = mediaTags.some(
            (m) => m.value.TYPE === 'SUBTITLES'
        );
        results['Subtitles & Captions'] = {
            used: hasSubtitles,
            details: hasSubtitles
                ? 'Contains #EXT-X-MEDIA tags with TYPE=SUBTITLES.'
                : 'No subtitle renditions declared.',
        };

        results['Session Data'] = {
            used: tags.some((t) => t.name === 'EXT-X-SESSION-DATA'),
            details:
                'Carries arbitrary session data in the multivariant playlist.',
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
        if (hasSegments && segments.some((s) => (s.parts || []).length > 0))
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
                    ? `Detected low-latency tags: <b>${llhlsTags.join(
                          ', '
                      )}</b>`
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

        const hasSteering = tags.some(
            (t) => t.name === 'EXT-X-CONTENT-STEERING'
        );
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
                    /** @type {any} */ (as.serializedManifest).TYPE !==
                        'CLOSED-CAPTIONS'
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

        results['Advanced Metadata & Rendition Selection'] = {
            used: advancedMetadata.length > 0,
            details:
                advancedMetadata.length > 0
                    ? `Detected advanced attributes: <b>${advancedMetadata.join(
                          ', '
                      )}</b>`
                    : 'Uses standard metadata.',
        };
    } catch (e) {
        appLog(
            'analyzeHlsFeatures',
            'error',
            'Failed to analyze HLS features due to an unexpected error:',
            e
        );
        return {};
    }

    return results;
}
