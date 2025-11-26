/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').PeriodSummary} PeriodSummary
 * @typedef {import('@/types.ts').SecuritySummary} SecuritySummary
 * @typedef {import('@/types.ts').VideoTrackSummary} VideoTrackSummary
 * @typedef {import('@/types.ts').CodecInfo} CodecInfo
 */

import { isCodecSupported } from '../utils/codec-support.js';
import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm.js';
import { determineSegmentFormat } from '../utils/media-types.js';

const isAudioCodec = (codecString) => {
    if (!codecString) return false;
    const lowerCodec = codecString.toLowerCase();
    const audioPrefixes = ['mp4a', 'ac-3', 'ec-3', 'opus', 'flac'];
    return audioPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
};

/**
 * Creates a protocol-agnostic summary view-model from an HLS manifest.
 * This is now a purely synchronous function.
 * @param {import('@/types.ts').Manifest} manifestIR - The adapted manifest IR.
 * @param {object} [context] - Context for enrichment.
 * @returns {Promise<{summary: import('@/types.ts').ManifestSummary, opportunisticallyCachedSegments: any[]}>}
 */
export async function generateHlsSummary(manifestIR, context) {
    const { serializedManifest: rawElement } = manifestIR;
    const { mediaPlaylists } = context || {};
    const isMaster = manifestIR.isMaster;

    let segmentFormat = manifestIR.segmentFormat;
    let targetDuration = manifestIR.minBufferTime;
    let totalDuration = manifestIR.duration;

    // --- ARCHITECTURAL FIX: Derive Duration & Stats from Media Playlists ---
    // For a Master Playlist, the top-level IR has no segments and thus 0 duration.
    // We must inspect the fetched media playlists to calculate these values.
    let validMediaManifest = null;

    if (isMaster && mediaPlaylists && mediaPlaylists.size > 0) {
        // Prefer the highest bandwidth variant for representative stats
        const highestBwVariant = (manifestIR.variants || []).sort(
            (a, b) => b.attributes.BANDWIDTH - a.attributes.BANDWIDTH
        )[0];

        if (highestBwVariant) {
            const playlistData = mediaPlaylists.get(highestBwVariant.stableId);
            validMediaManifest = playlistData?.manifest;
        }

        // Fallback to first available if variant mapping failed
        if (!validMediaManifest) {
            const firstPlaylist = mediaPlaylists.values().next().value;
            validMediaManifest = firstPlaylist?.manifest;
        }

        if (validMediaManifest) {
            const mediaPlaylistParsed = validMediaManifest.serializedManifest;

            if (segmentFormat === 'unknown') {
                segmentFormat = determineSegmentFormat(mediaPlaylistParsed);
            }

            // Use the target duration from the media playlist
            targetDuration = mediaPlaylistParsed.targetDuration;

            // If the master didn't have a duration (VOD), use the media playlist's duration
            if (!totalDuration || totalDuration === 0) {
                totalDuration = validMediaManifest.duration;
            }
        }
    }

    let dvrWindow = null;
    if (manifestIR.type === 'dynamic') {
        if (isMaster && validMediaManifest) {
            dvrWindow = validMediaManifest.duration;
        } else {
            dvrWindow = manifestIR.duration;
        }
    }

    const allKeyTags = new Set();
    const opportunisticallyCachedSegments = [];

    (manifestIR.tags || []).forEach((tag) => {
        if (tag.name === 'EXT-X-KEY' || tag.name === 'EXT-X-SESSION-KEY') {
            allKeyTags.add(JSON.stringify(tag.value));
        }
    });

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

    const videoTracks = (allVideoAdaptationSets || []).flatMap((as) => {
        return as.representations.map((rep) => {
            const resolutions = [];
            if (rep.width?.value && rep.height?.value) {
                resolutions.push({
                    value: `${rep.width.value}x${rep.height.value}`,
                    source: rep.width.source,
                });
            } else if (rep.serializedManifest?.attributes?.RESOLUTION) {
                resolutions.push(
                    /** @type {import('@/types.ts').SourcedData<string>} */({
                        value: rep.serializedManifest.attributes.RESOLUTION,
                        source: 'manifest',
                    })
                );
            }

            const videoTrack = /** @type {VideoTrackSummary} */ ({
                id: rep.id,
                profiles: null,
                bandwidth: rep.bandwidth,
                manifestBandwidth: rep.manifestBandwidth,
                frameRate: rep.frameRate || null,
                resolutions,
                codecs: rep.codecs,
                scanType: null,
                videoRange: null,
                roles: as.roles,
                __variantUri: rep.__variantUri,
                muxedAudio: rep.muxedAudio,
            });

            return videoTrack;
        });
    });

    const audioTracks = (allAudioAdaptationSets || []).map((as) => {
        const codecsMap = new Map();
        const channelsSet = new Set();

        as.representations.forEach((r) => {
            (r.codecs || []).forEach((codecInfo) => {
                if (codecInfo.value && !codecsMap.has(codecInfo.value)) {
                    codecsMap.set(codecInfo.value, codecInfo);
                }
            });
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
                /** @type {any} */ (as.serializedManifest)?.value?.DEFAULT ===
                'YES',
            isForced: as.forced,
            roles: as.roles,
            bandwidth: as.representations[0]?.bandwidth || 0,
        };
    });

    const textTracks = allTextAdaptationSets.map((as) => {
        const mimeTypes =
            as.representations[0]?.codecs?.[0]?.value ||
                as.representations[0]?.mimeType
                ? [
                    {
                        value:
                            as.representations[0].codecs?.[0]?.value ||
                            as.representations[0].mimeType,
                        source: as.representations[0].codecs?.[0]
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
                    /** @type {import('@/types.ts').CodecInfo} */({
                    value: v.value,
                    source: v.source,
                    supported: isCodecSupported(v.value),
                })
            ),
            isDefault:
                /** @type {any} */ (as.serializedManifest).value?.DEFAULT ===
                'YES',
            isForced: as.forced,
            roles: as.roles,
        };
    });

    const parsedKeyTags = Array.from(allKeyTags).map((tagStr) =>
        JSON.parse(/** @type {string} */(tagStr))
    );
    const contentProtectionIRs = parsedKeyTags
        .filter((value) => value.METHOD && value.METHOD !== 'NONE')
        .map((value) => {
            const schemeIdUri = value.KEYFORMAT || 'identity';
            return {
                schemeIdUri: schemeIdUri,
                system: getDrmSystemName(schemeIdUri) || value.METHOD,
                defaultKid: value.KEYID || null,
                robustness: null,
            };
        });

    const security = /** @type {SecuritySummary} */ ({
        isEncrypted: contentProtectionIRs.length > 0,
        systems: contentProtectionIRs.map(
            (cp) =>
                /** @type {import('@/types').PsshInfo} */({
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

    const statsSource = !isMaster ? manifestIR : validMediaManifest;

    if (statsSource) {
        const segmentCount = statsSource.segments.length;
        // Use the calculated totalDuration from above (which handles the Master case)
        const durationForCalc = !isMaster
            ? statsSource.duration
            : totalDuration;

        const isIFrameOnly = (statsSource.tags || []).some(
            (t) => t.name === 'EXT-X-I-FRAMES-ONLY'
        );

        mediaPlaylistDetails = {
            segmentCount: segmentCount,
            averageSegmentDuration:
                segmentCount > 0 && durationForCalc > 0
                    ? durationForCalc / segmentCount
                    : 0,
            hasDiscontinuity: (statsSource.segments || []).some(
                (s) => s.discontinuity
            ),
            isIFrameOnly: isIFrameOnly,
        };
    }

    // Correctly cast rawElement to any before accessing internal HLS properties
    const iFramePlaylists = (/** @type {any} */ (rawElement)).iframeStreams?.length || 0;

    const periodSummaries = manifestIR.periods.map((period) => ({
        id: period.id,
        start: period.start,
        duration: period.duration,
        adaptationSets: period.adaptationSets.map((as) => ({
            id: as.id,
            contentType: as.contentType,
            lang: as.lang,
            mimeType: as.mimeType,
            representationCount: as.representations.length,
        })),
    }));

    const hasMuxedAudio = (allVideoAdaptationSets || []).some((as) =>
        as.representations.some((rep) =>
            (rep.codecs || []).some((c) => isAudioCodec(c.value))
        )
    );

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
            duration: totalDuration, // Use the resolved duration
            segmentFormat: segmentFormat.toLowerCase(),
            title: null,
            locations: [],
            segmenting: 'Segment List',
        },
        dash: null,
        hls: {
            version: /** @type {any} */ (rawElement).version,
            targetDuration: targetDuration,
            iFramePlaylists: iFramePlaylists,
            mediaPlaylistDetails,
            dvrWindow: dvrWindow,
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
            totalPeriods: manifestIR.periods.length,
            totalVideoTracks: videoTracks.length,
            // Include muxed audio in the count logic if explicit audio tracks are 0
            totalAudioTracks:
                (allAudioAdaptationSets || []).length +
                (hasMuxedAudio && audioTracks.length === 0 ? 1 : 0),
            totalTextTracks: textTracks.length,
            mediaPlaylists: isMaster ? (manifestIR.variants || []).length : 1,
            periods: periodSummaries,
        },
        videoTracks,
        audioTracks,
        textTracks,
        security,
    };

    return { summary, opportunisticallyCachedSegments };
}