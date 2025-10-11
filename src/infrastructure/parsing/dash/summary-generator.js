/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').PeriodSummary} PeriodSummary
 * @typedef {import('@/types.ts').SecuritySummary} SecuritySummary
 */

import { findChildrenRecursive, resolveBaseUrl } from './recursive-parser.js';
import { formatBitrate } from '@/ui/shared/format';
import { findInitSegmentUrl } from './segment-parser.js';
import { isCodecSupported } from '../utils/codec-support.js';

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

/**
 * Creates a protocol-agnostic summary view-model from a DASH manifest.
 * @param {Manifest} manifestIR - The adapted manifest IR.
 * @param {object} serializedManifest - The serialized manifest DOM object.
 * @param {{fetchAndParseSegment: Function, manifestUrl: string}} [context] - Context for enrichment.
 * @returns {Promise<import('@/types.ts').ManifestSummary>}
 */
export async function generateDashSummary(
    manifestIR,
    serializedManifest,
    context
) {
    const allPssh = new Map();

    const periodSummaries = manifestIR.periods.map((period) => {
        const videoTracks = period.adaptationSets.filter(
            (as) => as.contentType === 'video'
        );
        const audioTracks = period.adaptationSets.filter(
            (as) => as.contentType === 'audio'
        );
        const textTracks = period.adaptationSets.filter(
            (as) =>
                as.contentType === 'text' || as.contentType === 'application'
        );

        for (const as of period.adaptationSets) {
            for (const cp of as.contentProtection) {
                if (cp.pssh) {
                    for (const pssh of cp.pssh) {
                        if (!allPssh.has(pssh.systemId)) {
                            allPssh.set(pssh.systemId, pssh);
                        }
                    }
                }
            }
        }

        return {
            id: period.id,
            start: period.start,
            duration: period.duration,
            videoTracks,
            audioTracks,
            textTracks,
        };
    });

    const serviceDescription = findChildrenRecursive(
        serializedManifest,
        'ServiceDescription'
    )[0];
    const latencyEl = serviceDescription
        ? findChildrenRecursive(serviceDescription, 'Latency')[0]
        : null;

    for (const period of manifestIR.periods) {
        for (const as of period.adaptationSets) {
            if (as.contentType === 'video') {
                for (const rep of as.representations) {
                    if (
                        (!rep.width.value || !rep.height.value) &&
                        context?.fetchAndParseSegment
                    ) {
                        const repBaseUrl = resolveBaseUrl(
                            context.manifestUrl,
                            serializedManifest,
                            period.serializedManifest,
                            as.serializedManifest,
                            rep.serializedManifest
                        );
                        const initUrl = findInitSegmentUrl(
                            rep,
                            as,
                            period,
                            repBaseUrl
                        );
                        if (initUrl) {
                            try {
                                const parsedSegment =
                                    await context.fetchAndParseSegment(
                                        initUrl,
                                        'isobmff'
                                    );
                                if (parsedSegment?.data?.boxes) {
                                    const avc1 = findBoxRecursive(
                                        parsedSegment.data.boxes,
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
                            } catch (e) {
                                console.warn(
                                    `[Enrichment] Failed to parse init segment for rep ${rep.id}: ${e.message}`
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    const allVideoTracks = periodSummaries
        .flatMap((p) => p.videoTracks)
        .map((as) => {
            const bitrates = as.representations
                .map((r) => r.bandwidth)
                .filter(Boolean);
            const codecs = [
                ...new Set(
                    as.representations
                        .map((r) => r.codecs)
                        .filter((c) => c.value)
                ),
            ];
            return {
                id: as.id || 'N/A',
                profiles: as.profiles,
                bitrateRange:
                    bitrates.length > 0
                        ? `${formatBitrate(Math.min(...bitrates))} - ${formatBitrate(Math.max(...bitrates))}`
                        : 'N/A',
                resolutions: [
                    ...new Set(
                        as.representations.map((r) => ({
                            value: `${r.width.value}x${r.height.value}`,
                            source: r.width.source,
                        }))
                    ),
                ],
                codecs: codecs.map((c) => ({
                    value: c.value,
                    source: c.source,
                    supported: isCodecSupported(c.value),
                })),
                scanType: as.representations[0]?.scanType || null,
                videoRange: null,
                roles: as.roles.map((r) => r.value).filter(Boolean),
            };
        });

    const allAudioTracks = periodSummaries
        .flatMap((p) => p.audioTracks)
        .map((as) => {
            const codecs = [
                ...new Set(
                    as.representations
                        .map((r) => r.codecs)
                        .filter((c) => c.value)
                ),
            ];
            return {
                id: as.id || 'N/A',
                lang: as.lang,
                codecs: codecs.map((c) => ({
                    value: c.value,
                    source: c.source,
                    supported: isCodecSupported(c.value),
                })),
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
            };
        });

    const allTextTracks = periodSummaries
        .flatMap((p) => p.textTracks)
        .map((as) => {
            const mimeTypes = [
                ...new Set(
                    as.representations
                        .map((r) => r.codecs?.value || r.mimeType)
                        .filter(Boolean)
                ),
            ];
            return {
                id: as.id || 'N/A',
                lang: as.lang,
                codecsOrMimeTypes: mimeTypes.map(
                    (v) =>
                        /** @type {import('@/types').CodecInfo} */ ({
                            value: v,
                            source: 'manifest',
                            supported: isCodecSupported(v),
                        })
                ),
                isDefault: as.roles.some((r) => r.value === 'main'),
                isForced: as.roles.some((r) => r.value === 'forced'),
                roles: as.roles.map((r) => r.value).filter(Boolean),
            };
        });

    /** @type {SecuritySummary} */
    const security = {
        isEncrypted: allPssh.size > 0,
        systems: Array.from(allPssh.values()),
    };

    /** @type {import('@/types.ts').ManifestSummary} */
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
        security: security,
    };

    return summary;
}