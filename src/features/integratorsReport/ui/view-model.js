import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm.js';

/**
 * @typedef {import('@/types.ts').Stream} Stream
 * @typedef {import('@/types.ts').Manifest} Manifest
 */

/**
 * Extracts network-related information from the stream and active manifest.
 * @param {Stream} stream
 * @param {Manifest} activeManifest
 * @returns {object}
 */
function getNetworkInfo(stream, activeManifest) {
    const hostnames = { manifest: new Set(), media: new Set(), key: new Set() };
    let totalSegmentDuration = 0;
    let segmentCount = 0;

    try {
        if (stream.originalUrl)
            hostnames.manifest.add(new URL(stream.originalUrl).hostname);
        if (stream.baseUrl && stream.baseUrl !== stream.originalUrl)
            hostnames.manifest.add(new URL(stream.baseUrl).hostname);

        if (stream.protocol === 'dash') {
            activeManifest.locations?.forEach((loc) =>
                hostnames.manifest.add(new URL(loc, stream.baseUrl).hostname)
            );
            stream.dashRepresentationState.forEach((repState) => {
                const sampleSegments = repState.segments
                    .filter((s) => /** @type {any} */ (s).type === 'Media')
                    .slice(0, 10);
                sampleSegments.forEach((seg) => {
                    hostnames.media.add(
                        new URL(/** @type {any} */ (seg).resolvedUrl).hostname
                    );
                    totalSegmentDuration +=
                        /** @type {any} */ (seg).duration /
                        /** @type {any} */ (seg).timescale;
                    segmentCount++;
                });
            });
        } else if (stream.protocol === 'hls') {
            activeManifest.variants?.forEach((v) =>
                hostnames.manifest.add(new URL(v.resolvedUri).hostname)
            );
            // NEW: Also check EXT-X-MEDIA tags for additional playlist hostnames
            const hlsManifest = activeManifest.serializedManifest;
            if (
                hlsManifest &&
                'media' in hlsManifest &&
                Array.isArray(hlsManifest.media)
            ) {
                hlsManifest.media.forEach((media) => {
                    if (media.URI) {
                        hostnames.manifest.add(
                            new URL(media.URI, stream.baseUrl).hostname
                        );
                    }
                });
            }

            const segments = activeManifest.segments || [];
            segments.forEach((seg) => {
                hostnames.media.add(new URL(seg.resolvedUrl).hostname);
                totalSegmentDuration += seg.duration;
            });
            segmentCount = segments.length;
            activeManifest.tags
                .filter(
                    (t) =>
                        t.name === 'EXT-X-KEY' &&
                        t.value.URI &&
                        !t.value.URI.startsWith('data:')
                )
                .forEach((t) =>
                    hostnames.key.add(
                        new URL(t.value.URI, stream.baseUrl).hostname
                    )
                );
        }
    } catch (e) {
        console.error('Error extracting network info:', e);
    }

    const avgReqRate =
        segmentCount > 0 ? totalSegmentDuration / segmentCount : null;

    return {
        manifestHostnames: Array.from(hostnames.manifest),
        mediaSegmentHostnames: Array.from(hostnames.media),
        keyLicenseHostnames: Array.from(hostnames.key),
        avgSegmentRequestRate: avgReqRate,
        avgSegmentSize: null, // Size requires fetching, deferring this feature.
        contentSteering: stream.steeringInfo
            ? {
                  serverUri: /** @type {any} */ (stream.steeringInfo).value[
                      'SERVER-URI'
                  ],
                  defaultPathway: /** @type {any} */ (stream.steeringInfo)
                      .value['PATHWAY-ID'],
                  allPathways: [
                      ...new Set(
                          stream.manifest.variants
                              .map((v) => v.attributes['PATHWAY-ID'])
                              .filter(Boolean)
                      ),
                  ],
              }
            : null,
    };
}

/**
 * Gathers timing and update strategy information for live streams.
 * @param {Stream} stream The overall stream object
 * @param {Manifest} activeManifest The currently viewed manifest (master or media)
 * @returns {object | null}
 */
function getTimingInfo(stream, activeManifest) {
    if (stream.manifest.type !== 'dynamic') return null;

    const summary = activeManifest.summary;
    let lowLatency = { active: false, mechanism: 'Standard Polling' };
    if (summary.lowLatency?.isLowLatency) {
        lowLatency.active = true;
        lowLatency.mechanism =
            summary.general.protocol === 'DASH'
                ? 'DASH Low-Latency (Chunked Transfer)'
                : 'HLS Low-Latency (Partial Segments)';
    }

    return {
        pollingInterval:
            stream.manifest.minimumUpdatePeriod ?? summary.hls?.targetDuration,
        dvrWindow:
            stream.manifest.timeShiftBufferDepth ?? activeManifest.duration,
        lowLatency: lowLatency,
        blockingRequestSupport: summary.lowLatency?.canBlockReload ?? false,
        targetLatency: summary.lowLatency?.targetLatency,
        chunkDuration: stream.manifest.maxSubsegmentDuration,
        partTargetDuration: summary.lowLatency?.partTargetDuration,
    };
}

