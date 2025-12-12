/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').PeriodSummary} PeriodSummary
 * @typedef {import('@/types.ts').SecuritySummary} SecuritySummary
 * @typedef {import('@/types.ts').VideoTrackSummary} VideoTrackSummary
 * @typedef {import('@/types.ts').CodecInfo} CodecInfo
 */

import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm.js';
import { isCodecSupported } from '../utils/codec-support.js';
import { determineSegmentFormat } from '../utils/media-types.js';
// import { appLog } from '@/shared/utils/debug';

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

    let validMediaManifest = null;

    if (isMaster && mediaPlaylists && mediaPlaylists.size > 0) {
        const highestBwVariant = (manifestIR.variants || []).sort(
            (a, b) => b.attributes.BANDWIDTH - a.attributes.BANDWIDTH
        )[0];

        if (highestBwVariant) {
            const playlistData = mediaPlaylists.get(highestBwVariant.stableId);
            validMediaManifest = playlistData?.manifest;
        }

        if (!validMediaManifest) {
            const firstPlaylist = mediaPlaylists.values().next().value;
            validMediaManifest = firstPlaylist?.manifest;
        }

        if (validMediaManifest) {
            const mediaPlaylistParsed = validMediaManifest.serializedManifest;

            if (segmentFormat === 'unknown') {
                segmentFormat = determineSegmentFormat(mediaPlaylistParsed);
            }

            targetDuration = mediaPlaylistParsed.targetDuration;

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
                label: rep.label || rep.serializedManifest?.attributes?.NAME || null,
                format: rep.format,
                profiles: null,
                bandwidth: rep.bandwidth,
                manifestBandwidth: rep.manifestBandwidth,
                frameRate: rep.frameRate || null,
                resolutions,
                codecs: rep.codecs,
                scanType: null,
                videoRange: rep.videoRange, // HLS Video Range
                sar: null, // HLS doesn't carry SAR in playlist typically
                codingDependency: null,
                maxPlayoutRate: null,
                roles: as.roles,
                __variantUri: rep.__variantUri,
                muxedAudio: rep.muxedAudio,
            });

            return videoTrack;
        });
    });

    const audioTracks = (allAudioAdaptationSets || []).flatMap((as) => {
        return as.representations.map((rep) => {
            const serialized = /** @type {any} */ (rep.serializedManifest);
            const attributes = serialized?.value || {};

            let sampleRate = null;
            if (attributes['SAMPLE-RATE']) {
                sampleRate = parseInt(attributes['SAMPLE-RATE'], 10);
            }

            let channels = null;
            if (attributes.CHANNELS) {
                channels = attributes.CHANNELS;
            }

            return {
                id: rep.id,
                label: attributes.NAME || rep.id,
                format: rep.format,
                lang: rep.lang || as.lang,
                codecs: rep.codecs || [],
                channels: channels,
                sampleRate: sampleRate,
                isDefault: attributes.DEFAULT === 'YES',
                isForced: attributes.FORCED === 'YES',
                roles: rep.roles || as.roles,
                bandwidth: rep.bandwidth || 0,
            };
        });
    });

    // Check for Muxed Audio (Always check, even if explicit tracks exist)
    // REMOVED: User requested to not add muxed audio as a general extra track.
    /*
    if (videoTracks.length > 0) {
        const muxedCodecs = new Set();
        const isAudioCodec = (codecString) => {
            if (!codecString) return false;
            const lowerCodec = codecString.toLowerCase();
            const audioPrefixes = ['mp4a', 'ac-3', 'ec-3', 'opus', 'flac'];
            return audioPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
        };

        videoTracks.forEach(vt => {
            // Check explicit codecs
            (vt.codecs || []).forEach(c => {
                if (isAudioCodec(c.value)) {
                    muxedCodecs.add(c.value);
                }
            });

            // Check pre-parsed muxedAudio from adapter
            if (vt.muxedAudio && vt.muxedAudio.codecs) {
                vt.muxedAudio.codecs.forEach(c => {
                    if (isAudioCodec(c.value)) {
                        muxedCodecs.add(c.value);
                    }
                });
            }
        });

        if (muxedCodecs.size > 0) {
            // Create a virtual audio track for the muxed audio

            const muxedTrack = {
                id: 'muxed-audio',
                label: 'Muxed',
                lang: 'und',
                codecs: Array.from(muxedCodecs).map(c => ({ value: c, source: 'variant' })),
                channels: null,
                sampleRate: null,
                isDefault: audioTracks.length === 0,
                isForced: false,
                roles: [],
                bandwidth: 0,
                isMuxed: true
            };

            // Add to audio tracks if not already present
            if (!audioTracks.some(t => t.id === 'muxed-audio')) {
                audioTracks.push(muxedTrack);
            }
        }
    }
    */
    const textTracks = allTextAdaptationSets.map((as) => {
        const serialized = /** @type {any} */ (as.serializedManifest);
        const rep = as.representations[0]; // Assuming one rep per text AS in HLS
        const mimeTypes =
            rep?.codecs?.[0]?.value ||
                rep?.mimeType
                ? [
                    {
                        value:
                            rep.codecs?.[0]?.value ||
                            rep.mimeType,
                        source: rep.codecs?.[0]
                            ? 'manifest'
                            : 'mimeType',
                    },
                ]
                : [];
        return {
            id: as.stableRenditionId || as.id,
            label: rep?.label || as.lang,
            format: rep?.format,
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
                serialized.value?.DEFAULT === 'YES',
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
        const durationForCalc = !isMaster
            ? statsSource.duration
            : totalDuration;

        const isIFrameOnly = (statsSource.tags || []).some(
            (t) => t.name === 'EXT-X-I-FRAMES-ONLY'
        );

        let lastSegmentDuration = null;
        if (segmentCount > 0) {
            const lastSeg = statsSource.segments[segmentCount - 1];
            if (lastSeg) lastSegmentDuration = lastSeg.duration;
        }

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
            lastSegmentDuration: lastSegmentDuration,
        };
    }

    const iFramePlaylists =
        /** @type {any} */ (rawElement).iframeStreams?.length || 0;

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
            duration: totalDuration,
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
        advanced: null,
        cmafData: { status: 'idle', results: [] },
    };

    return { summary, opportunisticallyCachedSegments };
}