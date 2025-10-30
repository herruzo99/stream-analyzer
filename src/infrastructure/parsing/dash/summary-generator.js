/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').PeriodSummary} PeriodSummary
 * @typedef {import('@/types.ts').SecuritySummary} SecuritySummary
 */

import { findChildrenRecursive, resolveBaseUrl } from './recursive-parser.js';
import { formatBitrate } from '@/ui/shared/format';
import { findInitSegmentUrl } from './segment-parser.js';
import { isCodecSupported } from '../utils/codec-support.js';
import { debugLog } from '@/shared/utils/debug';

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
    const securitySystems = new Map();

    // First pass: Process top-level ContentProtection elements which often act as templates
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
    // --- BUG FIX: Deduplicate AdaptationSets for summary ---
    const uniqueAdaptationSets = new Map();
    allAdaptationSets.forEach((as) => {
        if (as.id && !uniqueAdaptationSets.has(as.id)) {
            uniqueAdaptationSets.set(as.id, as);
        } else if (!as.id) {
            // For AdaptationSets without an ID, create a composite key to attempt deduplication
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
    // --- END BUG FIX ---

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

            // Enrichment
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
                        debugLog(
                            'summary-generator',
                            'Dispatching init segment fetch',
                            initInfo
                        );
                        try {
                            const parsedSegment =
                                await context.fetchAndParseSegment(
                                    initInfo.url,
                                    'isobmff',
                                    initInfo.range
                                );
                            if (parsedSegment?.data?.boxes) {
                                if (!rep.width.value || !rep.height.value) {
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
                                const btrt = findBoxRecursive(
                                    parsedSegment.data.boxes,
                                    (b) => b.type === 'btrt'
                                );
                                if (
                                    btrt &&
                                    btrt.details.maxBitrate?.value > 0
                                ) {
                                    rep.bandwidth =
                                        btrt.details.maxBitrate.value;
                                }
                                const psshBoxes =
                                    parsedSegment.data.boxes.filter(
                                        (b) => b.type === 'pssh'
                                    );
                                psshBoxes.forEach((psshBox) => {
                                    if (
                                        psshBox.systemId &&
                                        psshBox.details.license_url?.value
                                    ) {
                                        if (
                                            securitySystems.has(
                                                psshBox.systemId
                                            )
                                        ) {
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

    const allVideoTracks = allVideoAdaptationSets.map((as) => {
        const bitrates = as.representations
            .map((r) => r.bandwidth)
            .filter(Boolean);
        const codecs = [
            ...new Set(
                as.representations.map((r) => r.codecs).filter((c) => c.value)
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

    const allAudioTracks = allAudioAdaptationSets.map((as) => {
        const codecs = [
            ...new Set(
                as.representations.map((r) => r.codecs).filter((c) => c.value)
            ),
        ];
        const channels = [
            ...new Set(
                as.audioChannelConfigurations.map((c) => c.value).filter(Boolean)
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
            channels: channels.join(', ') || null,
            isDefault: as.roles.some((r) => r.value === 'main'),
            isForced: false,
            roles: as.roles.map((r) => r.value).filter(Boolean),
        };
    });

    const allTextTracks = allTextAdaptationSets.map((as) => {
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

    const periodSummaries = manifestIR.periods.map((period) => ({
        id: period.id,
        start: period.start,
        duration: period.duration,
        videoTracks: period.adaptationSets.filter(as => as.contentType === 'video'),
        audioTracks: period.adaptationSets.filter(as => as.contentType === 'audio'),
        textTracks: period.adaptationSets.filter(as => as.contentType === 'text' || as.contentType === 'application'),
    }));

    const serviceDescription = findChildrenRecursive(
        serializedManifest,
        'ServiceDescription'
    )[0];
    const latencyEl = serviceDescription
        ? findChildrenRecursive(serviceDescription, 'Latency')[0]
        : null;

    /** @type {SecuritySummary} */
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
            totalVideoTracks: allVideoAdaptationSets.length,
            totalAudioTracks: allAudioAdaptationSets.length,
            totalTextTracks: allTextAdaptationSets.length,
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