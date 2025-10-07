/**
 * @typedef {import('../../../app/types.js').Manifest} Manifest
 * @typedef {import('../../../app/types.js').PeriodSummary} PeriodSummary
 */

import { formatBitrate } from '../../../shared/utils/format.js';

/**
 * Creates a protocol-agnostic summary view-model from an HLS manifest.
 * @param {Manifest} manifestIR - The adapted manifest IR.
 * @returns {import('../../../app/types.js').ManifestSummary}
 */
export function generateHlsSummary(manifestIR) {
    const { serializedManifest: rawElement } = manifestIR;
    const isMaster = /** @type {any} */ (rawElement).isMaster;

    const allAdaptationSets = manifestIR.periods.flatMap(
        (p) => p.adaptationSets
    );

    const videoTracks = allAdaptationSets
        .filter((as) => as.contentType === 'video')
        .flatMap((as) =>
            as.representations.map((rep) => ({
                id: rep.stableVariantId || rep.id,
                profiles: null,
                bitrateRange: formatBitrate(rep.bandwidth),
                resolutions: rep.width ? [`${rep.width}x${rep.height}`] : [],
                codecs: [rep.codecs],
                scanType: null,
                videoRange: rep.videoRange || null,
                roles: [],
            }))
        );

    const audioTracks = allAdaptationSets
        .filter((as) => as.contentType === 'audio')
        .map((as) => ({
            id: as.stableRenditionId || as.id,
            lang: as.lang,
            codecs: [],
            channels: as.channels,
            isDefault:
                /** @type {any} */ (as.serializedManifest).DEFAULT === 'YES',
            isForced: as.forced,
            roles: [],
        }));

    const textTracks = allAdaptationSets
        .filter(
            (as) => as.contentType === 'text' || as.contentType === 'subtitles'
        )
        .map((as) => ({
            id: as.stableRenditionId || as.id,
            lang: as.lang,
            codecsOrMimeTypes: [],
            isDefault:
                /** @type {any} */ (as.serializedManifest).DEFAULT === 'YES',
            isForced: as.forced,
            roles: [],
        }));

    const protectionSchemes = new Set();
    const kids = new Set();
    let mediaPlaylistDetails = null;

    if (isMaster) {
        const sessionKey = /** @type {any} */ (rawElement).tags.find(
            (t) => t.name === 'EXT-X-SESSION-KEY'
        );
        if (sessionKey && sessionKey.value.METHOD !== 'NONE') {
            protectionSchemes.add(sessionKey.value.METHOD);
        }
    } else {
        const keyTag = /** @type {any} */ (rawElement).segments.find(
            (s) => s.key
        )?.key;
        if (keyTag && keyTag.METHOD !== 'NONE') {
            protectionSchemes.add(keyTag.METHOD);
        }

        const segmentCount = /** @type {any} */ (rawElement).segments.length;
        const totalDuration = /** @type {any} */ (rawElement).segments.reduce(
            (sum, seg) => sum + seg.duration,
            0
        );

        mediaPlaylistDetails = {
            segmentCount: segmentCount,
            averageSegmentDuration:
                segmentCount > 0 ? totalDuration / segmentCount : 0,
            hasDiscontinuity: /** @type {any} */ (rawElement).segments.some(
                (s) => s.discontinuity
            ),
            isIFrameOnly: /** @type {any} */ (rawElement).tags.some(
                (t) => t.name === 'EXT-X-I-FRAMES-ONLY'
            ),
        };
    }

    const iFramePlaylists = /** @type {any} */ (rawElement).tags.filter(
        (t) => t.name === 'EXT-X-I-FRAME-STREAM-INF'
    ).length;

    /** @type {import('../../../app/types.js').ManifestSummary} */
    const summary = {
        general: {
            protocol: 'HLS',
            streamType:
                manifestIR.type === 'dynamic'
                    ? 'Live / Dynamic'
                    : 'VOD / Static',
            streamTypeColor:
                manifestIR.type === 'dynamic'
                    ? 'text-red-400'
                    : 'text-blue-400',
            duration: manifestIR.duration,
            segmentFormat: manifestIR.segmentFormat.toUpperCase(),
            title: null,
            locations: [],
            segmenting: 'Segment List',
        },
        dash: null,
        hls: {
            version: /** @type {any} */ (rawElement).version,
            targetDuration: /** @type {any} */ (rawElement).targetDuration,
            iFramePlaylists: iFramePlaylists,
            mediaPlaylistDetails,
        },
        lowLatency: {
            isLowLatency: !!(/** @type {any} */ (rawElement).partInf),
            partTargetDuration:
                /** @type {any} */ (rawElement).partInf?.['PART-TARGET'] ||
                null,
            partHoldBack: manifestIR.serverControl?.['PART-HOLD-BACK'] || null,
            canBlockReload:
                manifestIR.serverControl?.['CAN-BLOCK-RELOAD'] === 'YES',
            targetLatency: null,
            minLatency: null,
            maxLatency: null,
        },
        content: {
            totalPeriods: 1, // HLS is conceptually a single period
            totalVideoTracks: videoTracks.length,
            totalAudioTracks: audioTracks.length,
            totalTextTracks: textTracks.length,
            mediaPlaylists: isMaster
                ? /** @type {any} */ ((rawElement).variants || []).length
                : 1,
            periods: [], // HLS does not have periods, so this is empty.
        },
        videoTracks,
        audioTracks,
        textTracks,
        security: {
            isEncrypted: protectionSchemes.size > 0,
            systems: Array.from(protectionSchemes),
            kids: Array.from(kids),
        },
    };

    return summary;
}