/**
 * Gathers all security and encryption details from the active manifest.
 * @param {Manifest} activeManifest
 * @returns {object}
 */
function getSecurityInfo(activeManifest) {
    const keyTags =
        activeManifest.tags?.filter(
            (t) => t.name === 'EXT-X-KEY' && t.value.METHOD !== 'NONE'
        ) || [];
    const contentProtection =
        activeManifest.periods
            ?.flatMap((p) => p.adaptationSets)
            .flatMap((as) => as.contentProtection) || [];

    if (keyTags.length > 0) {
        const uniqueKeyFormats = [
            ...new Set(keyTags.map((k) => k.value.KEYFORMAT).filter(Boolean)),
        ];
        const uniqueKeyIDs = [
            ...new Set(keyTags.map((k) => k.value.KEYID).filter(Boolean)),
        ];

        return {
            isEncrypted: true,
            drmSystems: uniqueKeyFormats.map((s) => ({
                name: getDrmSystemName(s),
                uuid: s,
            })),
            defaultKIDs: uniqueKeyIDs,
            hlsEncryptionMethod: keyTags[0].value.METHOD,
            emeRobustnessLevels: [],
        };
    }

    if (contentProtection.length > 0) {
        const uniqueRobustness = [
            ...new Set(
                contentProtection.map((cp) => cp.robustness).filter(Boolean)
            ),
        ];
        return {
            isEncrypted: true,
            drmSystems: [
                ...new Set(contentProtection.map((cp) => cp.schemeIdUri)),
            ].map((s) => ({ name: getDrmSystemName(s), uuid: s })),
            defaultKIDs: [
                ...new Set(
                    contentProtection.map((cp) => cp.defaultKid).filter(Boolean)
                ),
            ],
            hlsEncryptionMethod: null,
            emeRobustnessLevels: uniqueRobustness,
        };
    }

    return {
        isEncrypted: false,
        drmSystems: [],
        defaultKIDs: [],
        hlsEncryptionMethod: null,
        emeRobustnessLevels: [],
    };
}

/**
 * Gathers core player integration requirements from the active manifest.
 * @param {Manifest} activeManifest
 * @returns {object}
 */
function getIntegrationRequirements(activeManifest) {
    const summary = activeManifest.summary;
    const allCodecs = new Set([
        ...summary.videoTracks.flatMap((t) => t.codecs),
        ...summary.audioTracks.flatMap((t) => t.codecs),
    ]);

    const subtitleFormats = new Set();
    summary.textTracks.forEach((tt) => {
        const format = tt.codecsOrMimeTypes.join(', ');
        if (format.includes('stpp') || format.includes('im1t')) {
            subtitleFormats.add('IMSC1 (TTML)');
        } else if (format.includes('vtt')) {
            subtitleFormats.add('WebVTT');
        } else if (format) {
            subtitleFormats.add(format);
        }
    });

    const isDashSegmentAlignment = activeManifest.periods
        ?.flatMap((p) => p.adaptationSets)
        .some((as) => as.segmentAlignment === true);

    return {
        requiredDashProfiles: summary.dash?.profiles || null,
        requiredHlsVersion: summary.hls?.version || null,
        segmentContainerFormat: summary.general.segmentFormat,
        trickPlaySupport:
            summary.hls?.iFramePlaylists > 0 ||
            activeManifest.periods
                .flatMap((p) => p.adaptationSets)
                .some((as) => as.roles.some((r) => r.value === 'trick')),
        requiredCodecs: Array.from(allCodecs),
        subtitleFormats: Array.from(subtitleFormats),
        segmentAlignment: isDashSegmentAlignment ?? null,
    };
}

/**
 * Creates the complete view model for the Integrator's Report.
 * @param {Stream} stream The active stream.
 * @returns {object}
 */
export function createIntegratorsReportViewModel(stream) {
    const activeManifest =
        stream.protocol === 'hls' && stream.activeMediaPlaylistUrl
            ? stream.mediaPlaylists.get(stream.activeMediaPlaylistUrl)?.manifest
            : stream.manifest;

    if (!activeManifest) {
        return { network: {}, timing: null, security: {}, integration: {} };
    }

    const viewModel = {
        network: getNetworkInfo(stream, activeManifest),
        timing: getTimingInfo(stream, activeManifest),
        security: getSecurityInfo(activeManifest),
        integration: getIntegrationRequirements(activeManifest),
    };

    return viewModel;
}
