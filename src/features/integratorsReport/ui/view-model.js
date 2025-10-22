import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import {
    getInheritedElement,
    getAttr,
} from '@/infrastructure/parsing/dash/recursive-parser';

/**
 * @typedef {import('@/types.ts').Stream} Stream
 * @typedef {import('@/types.ts').Manifest} Manifest
 */

/**
 * Extracts network-related information from the entire stream, including all media playlists.
 * @param {Stream} stream
 * @returns {object}
 */
function getNetworkInfo(stream) {
    const hostnames = { manifest: new Set(), media: new Set(), key: new Set() };

    try {
        if (stream.originalUrl) {
            hostnames.manifest.add(new URL(stream.originalUrl).hostname);
        }
        if (stream.baseUrl && stream.baseUrl !== stream.originalUrl) {
            hostnames.manifest.add(new URL(stream.baseUrl).hostname);
        }

        if (stream.protocol === 'dash') {
            stream.manifest.locations?.forEach((loc) =>
                hostnames.manifest.add(new URL(loc, stream.baseUrl).hostname)
            );
            stream.dashRepresentationState.forEach((repState) => {
                repState.segments.forEach((seg) => {
                    if (/** @type {any} */ (seg).type === 'Media') {
                        hostnames.media.add(
                            new URL(/** @type {any} */ (seg).resolvedUrl)
                                .hostname
                        );
                    }
                });
            });
        } else if (stream.protocol === 'hls') {
            // Iterate over ALL media playlists, not just the active one.
            for (const mediaPlaylist of stream.mediaPlaylists.values()) {
                const playlistBaseUrl = /** @type {any} */ (
                    mediaPlaylist.manifest.serializedManifest
                ).baseUrl;
                (mediaPlaylist.manifest.segments || []).forEach((seg) => {
                    hostnames.media.add(new URL(seg.resolvedUrl).hostname);
                });

                (mediaPlaylist.manifest.tags || [])
                    .filter(
                        (t) =>
                            t.name === 'EXT-X-KEY' &&
                            t.value.URI &&
                            !t.value.URI.startsWith('data:')
                    )
                    .forEach((t) =>
                        hostnames.key.add(
                            new URL(t.value.URI, playlistBaseUrl).hostname
                        )
                    );
            }
        }
    } catch (e) {
        console.error('Error extracting network info:', e);
    }

    let totalDurationSeconds = 0;
    let totalSizeBytes = 0;
    let segmentInfoCount = 0;

    if (stream.protocol === 'dash' && stream.manifest.periods) {
        for (const period of stream.manifest.periods) {
            for (const as of period.adaptationSets) {
                for (const rep of as.representations) {
                    const hierarchy = [
                        rep.serializedManifest,
                        as.serializedManifest,
                        period.serializedManifest,
                    ];
                    const template = getInheritedElement(
                        'SegmentTemplate',
                        hierarchy
                    );

                    if (
                        template &&
                        getAttr(template, 'duration') &&
                        getAttr(template, 'timescale')
                    ) {
                        const duration = parseInt(
                            getAttr(template, 'duration'),
                            10
                        );
                        const timescale = parseInt(
                            getAttr(template, 'timescale'),
                            10
                        );
                        const bandwidth = rep.bandwidth;

                        if (duration > 0 && timescale > 0 && bandwidth > 0) {
                            const durationSec = duration / timescale;
                            totalDurationSeconds += durationSec;
                            totalSizeBytes += (bandwidth / 8) * durationSec;
                            segmentInfoCount++;
                        }
                    }
                }
            }
        }
    } else if (stream.protocol === 'hls' && stream.manifest) {
        const targetDuration = stream.manifest.summary?.hls?.targetDuration;
        if (targetDuration) {
            for (const period of stream.manifest.periods) {
                for (const as of period.adaptationSets) {
                    for (const rep of as.representations) {
                        const bandwidth = rep.bandwidth;
                        if (bandwidth > 0) {
                            totalDurationSeconds += targetDuration;
                            totalSizeBytes += (bandwidth / 8) * targetDuration;
                            segmentInfoCount++;
                        }
                    }
                }
            }
        }
    }

    const avgSegmentDuration =
        segmentInfoCount > 0 ? totalDurationSeconds / segmentInfoCount : null;
    const avgSegmentSize =
        segmentInfoCount > 0 ? totalSizeBytes / segmentInfoCount : null;

    return {
        manifestHostnames: Array.from(hostnames.manifest),
        mediaSegmentHostnames: Array.from(hostnames.media),
        keyLicenseHostnames: Array.from(hostnames.key),
        avgSegmentRequestRate: avgSegmentDuration,
        avgSegmentSize: avgSegmentSize,
        contentSteering: stream.steeringInfo
            ? {
                  serverUri: /** @type {any} */ (stream.steeringInfo).value[
                      'SERVER-URI'
                  ],
                  defaultPathway: /** @type {any} */ (stream.steeringInfo)
                      .value['PATHWAY-ID'],
                  allPathways: [
                      ...new Set(
                          (stream.manifest.variants || [])
                              .map((v) => v.attributes['PATHWAY-ID'])
                              .filter(Boolean)
                      ),
                  ],
              }
            : null,
    };
}

/**
 * Gathers timing and update strategy information, primarily from the master playlist.
 * @param {Stream} stream The overall stream object
 * @returns {object | null}
 */
