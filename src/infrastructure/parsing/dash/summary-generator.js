/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').PeriodSummary} PeriodSummary
 * @typedef {import('@/types.ts').SecuritySummary} SecuritySummary
 */

import {
    findChildrenRecursive,
    resolveBaseUrl,
} from '../utils/recursive-parser.js';

import { isCodecSupported } from '../utils/codec-support.js';
import { findInitSegmentUrl } from './segment-parser.js';

// import { appLog } from '@/shared/utils/debug';

const getSegmentingStrategy = (serializedManifest) => {
    if (!serializedManifest) return 'unknown';
    if (findChildrenRecursive(serializedManifest, 'SegmentList').length > 0)
        return 'SegmentList';
    const template = findChildrenRecursive(
        serializedManifest,
        'SegmentTemplate'
    )[0];
    if (template) {
        if (findChildrenRecursive(template, 'SegmentTimeline').length > 0)
            return 'SegmentTemplate with SegmentTimeline';
        if (template[':@']?.media?.includes('$Number$'))
            return 'SegmentTemplate with $Number$';
        if (template[':@']?.media?.includes('$Time$'))
            return 'SegmentTemplate with $Time$';
        return 'SegmentTemplate';
    }
    if (findChildrenRecursive(serializedManifest, 'SegmentBase').length > 0)
        return 'SegmentBase';
    if (findChildrenRecursive(serializedManifest, 'BaseURL').length > 0)
        return 'BaseURL / Single Segment';
    return 'Unknown';
};

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

const calculateMaxSegmentDuration = (serializedManifest) => {
    const template = findChildrenRecursive(
        serializedManifest,
        'SegmentTemplate'
    )[0];
    if (!template) return null;

    const timescale = parseInt(template[':@']?.timescale || '1', 10);
    const duration = template[':@']?.duration
        ? parseInt(template[':@']?.duration, 10)
        : null;

    if (duration) {
        return duration / timescale;
    }

    const timeline = findChildrenRecursive(template, 'SegmentTimeline')[0];
    if (timeline) {
        const sElements = findChildrenRecursive(timeline, 'S');
        let maxDuration = 0;
        for (const s of sElements) {
            const d = parseInt(s[':@']?.d || '0', 10);
            if (d > maxDuration) maxDuration = d;
        }
        return maxDuration > 0 ? maxDuration / timescale : null;
    }

    return null;
};

/**
 * Creates a protocol-agnostic summary view-model from a DASH manifest.
 * @param {Manifest} manifestIR - The adapted manifest IR.
 * @param {object} serializedManifest - The serialized manifest DOM object.
 * @param {{fetchAndParseSegment: Function, manifestUrl: string, onInitSegmentParsed?: Function, onSegmentFetched?: Function}} [context] - Context for enrichment.
 * @returns {Promise<import('@/types.ts').ManifestSummary>}
 */
