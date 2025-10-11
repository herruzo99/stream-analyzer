/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').PeriodSummary} PeriodSummary
 * @typedef {import('@/types.ts').SecuritySummary} SecuritySummary
 */

import { formatBitrate } from '@/ui/shared/format';
import { isCodecSupported } from '../utils/codec-support.js';

const findBoxRecursive = (boxes, predicateOrType) => {
    const predicate =
        typeof predicateOrType === 'function'
            ? predicateOrType
            : (box) => box.type === predicateOrType;

    if (!boxes) return null;
    for (const box of boxes) {
        if (predicate(box)) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, predicate);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Creates a protocol-agnostic summary view-model from an HLS manifest.
 * @param {Manifest} manifestIR - The adapted manifest IR.
 * @param {object} [context] - Context for enrichment.
 * @param {string} [context.baseUrl] - The base URL for resolving relative segment paths.
 * @param {Function} [context.fetchAndParseSegment] - Function to fetch and parse a segment.
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
                    ? [
                          {
                              value: rep.codecs.value,
                              source: rep.codecs.source,
                              supported: isCodecSupported(rep.codecs.value),
                          },
                      ]
                    : [],
                scanType: null,
                videoRange: rep.videoRange || null,
                roles: [],
                // @ts-ignore
                __variantUri: rep.__variantUri,
            }))
        );

    // --- ENRICHMENT STEP ---
    if (context?.fetchAndParseSegment && isMaster) {
        for (const track of videoTracks) {
            // @ts-ignore
            const variantUri = track.__variantUri;
            if (track.resolutions.length === 0 && variantUri) {
                try {
                    const mediaPlaylistResponse = await fetch(variantUri);
                    if (!mediaPlaylistResponse.ok) continue;
                    const mediaPlaylistText =
                        await mediaPlaylistResponse.text();

                    const firstSegmentLine = mediaPlaylistText
                        .split('\n')
                        .find((line) => line.trim() && !line.startsWith('#'));

                    if (firstSegmentLine) {
                        const segmentUrl = new URL(
                            firstSegmentLine.trim(),
                            variantUri
                        ).href;
                        const parsedSegment =
                            await context.fetchAndParseSegment(
                                segmentUrl,
                                'isobmff'
                            );

                        if (
                            parsedSegment?.format === 'isobmff' &&
                            parsedSegment.data?.boxes
                        ) {
                            const videoBox = findBoxRecursive(
                                parsedSegment.data.boxes,
                                (box) =>
                                    ['avc1', 'hvc1', 'hev1'].includes(box.type)
                            );
                            if (
                                videoBox &&
                                videoBox.details.width &&
                                videoBox.details.height
                            ) {
                                track.resolutions.push({
                                    value: `${videoBox.details.width.value}x${videoBox.details.height.value}`,
                                    source: 'segment',
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.warn(
                        `[HLS Enrichment] Failed to get resolution for ${variantUri}: ${e.message}`
                    );
                }
            }
        }
    }
    videoTracks.forEach((track) => {
        // @ts-ignore
        delete track.__variantUri;
    });
    // --- END ENRICHMENT ---

    const audioTracks = allAdaptationSets
        .filter((as) => as.contentType === 'audio')
        .map((as) => {
            const codecs = as.representations[0]?.codecs.value
                ? [
                      {
                          value: as.representations[0].codecs.value,
                          source: as.representations[0].codecs.source,
                      },
                  ]
                : [];
            return {
                id: as.stableRenditionId || as.id,
                lang: as.lang,
                codecs: codecs.map((c) => ({
                    value: c.value,
                    source: c.source,
                    supported: isCodecSupported(c.value),
                })),
                channels: as.channels,
                isDefault:
                    /** @type {any} */ (as.serializedManifest).DEFAULT === 'YES',
                isForced: as.forced,
                roles: [],
            };
        });

    const textTracks = allAdaptationSets
        .filter(
            (as) => as.contentType === 'text' || as.contentType === 'subtitles'
        )
        .map((as) => {
            const mimeTypes = as.representations[0]?.codecs?.value ||
                as.representations[0]?.mimeType
                ? [
                      {
                          value:
                              as.representations[0].codecs?.value ||
                              as.representations[0].mimeType,
                          source:
                              as.representations[0].codecs?.value ? 'manifest' : 'mimeType',
                      },
                  ]
                : [];
            return {
                id: as.stableRenditionId || as.id,
                lang: as.lang,
                codecsOrMimeTypes: mimeTypes.map(
                    (v) =>
                        /** @type {import('@/types').CodecInfo} */ ({
                            value: v.value,
                            source: v.source,
                            supported: isCodecSupported(v.value),
                        })
                ),
                isDefault:
                    /** @type {any} */ (as.serializedManifest).DEFAULT === 'YES',
                isForced: as.forced,
                roles: [],
            };
        });

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
            segmentFormat: manifestIR.segmentFormat.toLowerCase(),
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
            dvrWindow: manifestIR.type === 'dynamic' ? manifestIR.duration : null,
            hlsParsed: rawElement,
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