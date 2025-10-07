/**
 * @typedef {import('../../../app/types.js').Manifest} Manifest
 * @typedef {import('../../../app/types.js').PeriodSummary} PeriodSummary
 */

import { findChildrenRecursive } from './recursive-parser.js';
import { formatBitrate } from '../../../shared/utils/format.js';

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

/**
 * Creates a protocol-agnostic summary view-model from a DASH manifest.
 * @param {Manifest} manifestIR - The adapted manifest IR.
 * @param {object} serializedManifest - The serialized manifest DOM object.
 * @returns {import('../../../app/types.js').ManifestSummary}
 */
export function generateDashSummary(manifestIR, serializedManifest) {
    const protectionSchemes = new Set();
    const kids = new Set();

    const periodSummaries = manifestIR.periods.map((period) => {
        /** @type {import('../../../app/types.js').AdaptationSet[]} */
        const videoTracks = [];
        /** @type {import('../../../app/types.js').AdaptationSet[]} */
        const audioTracks = [];
        /** @type {import('../../../app/types.js').AdaptationSet[]} */
        const textTracks = [];

        for (const as of period.adaptationSets) {
            for (const cp of as.contentProtection) {
                protectionSchemes.add(cp.system);
                if (cp.defaultKid) {
                    kids.add(cp.defaultKid);
                }
            }

            switch (as.contentType) {
                case 'video':
                    videoTracks.push(as);
                    break;
                case 'audio':
                    audioTracks.push(as);
                    break;
                case 'text':
                case 'application':
                    textTracks.push(as);
                    break;
            }
        }

        /** @type {PeriodSummary} */
        const periodSummary = {
            id: period.id,
            start: period.start,
            duration: period.duration,
            videoTracks,
            audioTracks,
            textTracks,
        };
        return periodSummary;
    });

    const serviceDescription = findChildrenRecursive(
        serializedManifest,
        'ServiceDescription'
    )[0];
    const latencyEl = serviceDescription
        ? findChildrenRecursive(serviceDescription, 'Latency')[0]
        : null;

    // Aggregate flattened summaries for top-level/comparison views
    const allVideoTracks = periodSummaries
        .flatMap((p) => p.videoTracks)
        .map((as) => {
            const bitrates = as.representations
                .map((r) => r.bandwidth)
                .filter(Boolean);
            return {
                id: as.id || 'N/A',
                profiles: as.profiles,
                bitrateRange:
                    bitrates.length > 0
                        ? `${formatBitrate(
                              Math.min(...bitrates)
                          )} - ${formatBitrate(Math.max(...bitrates))}`
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
                videoRange: null,
                roles: as.roles.map((r) => r.value).filter(Boolean),
            };
        });

    const allAudioTracks = periodSummaries
        .flatMap((p) => p.audioTracks)
        .map((as) => ({
            id: as.id || 'N/A',
            lang: as.lang,
            codecs: [
                ...new Set(
                    as.representations.map((r) => r.codecs).filter(Boolean)
                ),
            ],
            channels:
                [
                    ...new Set(
                        as.representations
                            .flatMap((r) => r.audioChannelConfigurations)
                            .map((c) => c.value)
                            .filter(Boolean)
                    ),
                ].join(', ') || null,
            isDefault: as.roles.some((r) => r.value === 'main'),
            isForced: false,
            roles: as.roles.map((r) => r.value).filter(Boolean),
        }));

    const allTextTracks = periodSummaries
        .flatMap((p) => p.textTracks)
        .map((as) => ({
            id: as.id || 'N/A',
            lang: as.lang,
            codecsOrMimeTypes: [
                ...new Set(
                    as.representations
                        .map((r) => r.codecs || r.mimeType)
                        .filter(Boolean)
                ),
            ],
            isDefault: as.roles.some((r) => r.value === 'main'),
            isForced: as.roles.some((r) => r.value === 'forced'),
            roles: as.roles.map((r) => r.value).filter(Boolean),
        }));

    /** @type {import('../../../app/types.js').ManifestSummary} */
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
            totalVideoTracks: allVideoTracks.length,
            totalAudioTracks: allAudioTracks.length,
            totalTextTracks: allTextTracks.length,
            mediaPlaylists: 0,
            periods: periodSummaries,
        },
        videoTracks: allVideoTracks,
        audioTracks: allAudioTracks,
        textTracks: allTextTracks,
        security: {
            isEncrypted: protectionSchemes.size > 0,
            systems: Array.from(protectionSchemes),
            kids: Array.from(kids),
        },
    };

    return summary;
}