export async function generateDashSummary(
    manifestIR,
    serializedManifest,
    context
) {
    const securitySystems = new Map();

    if (manifestIR.contentProtections) {
        for (const cp of manifestIR.contentProtections) {
            if (cp.schemeIdUri && !securitySystems.has(cp.schemeIdUri)) {
                securitySystems.set(cp.schemeIdUri, {
                    systemId: cp.schemeIdUri,
                    pssh: cp.pssh && cp.pssh.length > 0 ? cp.pssh[0] : null,
                    kids: cp.defaultKid ? [cp.defaultKid] : [],
                });
            }
        }
    }

    const allAdaptationSets = manifestIR.periods.flatMap(
        (p) => p.adaptationSets
    );
    const uniqueAdaptationSets = new Map();
    allAdaptationSets.forEach((as) => {
        if (as.id && !uniqueAdaptationSets.has(as.id)) {
            uniqueAdaptationSets.set(as.id, as);
        } else if (!as.id) {
            const key = `${as.contentType}-${as.lang}-${as.representations
                .map((r) => r.id)
                .join(',')}`;
            if (!uniqueAdaptationSets.has(key)) {
                uniqueAdaptationSets.set(key, as);
            }
        }
    });

    const allVideoAdaptationSets = Array.from(
        uniqueAdaptationSets.values()
    ).filter((as) => as.contentType === 'video');
    const allAudioAdaptationSets = Array.from(
        uniqueAdaptationSets.values()
    ).filter((as) => as.contentType === 'audio');
    const allTextAdaptationSets = Array.from(
        uniqueAdaptationSets.values()
    ).filter(
        (as) => as.contentType === 'text' || as.contentType === 'application'
    );

    for (const period of manifestIR.periods) {
        for (const as of period.adaptationSets) {
            for (const cp of as.contentProtection) {
                const schemeId = cp.schemeIdUri;
                if (!schemeId) continue;

                if (!securitySystems.has(schemeId)) {
                    securitySystems.set(schemeId, {
                        systemId: schemeId,
                        pssh: cp.pssh && cp.pssh.length > 0 ? cp.pssh[0] : null,
                        kids: cp.defaultKid ? [cp.defaultKid] : [],
                    });
                } else {
                    const existing = securitySystems.get(schemeId);
                    if (
                        cp.defaultKid &&
                        !existing.kids.includes(cp.defaultKid)
                    ) {
                        existing.kids.push(cp.defaultKid);
                    }
                    if (!existing.pssh && cp.pssh && cp.pssh.length > 0) {
                        existing.pssh = cp.pssh[0];
                    }
                }
            }

            for (const rep of as.representations) {
                if (context?.fetchAndParseSegment) {
                    const repBaseUrl = resolveBaseUrl(
                        context.manifestUrl,
                        serializedManifest,
                        period.serializedManifest,
                        as.serializedManifest,
                        rep.serializedManifest
                    );
                    const initInfo = findInitSegmentUrl(
                        rep,
                        as,
                        period,
                        repBaseUrl
                    );
                    if (initInfo?.url) {

                        const parsedSegment =
                            await context.fetchAndParseSegment(
                                initInfo.url,
                                'isobmff',
                                initInfo.range
                            );

                        if (context.onInitSegmentParsed) {
                            const uniqueId = initInfo.range
                                ? `${initInfo.url}@init@${initInfo.range}`
                                : initInfo.url;

                            context.onInitSegmentParsed({
                                uniqueId,
                                data: parsedSegment.rawBuffer,
                                parsedData: parsedSegment.parsedData,
                                template: initInfo.template
                            });
                        }

                        if (parsedSegment?.parsedData?.data?.boxes) {
                            if (!rep.width.value || !rep.height.value) {
                                const avc1 = findBoxRecursive(
                                    parsedSegment.parsedData.data.boxes,
                                    (b) => b.type === 'avc1'
                                );
                                if (
                                    avc1 &&
                                    avc1.details.width &&
                                    avc1.details.height
                                ) {
                                    rep.width = {
                                        value: avc1.details.width.value,
                                        source: 'segment',
                                    };
                                    rep.height = {
                                        value: avc1.details.height.value,
                                        source: 'segment',
                                    };
                                }
                            }
                            const btrt = findBoxRecursive(
                                parsedSegment.parsedData.data.boxes,
                                (b) => b.type === 'btrt'
                            );
                            if (btrt && btrt.details.maxBitrate?.value > 0) {
                                rep.manifestBandwidth = rep.bandwidth;
                                rep.bandwidth = btrt.details.maxBitrate.value;
                            }
                            const psshBoxes =
                                parsedSegment.parsedData.data.boxes.filter(
                                    (b) => b.type === 'pssh'
                                );
                            psshBoxes.forEach((psshBox) => {
                                if (
                                    psshBox.systemId &&
                                    psshBox.details.license_url?.value
                                ) {
                                    if (securitySystems.has(psshBox.systemId)) {
                                        const system = securitySystems.get(
                                            psshBox.systemId
                                        );
                                        if (system.pssh) {
                                            system.pssh.licenseServerUrl =
                                                psshBox.details.license_url.value;
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }
    }

    const allVideoTracks = allVideoAdaptationSets.flatMap((as) => {
        return as.representations.map((rep) => {
            const resolutions = [];
            if (rep.width.value && rep.height.value) {
                resolutions.push({
                    value: `${rep.width.value}x${rep.height.value}`,
                    source: rep.width.source,
                });
            }

            const codecs = (rep.codecs || []).map((c) => ({
                ...c,
                supported: isCodecSupported(c.value),
            }));

            return {
                id: rep.id,
                label: rep.label || as.label || null,
                format: rep.format,
                profiles: as.profiles,
                bandwidth: rep.bandwidth,
                manifestBandwidth: rep.manifestBandwidth,
                frameRate: rep.frameRate || as.maxFrameRate,
                resolutions,
                codecs,
                scanType: rep.scanType || null,
                videoRange: null,
                sar: rep.sar || as.sar || null, // Added
                codingDependency: rep.codingDependency, // Added
                maxPlayoutRate: rep.maxPlayoutRate, // Added
                roles: rep.roles,
                muxedAudio: rep.muxedAudio,
            };
        });
    });

    const allAudioTracks = (allAudioAdaptationSets || []).flatMap((as) => {
        return as.representations.map((rep) => {
            const codecsMap = new Map();
            (rep.codecs || []).forEach((codecInfo) => {
                if (codecInfo.value && !codecsMap.has(codecInfo.value)) {
                    codecsMap.set(codecInfo.value, {
                        ...codecInfo,
                        supported: isCodecSupported(codecInfo.value),
                    });
                }
            });

            const channelsSet = new Set();
            (rep.audioChannelConfigurations || []).forEach((c) => {
                if (c.value) channelsSet.add(c.value);
            });
            (as.audioChannelConfigurations || []).forEach((c) => {
                if (c.value) channelsSet.add(c.value);
            });

            // Fallback for sampling rate: Rep -> AS
            const sampleRate = rep.audioSamplingRate || as.audioSamplingRate || null;

            return {
                id: rep.id || as.id || 'N/A',
                label: rep.label || as.label || null,
                lang: as.lang,
                format: as.format,
                codecs: Array.from(codecsMap.values()),
                channels: Array.from(channelsSet).join(', ') || null,
                sampleRate: sampleRate ? parseInt(sampleRate, 10) : null, // Added
                isDefault: (rep.roles || []).some((r) => r.value === 'main'),
                isForced: false,
                roles: rep.roles,
                bandwidth: rep.bandwidth || 0,
            };
        });
    });

    // Check for Muxed Audio (Always check, even if explicit tracks exist)
    if (allVideoTracks.length > 0) {
        const muxedCodecs = new Set();
        const isAudioCodec = (codecString) => {
            if (!codecString) return false;
            const lowerCodec = codecString.toLowerCase();
            const audioPrefixes = ['mp4a', 'ac-3', 'ec-3', 'opus', 'flac'];
            return audioPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
        };

        allVideoTracks.forEach(vt => {
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

        if (muxedCodecs.size > 0 && allAudioTracks.length === 0) {
            // Create a virtual audio track for the muxed audio

            const muxedTrack = {
                id: 'muxed-audio',
                label: 'Muxed',
                lang: 'und',
                codecs: Array.from(muxedCodecs).map(c => ({ value: c, source: 'variant', supported: isCodecSupported(c.value) })),
                channels: null, // Assume stereo, or derive if possible
                sampleRate: null, // Unknown
                isDefault: allAudioTracks.length === 0, // Only default if no other tracks
                isForced: false,
                roles: ['main'],
                bandwidth: 0, // Unknown
                isMuxed: true
            };

            // Add to audio tracks if not already present
            if (!allAudioTracks.some(t => t.id === 'muxed-audio')) {
                allAudioTracks.push(muxedTrack);
            }
        }
    }

    const allTextTracks = allTextAdaptationSets.flatMap((as) => {
        return as.representations.map((rep) => {
            const mimeTypes = [
                ...new Set(
                    (rep.codecs || [])
                        .map((c) => c.value)
                        .concat(rep.mimeType)
                        .filter(Boolean)
                ),
            ];
            return {
                id: rep.id || as.id || 'N/A',
                lang: as.lang,
                codecsOrMimeTypes: mimeTypes.map((v) => ({
                    value: v,
                    source: 'manifest',
                    supported: isCodecSupported(v),
                })),
                isDefault: (rep.roles || []).some((r) => r.value === 'main'),
                isForced: (rep.roles || []).some((r) => r.value === 'forced'),
                roles: rep.roles,
            };
        });
    });

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

    const serviceDescription = findChildrenRecursive(
        serializedManifest,
        'ServiceDescription'
    )[0];
    const latencyEl = serviceDescription
        ? findChildrenRecursive(serviceDescription, 'Latency')[0]
        : null;

    const security = {
        isEncrypted: securitySystems.size > 0,
        systems: Array.from(securitySystems.values()),
        licenseServerUrls: [
            ...new Set(
                Array.from(securitySystems.values())
                    .map((system) => system.pssh?.licenseServerUrl)
                    .filter(Boolean)
            ),
        ],
    };

    const summary = {
        general: {
            protocol: 'DASH',
            streamType:
                manifestIR.type === 'dynamic'
                    ? 'Live / Dynamic'
                    : 'VOD / Static',
            streamTypeColor:
                manifestIR.type === 'dynamic'
                    ? 'text-red-400'
                    : 'text-blue-500',
            duration: manifestIR.duration,
            segmentFormat: manifestIR.segmentFormat,
            title: manifestIR.programInformations[0]?.title || null,
            locations: manifestIR.locations,
            segmenting: getSegmentingStrategy(serializedManifest),
        },
        dash: {
            profiles: manifestIR.profiles,
            minBufferTime: manifestIR.minBufferTime,
            timeShiftBufferDepth: manifestIR.timeShiftBufferDepth,
            minimumUpdatePeriod: manifestIR.minimumUpdatePeriod,
            availabilityStartTime: manifestIR.availabilityStartTime,
            publishTime: manifestIR.publishTime,
            maxSegmentDuration:
                manifestIR.maxSegmentDuration ||
                calculateMaxSegmentDuration(serializedManifest), // Fallback
        },
        hls: null,
        lowLatency: {
            isLowLatency: !!latencyEl,
            targetLatency: latencyEl
                ? parseInt(latencyEl[':@']?.target, 10)
                : null,
            minLatency: latencyEl ? parseInt(latencyEl[':@']?.min, 10) : null,
            maxLatency: latencyEl ? parseInt(latencyEl[':@']?.max, 10) : null,
            partTargetDuration: null,
            partHoldBack: null,
            canBlockReload: false,
        },
        content: {
            totalPeriods: manifestIR.periods.length,
            totalVideoTracks: allVideoAdaptationSets.reduce(
                (sum, as) => sum + as.representations.length,
                0
            ),
            totalAudioTracks: allAudioAdaptationSets.reduce(
                (sum, as) => sum + as.representations.length,
                0
            ),
            totalTextTracks: allTextAdaptationSets.reduce(
                (sum, as) => sum + as.representations.length,
                0
            ),
            mediaPlaylists: 0,
            periods: periodSummaries,
        },
        videoTracks: allVideoTracks,
        audioTracks: allAudioTracks,
        textTracks: allTextTracks,
        security: security,
    };

    return /** @type {import('@/types.ts').ManifestSummary} */ (summary);
}