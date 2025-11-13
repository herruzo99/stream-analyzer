/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').PeriodSummary} PeriodSummary
 * @typedef {import('@/types.ts').SecuritySummary} SecuritySummary
 * @typedef {import('@/types.ts').VideoTrackSummary} VideoTrackSummary
 * @typedef {import('@/types.ts').CodecInfo} CodecInfo
 */

import { findChildrenRecursive, resolveBaseUrl } from '@/infrastructure/parsing/dash/recursive-parser';
import { formatBitrate } from '@/ui/shared/format';
import { findInitSegmentUrl } from '@/infrastructure/parsing/dash/segment-parser.js';
import { isCodecSupported } from '../utils/codec-support.js';
import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm.js';
import { determineSegmentFormat } from './adapter.js';
import { appLog } from '@/shared/utils/debug';
import { parseSPS } from '../video/sps.js';

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
 * @param {import('@/types.ts').Manifest} manifestIR - The adapted manifest IR.
 * @param {object} [context] - Context for enrichment.
 * @param {string} [context.manifestUrl] - The base URL for resolving relative segment paths.
 * @param {Function} [context.fetchWithAuth] - Function to fetch a URL with auth.
 * @param {Function} [context.parseHlsManifest] - Function to parse an HLS manifest string.
 * @param {Function} [context.fetchAndParseSegment] - Function to fetch and parse a segment.
 * @returns {Promise<{summary: import('@/types.ts').ManifestSummary, opportunisticallyCachedSegments: any[]}>}
 */
