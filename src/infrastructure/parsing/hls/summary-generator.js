/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').PeriodSummary} PeriodSummary
 * @typedef {import('@/types.ts').SecuritySummary} SecuritySummary
 */

import { formatBitrate } from '@/ui/shared/format';

/**
 * Creates a protocol-agnostic summary view-model from an HLS manifest.
 * @param {Manifest} manifestIR - The adapted manifest IR.
 * @param {object} [context] - Context for enrichment.
 * @param {string} [context.baseUrl] - The base URL for resolving relative segment paths.
 * @returns {Promise<import('@/types.ts').ManifestSummary>}
 */
export async function generateHlsSummary(manifestIR, context) {
    const { serializedManifest: rawElement } = manifestIR;
    const isMaster = manifestIR.isMaster;

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
                resolutions: rep.width.value
                    ? [
                          {
                              value: `${rep.width.value}x${rep.height.value}`,
                              source: rep.width.source,
                          },
                      ]
                    : [],
                codecs: rep.codecs.value
                    ? [{ value: rep.codecs.value, source: rep.codecs.source }]
                    : [],
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

    // --- Enhanced Security Summary Generation ---
    const allContentProtection = allAdaptationSets.flatMap(
        (as) => as.contentProtection
    );
    const security = /** @type {SecuritySummary} */ ({
        isEncrypted: allContentProtection.length > 0,
        systems: [], // HLS does not use PSSH, so this remains empty.
        kids: [
            ...new Set(
                allContentProtection.map((cp) => cp.defaultKid).filter(Boolean)
            ),
        ],
        hlsEncryptionMethod: null,
    });

    if (security.isEncrypted) {
        const methods = new Set(allContentProtection.map((cp) => cp.system));
        if (methods.has('SAMPLE-AES')) {
            security.hlsEncryptionMethod = 'SAMPLE-AES';
        } else if (methods.has('AES-128')) {
            security.hlsEncryptionMethod = 'AES-128';
        }
    }
    // --- End Enhanced Security Summary ---

    let mediaPlaylistDetails = null;
    if (!isMaster) {
        const segmentCount = (manifestIR.segments || []).length;
        const totalDuration = (manifestIR.segments || []).reduce(
            (sum, seg) => sum + seg.duration,
            0
        );

        mediaPlaylistDetails = {
            segmentCount: segmentCount,
            averageSegmentDuration:
                segmentCount > 0 ? totalDuration / segmentCount : 0,
            hasDiscontinuity: (manifestIR.segments || []).some(
                (s) => s.discontinuity
            ),
            isIFrameOnly: (manifestIR.tags || []).some(
                (t) => t.name === 'EXT-X-I-FRAMES-ONLY'
            ),
        };
    }

    const iFramePlaylists = (manifestIR.tags || []).filter(
        (t) => t.name === 'EXT-X-I-FRAME-STREAM-INF'
    ).length;

    /** @type {import('@/types.ts').ManifestSummary} */
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
            isLowLatency: !!manifestIR.partInf,
            partTargetDuration: manifestIR.partInf?.['PART-TARGET'] || null,
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
            mediaPlaylists: isMaster ? (manifestIR.variants || []).length : 1,
            periods: [], // HLS does not have periods, so this is empty.
        },
        videoTracks,
        audioTracks,
        textTracks,
        security,
    };

    return summary;
}
