/**
 * @typedef {import('../../../core/state.js').Manifest} Manifest
 */

import { findChildrenRecursive } from '../../../protocols/manifest/dash/recursive-parser.js';

const formatBitrate = (bps) => {
    if (!bps || isNaN(bps)) return 'N/A';
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    return `${(bps / 1000).toFixed(0)} kbps`;
};

const getSegmentingStrategy = (serializedManifest) => {
    if (!serializedManifest) return 'unknown';
    if (
        findChildrenRecursive(serializedManifest.children, 'SegmentList')
            .length > 0
    )
        return 'SegmentList';
    const template = findChildrenRecursive(
        serializedManifest.children,
        'SegmentTemplate'
    )[0];
    if (template) {
        if (
            findChildrenRecursive(template.children, 'SegmentTimeline').length >
            0
        )
            return 'SegmentTemplate with SegmentTimeline';
        if (template.attributes.media?.includes('$Number$'))
            return 'SegmentTemplate with $Number$';
        if (template.attributes.media?.includes('$Time$'))
            return 'SegmentTemplate with $Time$';
        return 'SegmentTemplate';
    }
    if (
        findChildrenRecursive(serializedManifest.children, 'SegmentBase')
            .length > 0
    )
        return 'SegmentBase';
    return 'BaseURL / Single Segment';
};

/**
 * Creates a protocol-agnostic summary view-model from a DASH manifest.
 * @param {Manifest} manifestIR - The adapted manifest IR.
 * @param {object} serializedManifest - The serialized manifest DOM object.
 * @returns {import('../../../core/state.js').ManifestSummary}
 */
export function generateDashSummary(manifestIR, serializedManifest) {
    const videoSets = [];
    const audioSets = [];
    const textSets = [];
    const protectionSchemes = new Set();
    const kids = new Set();

    // SINGLE PASS over the data structure
    for (const period of manifestIR.periods) {
        for (const as of period.adaptationSets) {
            switch (as.contentType) {
                case 'video':
                    videoSets.push(as);
                    break;
                case 'audio':
                    audioSets.push(as);
                    break;
                case 'text':
                case 'application':
                    textSets.push(as);
                    break;
            }
            for (const cp of as.contentProtection) {
                protectionSchemes.add(cp.system);
                if (cp.defaultKid) {
                    kids.add(cp.defaultKid);
                }
            }
        }
    }

    const serviceDescription = findChildrenRecursive(
        serializedManifest.children,
        'ServiceDescription'
    )[0];
    const latencyEl = serviceDescription
        ? findChildrenRecursive(serviceDescription.children, 'Latency')[0]
        : null;

    /** @type {import('../../../core/state.js').ManifestSummary} */
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
                    : 'text-blue-400',
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
        },
        hls: null,
        lowLatency: {
            isLowLatency: !!latencyEl,
            targetLatency: latencyEl
                ? parseInt(latencyEl.attributes.target, 10)
                : null,
            minLatency: latencyEl
                ? parseInt(latencyEl.attributes.min, 10)
                : null,
            maxLatency: latencyEl
                ? parseInt(latencyEl.attributes.max, 10)
                : null,
            partTargetDuration: null,
            partHoldBack: null,
            canBlockReload: false,
        },
        content: {
            periods: manifestIR.periods.length,
            videoTracks: videoSets.length,
            audioTracks: audioSets.length,
            textTracks: textSets.length,
            mediaPlaylists: 0,
        },
        videoTracks: videoSets.map((as) => {
            const bitrates = as.representations
                .map((r) => r.bandwidth)
                .filter(Boolean);
            return {
                id: as.id || 'N/A',
                profiles: as.profiles,
                bitrateRange:
                    bitrates.length > 0
                        ? `${formatBitrate(Math.min(...bitrates))} - ${formatBitrate(Math.max(...bitrates))}`
                        : 'N/A',
                resolutions: [
                    ...new Set(
                        as.representations.map((r) => `${r.width}x${r.height}`)
                    ),
                ],
                codecs: [
                    ...new Set(
                        as.representations.map((r) => r.codecs).filter(Boolean)
                    ),
                ],
                scanType: as.representations[0]?.scanType || null,
                videoRange: null, // Not standard in DASH manifest
                roles: as.roles.map((r) => r.value).filter(Boolean),
            };
        }),
        audioTracks: audioSets.map((as) => ({
            id: as.id || 'N/A',
            lang: as.lang,
            codecs: [
                ...new Set(
                    as.representations.map((r) => r.codecs).filter(Boolean)
                ),
            ],
            channels: [
                ...new Set(
                    as.representations
                        .flatMap((r) => r.audioChannelConfigurations)
                        .map((c) => c.value)
                        .filter(Boolean)
                ),
            ],
            isDefault: false,
            isForced: false,
            roles: as.roles.map((r) => r.value).filter(Boolean),
        })),
        textTracks: textSets.map((as) => ({
            id: as.id || 'N/A',
            lang: as.lang,
            codecsOrMimeTypes: [
                ...new Set(
                    as.representations
                        .map((r) => r.codecs || r.mimeType)
                        .filter(Boolean)
                ),
            ],
            isDefault: false,
            isForced: false,
            roles: as.roles.map((r) => r.value).filter(Boolean),
        })),
        security: {
            isEncrypted: protectionSchemes.size > 0,
            systems: Array.from(protectionSchemes),
            kids: Array.from(kids),
        },
    };

    return summary;
}