function getTimingInfo(stream) {
    if (stream.manifest.type !== 'dynamic') return null;

    const summary = stream.manifest.summary; // Use master summary
    const activeMediaPlaylist = stream.activeMediaPlaylistUrl
        ? stream.mediaPlaylists.get(stream.activeMediaPlaylistUrl)?.manifest
        : null;

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
            stream.manifest.timeShiftBufferDepth ??
            activeMediaPlaylist?.duration,
        lowLatency: lowLatency,
        blockingRequestSupport: summary.lowLatency?.canBlockReload ?? false,
        targetLatency: summary.lowLatency?.targetLatency,
        chunkDuration: stream.manifest.maxSubsegmentDuration,
        partTargetDuration: summary.lowLatency?.partTargetDuration,
    };
}

/**
 * Creates a unified and labeled list of license server URLs.
 * @param {Stream} stream
 * @returns {string[]}
 */
function getUnifiedLicenseUrls(stream) {
    const discoveredUrls = stream.manifest?.summary?.security?.licenseServerUrls || [];
    const urls = new Set();
    const result = [];
    const userOverrideUrl = stream.drmAuth?.licenseServerUrl;

    if (userOverrideUrl) {
        urls.add(userOverrideUrl);
        result.push(`${userOverrideUrl} (User Override)`);
    }

    discoveredUrls.forEach(url => {
        if (!urls.has(url)) {
            urls.add(url);
            result.push(`${url} (Discovered from PSSH)`);
        }
    });

    return result;
}


/**
 * Gathers security info for an HLS stream by aggregating across all playlists.
 * @param {Stream} stream
 * @returns {object}
 */
function getHlsSecurityInfo(stream) {
    const { security: securitySummary } = stream.manifest.summary;
    if (!securitySummary?.isEncrypted) {
        return {
            isEncrypted: false,
            drmSystems: [],
            defaultKIDs: [],
            hlsEncryptionMethod: null,
            emeRobustnessLevels: [],
            licenseServerUrls: [],
        };
    }

    return {
        isEncrypted: true,
        drmSystems: securitySummary.systems.map((s) => ({
            name: getDrmSystemName(s.systemId),
            uuid: s.systemId,
        })),
        defaultKIDs: securitySummary.kids,
        hlsEncryptionMethod: securitySummary.hlsEncryptionMethod,
        emeRobustnessLevels: [],
        licenseServerUrls: getUnifiedLicenseUrls(stream),
    };
}

/**
 * Gathers security info for a DASH stream from its manifest.
 * @param {Stream} stream
 * @returns {object}
 */
function getDashSecurityInfo(stream) {
    const { manifest } = stream;
    const { security: securitySummary } = manifest.summary;
    if (!securitySummary?.isEncrypted) {
        return {
            isEncrypted: false,
            drmSystems: [],
            defaultKIDs: [],
            hlsEncryptionMethod: null,
            emeRobustnessLevels: [],
            licenseServerUrls: [],
        };
    }

    const contentProtection =
        manifest.periods
            ?.flatMap((p) => p.adaptationSets)
            .flatMap((as) => as.contentProtection) || [];
    const uniqueRobustness = [
        ...new Set(contentProtection.map((cp) => cp.robustness).filter(Boolean)),
    ];

    return {
        isEncrypted: true,
        drmSystems: securitySummary.systems.map((s) => ({
            name: getDrmSystemName(s.systemId),
            uuid: s.systemId,
        })),
        defaultKIDs: securitySummary.kids,
        hlsEncryptionMethod: null,
        emeRobustnessLevels: uniqueRobustness,
        licenseServerUrls: getUnifiedLicenseUrls(stream),
    };
}

/**
 * Gathers core player integration requirements from the active manifest.
 * @param {Manifest} activeManifest
 * @returns {object}
 */
function getIntegrationRequirements(activeManifest) {
    const summary = activeManifest.summary;

    // Correctly extract and de-duplicate codec strings from SourcedData objects.
    const allCodecValues = [
        ...summary.videoTracks.flatMap((t) => t.codecs.map((c) => c.value)),
        ...summary.audioTracks.flatMap((t) => t.codecs.map((c) => c.value)),
    ].filter(Boolean);
    const uniqueCodecs = [...new Set(allCodecValues)];

    const subtitleFormats = new Set();
    summary.textTracks.forEach((tt) => {
        const format = tt.codecsOrMimeTypes.map((c) => c.value).join(', ');
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
        requiredCodecs: uniqueCodecs,
        subtitleFormats: Array.from(subtitleFormats),
        segmentAlignment: isDashSegmentAlignment ?? null,
    };
}

/**
 * Creates the complete view model for the Integrator's Report.
 * This function is now context-agnostic and always reports on the entire stream.
 * @param {Stream} stream The active stream.
 * @returns {object}
 */
export function createIntegratorsReportViewModel(stream) {
    if (stream.protocol === 'dash') {
        if (!stream.manifest) {
            return {
                network: {},
                timing: null,
                security: {},
                integration: {},
            };
        }
        return {
            network: getNetworkInfo(stream),
            timing: getTimingInfo(stream),
            security: getDashSecurityInfo(stream),
            integration: getIntegrationRequirements(stream.manifest),
        };
    }

    // HLS-specific logic that aggregates across all playlists
    const masterManifest =
        stream.mediaPlaylists.get('master')?.manifest || stream.manifest;

    if (!masterManifest) {
        return { network: {}, timing: null, security: {}, integration: {} };
    }

    const viewModel = {
        network: getNetworkInfo(stream),
        timing: getTimingInfo(stream),
        security: getHlsSecurityInfo(stream),
        integration: getIntegrationRequirements(masterManifest),
    };

    return viewModel;
}