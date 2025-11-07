/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').PeriodSummary} PeriodSummary
 * @typedef {import('@/types.ts').SecuritySummary} SecuritySummary
 */

import { formatBitrate } from '@/ui/shared/format';
import { isCodecSupported } from '../utils/codec-support.js';
import { getDrmSystemName } from '../utils/drm.js';

/**
 * Creates a protocol-agnostic summary view-model from an HLS manifest.
 * @param {Manifest} manifestIR - The adapted manifest IR.
 * @param {object} [context] - Context for enrichment.
 * @param {string} [context.baseUrl] - The base URL for resolving relative segment paths.
 * @param {Function} [context.fetchWithAuth] - Function to fetch a URL with auth.
 * @param {Function} [context.parseHlsManifest] - Function to parse an HLS manifest string.
 * @returns {Promise<import('@/types.ts').ManifestSummary>}
 */
export async function generateHlsSummary(manifestIR, context) {
    const { serializedManifest: rawElement } = manifestIR;
    const isMaster = manifestIR.isMaster;
    let mediaPlaylistIRForEnrichment = null;

    // --- ENRICHMENT STEP ---
    if (isMaster && context?.fetchWithAuth && context?.parseHlsManifest) {
        const firstVariant = manifestIR.variants?.[0];
        if (firstVariant?.resolvedUri) {
            try {
                const response = await context.fetchWithAuth(
                    firstVariant.resolvedUri
                );
                const mediaPlaylistString = await response.text();
                const { manifest: mediaPlaylistIR } =
                    await context.parseHlsManifest(
                        mediaPlaylistString,
                        firstVariant.resolvedUri,
                        manifestIR.hlsDefinedVariables
                    );

                mediaPlaylistIRForEnrichment = mediaPlaylistIR;

                // Enrich the master manifest IR with data from the media playlist
                manifestIR.duration = mediaPlaylistIR.duration;
                manifestIR.minBufferTime = mediaPlaylistIR.minBufferTime; // This is targetDuration
                (manifestIR.tags = manifestIR.tags || []).push(
                    ...(mediaPlaylistIR.tags || [])
                );
                manifestIR.segments = mediaPlaylistIR.segments;
                manifestIR.type = mediaPlaylistIR.type;
            } catch (e) {
                console.warn(
                    `[HLS Summary Enrichment] Failed to fetch or parse media playlist: ${e.message}`
                );
            }
        }
    }
    // --- END ENRICHMENT ---

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
                roles: as.roles.map((r) => r.value),
                __variantUri: rep.__variantUri,
            }))
        );

    videoTracks.forEach((track) => {
        // @ts-ignore
        delete track.__variantUri;
    });

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
                    /** @type {any} */ (as.serializedManifest).DEFAULT ===
                    'YES',
                isForced: false,
                roles: [],
            };
        });

    const textTracks = allAdaptationSets
        .filter(
            (as) => as.contentType === 'text' || as.contentType === 'subtitles'
        )
        .map((as) => {
            const mimeTypes =
                as.representations[0]?.codecs?.value ||
                as.representations[0]?.mimeType
                    ? [
                          {
                              value:
                                  as.representations[0].codecs?.value ||
                                  as.representations[0].mimeType,
                              source: as.representations[0].codecs?.value
                                  ? 'manifest'
                                  : 'mimeType',
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
                    /** @type {any} */ (as.serializedManifest).DEFAULT ===
                    'YES',
                isForced: as.forced,
                roles: [],
            };
        });

    const keyTagsFromMaster = (manifestIR.tags || []).filter(
        (t) => t.name === 'EXT-X-KEY' || t.name === 'EXT-X-SESSION-KEY'
    );
    const keyTagsFromMedia =
        mediaPlaylistIRForEnrichment?.tags?.filter(
            (t) => t.name === 'EXT-X-KEY'
        ) || [];
    const allKeyTags = [...keyTagsFromMaster, ...keyTagsFromMedia];

    const contentProtectionIRs = allKeyTags
        .filter((tag) => tag.value.METHOD && tag.value.METHOD !== 'NONE')
        .map((tag) => {
            const schemeIdUri = tag.value.KEYFORMAT || 'identity';
            return {
                schemeIdUri: schemeIdUri,
                system: getDrmSystemName(schemeIdUri) || tag.value.METHOD,
                defaultKid: tag.value.KEYID || null,
            };
        });

    const security = /** @type {SecuritySummary} */ ({
        isEncrypted: contentProtectionIRs.length > 0,
        systems: contentProtectionIRs.map(
            (cp) =>
                /** @type {import('@/types').PsshInfo} */ ({
                    systemId: cp.schemeIdUri,
                    kids: cp.defaultKid ? [cp.defaultKid] : [],
                })
        ),
        kids: [
            ...new Set(
                contentProtectionIRs.map((cp) => cp.defaultKid).filter(Boolean)
            ),
        ],
        hlsEncryptionMethod: null,
    });

    if (security.isEncrypted) {
        const methods = new Set(contentProtectionIRs.map((cp) => cp.system));
        if (methods.has('SAMPLE-AES')) {
            security.hlsEncryptionMethod = 'SAMPLE-AES';
        } else if (methods.has('AES-128')) {
            security.hlsEncryptionMethod = 'AES-128';
        } else if (methods.size > 0) {
            security.hlsEncryptionMethod = [...methods][0];
        }
    }

    let mediaPlaylistDetails = null;
    if (!isMaster || manifestIR.segments?.length > 0) {
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
                    : 'text-blue-500',
            duration: manifestIR.duration,
            segmentFormat: manifestIR.segmentFormat.toLowerCase(),
            title: null,
            locations: [],
            segmenting: 'Segment List',
        },
        dash: null,
        hls: {
            version: /** @type {any} */ (rawElement).version,
            targetDuration: /** @type {any} */ (manifestIR).minBufferTime,
            iFramePlaylists: iFramePlaylists,
            mediaPlaylistDetails,
            dvrWindow:
                manifestIR.type === 'dynamic' ? manifestIR.duration : null,
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