export async function generateHlsSummary(manifestIR, context) {
    const { serializedManifest: rawElement } = manifestIR;
    const isMaster = manifestIR.isMaster;
    const allKeyTags = new Set();
    let enrichmentComplete = false;
    const opportunisticallyCachedSegments = [];

    const isVideoCodec = (codecString) => {
        if (!codecString) return false;
        const lowerCodec = codecString.toLowerCase();
        const videoPrefixes = [
            'avc1',
            'avc3',
            'hvc1',
            'hev1',
            'mp4v',
            'dvh1',
            'dvhe',
            'av01',
            'vp09',
        ];
        return videoPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
    };

    const isAudioCodec = (codecString) => {
        if (!codecString) return false;
        const lowerCodec = codecString.toLowerCase();
        const audioPrefixes = ['mp4a', 'ac-3', 'ec-3', 'opus', 'flac'];
        return audioPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
    };

    // --- ENRICHMENT STEP ---
    if (isMaster && context?.fetchWithAuth && context?.parseHlsManifest) {
        let finalSegmentFormat = determineSegmentFormat(rawElement);

        const enrichmentPromises = (manifestIR.variants || []).map(
            async (variant) => {
                if (!variant.resolvedUri) return;
                try {
                    const res = await context.fetchWithAuth(variant.resolvedUri);
                    if (!res.ok) return;
                    const text = await res.text();
                    const { manifest: mediaPlaylistIR } =
                        await context.parseHlsManifest(
                            text,
                            variant.resolvedUri,
                            manifestIR.hlsDefinedVariables
                        );

                    if (!enrichmentComplete) {
                        manifestIR.duration = mediaPlaylistIR.duration;
                        manifestIR.minBufferTime =
                            mediaPlaylistIR.minBufferTime;
                        finalSegmentFormat = mediaPlaylistIR.segmentFormat;
                        enrichmentComplete = true;
                    }

                    (mediaPlaylistIR.tags || []).forEach((tag) => {
                        if (
                            tag.name === 'EXT-X-KEY' ||
                            tag.name === 'EXT-X-SESSION-KEY'
                        ) {
                            allKeyTags.add(JSON.stringify(tag.value)); // Use stringify for object comparison
                        }
                    });

                    const repToUpdate = manifestIR.periods[0]?.adaptationSets
                        .flatMap((as) => as.representations)
                        .find((r) => r.__variantUri === variant.resolvedUri);

                    if (!repToUpdate) return;

                    const needsResolution =
                        !repToUpdate.width.value &&
                        isVideoCodec(repToUpdate.codecs.value);

                    if (needsResolution && context.fetchAndParseSegment) {
                        const firstSegment = mediaPlaylistIR.segments?.[0];
                        if (!firstSegment) return;
                        const { parsedData, rawBuffer } =
                            await context.fetchAndParseSegment(
                                firstSegment.resolvedUrl,
                                finalSegmentFormat,
                                firstSegment.byteRange
                                    ? `${firstSegment.byteRange.offset}-${
                                          firstSegment.byteRange.offset +
                                          firstSegment.byteRange.length -
                                          1
                                      }`
                                    : null
                            );

                        opportunisticallyCachedSegments.push({
                            uniqueId: firstSegment.uniqueId,
                            data: rawBuffer,
                            parsedData: parsedData,
                            status: 200,
                        });

                        let width = null,
                            height = null,
                            frameRate = null;
                        if (parsedData?.mediaInfo?.video) {
                            [width, height] = parsedData.mediaInfo.video.resolution.split('x').map(Number);
                            frameRate = parsedData.mediaInfo.video.frameRate;
                        }


                        if (width && height) {
                            repToUpdate.width = { value: width, source: 'segment' };
                            repToUpdate.height = { value: height, source: 'segment' };
                        }

                        if (frameRate) {
                            repToUpdate.frameRate = frameRate;
                        }
                    }
                } catch (e) {
                    console.warn(
                        `[HLS Summary Enrichment] Failed for variant ${variant.resolvedUri}: ${e.message}`
                    );
                }
            }
        );
        await Promise.all(enrichmentPromises);
        manifestIR.segmentFormat = finalSegmentFormat;
    } else {
        (manifestIR.tags || []).forEach((tag) => {
            if (
                tag.name === 'EXT-X-KEY' ||
                tag.name === 'EXT-X-SESSION-KEY'
            ) {
                allKeyTags.add(JSON.stringify(tag.value));
            }
        });
    }
    // --- END ENRICHMENT ---

    const allAdaptationSets = manifestIR.periods.flatMap(
        (p) => p.adaptationSets
    );

    const allVideoAdaptationSets = allAdaptationSets.filter(
        (as) => as.contentType === 'video'
    );
    const allAudioAdaptationSets = allAdaptationSets.filter(
        (as) => as.contentType === 'audio'
    );
    const allTextAdaptationSets = allAdaptationSets.filter(
        (as) => as.contentType === 'text' || as.contentType === 'subtitles'
    );

    const videoTracks = allVideoAdaptationSets
        .flatMap((as) =>
            as.representations.map((rep) => {
                /** @type {import('@/types.ts').SourcedData<string>[]} */
                const resolutions = [];
                if (rep.width?.value && rep.height?.value) {
                    resolutions.push({
                        value: `${rep.width.value}x${rep.height.value}`,
                        source: rep.width.source, // 'segment' or 'manifest'
                    });
                } else if (
                    rep.serializedManifest?.attributes?.RESOLUTION
                ) {
                    resolutions.push(
                        /** @type {import('@/types.ts').SourcedData<string>} */ ({
                            value: rep.serializedManifest.attributes.RESOLUTION,
                            source: 'manifest',
                        })
                    );
                }

                const codecString = rep.codecs.value || '';
                const allCodecs = codecString
                    .split(',')
                    .map((c) => c.trim())
                    .filter(Boolean);

                return /** @type {VideoTrackSummary} */ ({
                    id: rep.stableVariantId || rep.id,
                    profiles: null,
                    bandwidth: rep.bandwidth,
                    manifestBandwidth: rep.manifestBandwidth,
                    frameRate: rep.frameRate || null,
                    resolutions,
                    codecs: allCodecs.map(
                        (vc) =>
                            /** @type {CodecInfo} */ ({
                                value: vc,
                                source: 'manifest',
                                supported: isCodecSupported(vc),
                            })
                    ),
                    scanType: null,
                    videoRange: rep.videoRange || null,
                    roles: as.roles.map((r) => r.value).filter(Boolean),
                    __variantUri: rep.__variantUri,
                });
            })
        );

    const audioTracks = allAudioAdaptationSets.map((as) => {
        const codecsMap = new Map();
        const channelsSet = new Set();

        as.representations.forEach((r) => {
            if (r.codecs.value && !codecsMap.has(r.codecs.value)) {
                codecsMap.set(r.codecs.value, {
                    value: r.codecs.value,
                    source: r.codecs.source,
                    supported: isCodecSupported(r.codecs.value),
                });
            }
        });

        if (as.channels) {
            channelsSet.add(as.channels);
        }

        const codecs = Array.from(codecsMap.values());
        const channels = Array.from(channelsSet);

        return {
            id: as.stableRenditionId || as.id,
            lang: as.lang,
            codecs: codecs,
            channels: channels.join(', ') || null,
            isDefault:
                /** @type {any} */ (as.serializedManifest)?.DEFAULT === 'YES',
            isForced: false,
            roles: as.roles.map((r) => r.value).filter(Boolean),
            bandwidth: as.representations[0]?.bandwidth || 0,
        };
    });

    // --- REFACTORED: Muxed Audio Enrichment ---
    const muxedVariants = (manifestIR.variants || []).filter(
        (v) => v.attributes.CODECS?.includes('mp4a') && !v.attributes.AUDIO
    );

    if (muxedVariants.length > 0) {
        for (const videoTrack of videoTracks) {
            const variant = muxedVariants.find(
                (v) => v.resolvedUri === videoTrack.__variantUri
            );
            if (variant) {
                const audioCodecInfo = (videoTrack.codecs || []).find((c) =>
                    isAudioCodec(c.value)
                );

                videoTrack.muxedAudio = {
                    codecs: audioCodecInfo ? [audioCodecInfo] : [],
                    channels: null, // Initially unknown
                    lang: null, // Initially unknown
                };

                // Now, try to enhance with segment data if we have it
                const firstMuxedSegment = opportunisticallyCachedSegments.find(
                    (segment) =>
                        segment.uniqueId.startsWith(
                            new URL(variant.uri, context.manifestUrl).href
                        )
                );

                if (firstMuxedSegment?.parsedData?.mediaInfo?.audio) {
                    const audioInfo =
                        firstMuxedSegment.parsedData.mediaInfo.audio;
                    videoTrack.muxedAudio.lang = audioInfo.language || 'und';
                    videoTrack.muxedAudio.channels = audioInfo.channels;
                }
            }
        }
    }
    // --- END REFACTOR ---

    const textTracks = allTextAdaptationSets
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

    const parsedKeyTags = Array.from(allKeyTags).map((tagStr) =>
        JSON.parse(/** @type {string} */ (tagStr))
    );
    const contentProtectionIRs = parsedKeyTags
        .filter((value) => value.METHOD && value.METHOD !== 'NONE')
        .map((value) => {
            const schemeIdUri = value.KEYFORMAT || 'identity';
            return {
                schemeIdUri: schemeIdUri,
                system: getDrmSystemName(schemeIdUri) || value.METHOD,
                defaultKid: value.KEYID || null,
                robustness: null, // HLS does not define robustness in this context
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
        if (methods.has('FairPlay')) {
            security.hlsEncryptionMethod = 'FairPlay';
        } else if (methods.has('SAMPLE-AES')) {
            security.hlsEncryptionMethod = 'SAMPLE-AES';
        } else if (methods.has('AES-128')) {
            security.hlsEncryptionMethod = 'AES-128';
        } else if (methods.size > 0) {
            security.hlsEncryptionMethod = [...methods][0];
        }
    }

    let mediaPlaylistDetails = null;
    if (!isMaster) {
        const segmentCount = manifestIR.segments.length;
        const totalDuration = manifestIR.duration;
        const isIFrameOnly = (manifestIR.tags || []).some(
            (t) => t.name === 'EXT-X-I-FRAMES-ONLY'
        );

        mediaPlaylistDetails = {
            segmentCount: segmentCount,
            averageSegmentDuration:
                segmentCount > 0 ? totalDuration / segmentCount : 0,
            hasDiscontinuity: (manifestIR.segments || []).some(
                (s) => s.discontinuity
            ),
            isIFrameOnly: isIFrameOnly,
        };
    }

    const iFramePlaylists =
        (/** @type {any} */ (rawElement).iframeStreams || []).length;

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

    return { summary, opportunisticallyCachedSegments };
}