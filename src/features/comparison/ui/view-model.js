import { isCodecSupported } from '@/infrastructure/parsing/utils/codec-support';
import { formatBitrate } from '@/ui/shared/format';

const renderList = (items) =>
    items && items.length > 0
        ? items
              .map((item) => (typeof item === 'object' ? item.value : item))
              .join(', ')
        : 'N/A';

const createRow = (
    label,
    tooltip,
    isoRef,
    values, // Array of { id, value }
    referenceId,
    formatter = (v) => String(v ?? 'N/A')
) => {
    // Find the reference value
    const refEntry = values.find((v) => v.id === referenceId);
    const refValue = refEntry ? refEntry.value : undefined;
    const refString = JSON.stringify(refValue);

    const processedValues = values.map((entry) => {
        const valString = JSON.stringify(entry.value);
        let status = 'neutral';

        if (
            entry.value === null ||
            entry.value === undefined ||
            entry.value === ''
        ) {
            status = 'missing';
        } else if (referenceId !== null && referenceId !== undefined) {
            // Compare against reference
            if (entry.id === referenceId) {
                status = 'match';
            } else if (valString === refString) {
                status = 'match';
            } else {
                status = 'diff';
            }
        } else {
            // No reference selected: check if all are same
            const allSame = values.every(
                (v) => JSON.stringify(v.value) === valString
            );
            status = allSame ? 'match' : 'diff';
        }

        return {
            id: entry.id, // Stream ID or Composite ID
            displayValue: formatter(entry.value),
            rawValue: entry.value,
            status,
        };
    });

    return {
        label,
        tooltip,
        isoRef,
        values: processedValues,
        isDiff: processedValues.some((v) => v.status === 'diff'),
        isUsedByAny: values.some(
            (v) => v.value !== null && v.value !== false && v.value !== 'N/A'
        ),
    };
};

/**
 * Generates a synthetic summary for a specific HLS Media Playlist (Variant).
 * @param {import('@/types').Stream} stream
 * @param {string} variantId
 * @returns {import('@/types').ManifestSummary}
 */
function resolveHlsVariantSummary(stream, variantId) {
    const playlistData = stream.mediaPlaylists.get(variantId);
    const masterSummary = stream.manifest.summary;

    // If we can't find specific playlist data, fallback to master but warn
    if (!playlistData) return masterSummary;

    const mediaManifest = playlistData.manifest;
    // Access raw properties from serializedManifest (parsed HLS object) for properties not in generic Manifest IR
    const hlsRaw = /** @type {any} */ (mediaManifest.serializedManifest);

    // Try to find the variant definition in the master to get bandwidth/codecs
    const variantDef = stream.manifest.variants?.find(
        (v) => (v.stableId || v.id) === variantId
    );

    // Calculate specific stats for this variant
    const segmentCount = mediaManifest.segments?.length || 0;
    const actualDuration =
        mediaManifest.segments?.reduce((acc, s) => acc + s.duration, 0) || 0;

    // Calculate last segment duration for HLS specific checks
    let lastSegmentDuration = 0;
    if (mediaManifest.segments && mediaManifest.segments.length > 0) {
        lastSegmentDuration = mediaManifest.segments[mediaManifest.segments.length - 1].duration;
    }

    // Construct a complete video track object that mimics what the parser produces
    const syntheticVideoTrack = variantDef
        ? {
              id: variantDef.stableId || variantDef.id,
              bandwidth: variantDef.attributes.BANDWIDTH,
              // Essential: The 'resolutions' array expected by UI
              resolutions: [
                  {
                      value: variantDef.attributes.RESOLUTION || 'N/A',
                      source: 'manifest',
                  },
              ],
              codecs: [
                  {
                      value: variantDef.attributes.CODECS,
                      source: 'manifest',
                      supported: isCodecSupported(variantDef.attributes.CODECS),
                  },
              ],
              frameRate: variantDef.attributes['FRAME-RATE'],
              videoRange: variantDef.attributes['VIDEO-RANGE'],
              profiles: null,
              manifestBandwidth: variantDef.attributes.BANDWIDTH,
              scanType: null,
              roles: [],
          }
        : null;

    return {
        general: {
            ...masterSummary.general,
            duration: actualDuration,
            streamType:
                mediaManifest.type === 'dynamic'
                    ? 'Live / Dynamic'
                    : 'VOD / Static',
            segmenting: 'Segment List (Variant)',
        },
        hls: {
            ...masterSummary.hls,
            // Access HLS-specific props from serialized manifest or existing summary structure
            targetDuration:
                hlsRaw?.targetDuration ||
                mediaManifest.summary?.hls?.targetDuration ||
                0,
            version:
                hlsRaw?.version || mediaManifest.summary?.hls?.version || 0,
            mediaPlaylistDetails: {
                segmentCount,
                averageSegmentDuration:
                    segmentCount > 0 ? actualDuration / segmentCount : 0,
                hasDiscontinuity: mediaManifest.segments?.some(
                    (s) => s.discontinuity
                ),
                isIFrameOnly: false,
                lastSegmentDuration: lastSegmentDuration,
            },
            iFramePlaylists: 0,
            dvrWindow: mediaManifest.type === 'dynamic' ? actualDuration : null,
        },
        dash: null, // Explicitly null to satisfy ManifestSummary type
        content: {
            ...masterSummary.content,
            totalVideoTracks: 1, // It is a single variant
            totalAudioTracks: 0, // Simplification
            totalTextTracks: 0,
        },
        // Use the synthetic track or fallback to master's tracks if variant def missing
        videoTracks: syntheticVideoTrack
            ? [syntheticVideoTrack]
            : masterSummary.videoTracks,

        // Inherit global properties that don't change per variant
        lowLatency: masterSummary.lowLatency,
        security: masterSummary.security,
        audioTracks: masterSummary.audioTracks, // Audio is usually shared/demuxed
        textTracks: masterSummary.textTracks,
        advanced: masterSummary.advanced,
        cmafData: masterSummary.cmafData,
    };
}

/**
 * @param {Array<{stream: import('@/types').Stream, variantId: string | null}>} targets
 * @param {string} referenceCompositeId
 */
export function createComparisonViewModel(targets, referenceCompositeId) {
    // Resolve summaries for each target
    const resolvedTargets = targets.map((t) => {
        const compositeId = t.variantId
            ? `${t.stream.id}::${t.variantId}`
            : `${t.stream.id}::master`;
        let summary = t.stream.manifest.summary;

        if (
            t.stream.protocol === 'hls' &&
            t.variantId &&
            t.variantId !== 'master'
        ) {
            summary = resolveHlsVariantSummary(t.stream, t.variantId);
        }

        return {
            id: compositeId,
            streamName: t.stream.name,
            label:
                t.variantId && t.variantId !== 'master' ? 'Variant' : 'Master',
            subLabel:
                t.variantId && t.variantId !== 'master'
                    ? t.variantId
                    : t.stream.protocol.toUpperCase(),
            summary,
        };
    });

    const mapValues = (accessor) =>
        resolvedTargets.map((t) => ({ id: t.id, value: accessor(t.summary) }));

    // --- 1. General Configuration ---
    const generalPoints = [
        createRow(
            'Protocol',
            'Streaming protocol used.',
            'N/A',
            mapValues((s) => s?.general.protocol),
            referenceCompositeId
        ),
        createRow(
            'Type',
            'static (VOD) vs dynamic (live)',
            'DASH: 5.3.1.2 / HLS: 4.3.3.5',
            mapValues((s) => s?.general.streamType),
            referenceCompositeId
        ),
        createRow(
            'Profiles / Version',
            'Declared feature sets or HLS version.',
            'DASH: 8.1 / HLS: 4.3.1.2',
            mapValues((s) =>
                s?.general.protocol === 'DASH'
                    ? s?.dash?.profiles
                    : `v${s?.hls?.version}`
            ),
            referenceCompositeId
        ),
        createRow(
            'Duration',
            'Total duration of the content.',
            'N/A',
            mapValues((s) => s?.general.duration),
            referenceCompositeId,
            (v) => (v ? `${v.toFixed(2)}s` : 'Unknown')
        ),
        createRow(
            'Target Duration',
            'Maximum segment duration.',
            'EXT-X-TARGETDURATION',
            mapValues(
                (s) => s?.hls?.targetDuration || s?.dash?.maxSegmentDuration
            ),
            referenceCompositeId,
            (v) => (v ? `${v}s` : 'N/A')
        ),
    ];

    // --- 2. Video Configuration ---
    const videoPoints = [
        createRow(
            'Track/Variant Count',
            'Total number of video tracks/variants.',
            'N/A',
            mapValues((s) => s?.content.totalVideoTracks ?? 0),
            referenceCompositeId
        ),
        createRow(
            'Max Bitrate',
            'Highest available video bitrate.',
            'N/A',
            mapValues((s) => {
                const tracks = s?.videoTracks || [];
                if (tracks.length === 0) return 0;
                return Math.max(...tracks.map((t) => t.bandwidth));
            }),
            referenceCompositeId,
            formatBitrate
        ),
        createRow(
            'Codecs',
            'Video codecs used.',
            'ISO/IEC 14496-15',
            mapValues((s) => {
                const tracks = s?.videoTracks || [];
                const codecs = new Set(
                    tracks.flatMap((t) =>
                        t.codecs.map((c) => c.value.split('.')[0])
                    )
                );
                return Array.from(codecs).sort((a, b) => a.localeCompare(b));
            }),
            referenceCompositeId,
            renderList
        ),
        createRow(
            'Video Range',
            'Dynamic range (SDR, HLG, PQ).',
            'N/A',
            mapValues((s) => {
                const tracks = s?.videoTracks || [];
                return (
                    Array.from(
                        new Set(tracks.map((t) => t.videoRange).filter(Boolean))
                    ).join(', ') || 'SDR'
                );
            }),
            referenceCompositeId
        ),
    ];

    // --- 3. Segment Stats (Specific to Variant Selection) ---
    const segmentPoints = [
        createRow(
            'Segment Count',
            'Number of segments in the current playlist.',
            'N/A',
            mapValues(
                (s) => s?.hls?.mediaPlaylistDetails?.segmentCount ?? 'N/A'
            ),
            referenceCompositeId
        ),
        createRow(
            'Avg Seg Duration',
            'Average duration of segments.',
            'N/A',
            mapValues(
                (s) => s?.hls?.mediaPlaylistDetails?.averageSegmentDuration
            ),
            referenceCompositeId,
            (v) => (v ? `${v.toFixed(3)}s` : 'N/A')
        ),
        createRow(
            'Discontinuities',
            'Presence of EXT-X-DISCONTINUITY tags.',
            'N/A',
            mapValues((s) => s?.hls?.mediaPlaylistDetails?.hasDiscontinuity),
            referenceCompositeId,
            (v) => (v ? 'Yes' : 'No')
        ),
    ];

    // --- 4. Audio Configuration ---
    const audioPoints = [
        createRow(
            'Track Count',
            'Total number of audio renditions.',
            'N/A',
            mapValues((s) => s?.content.totalAudioTracks ?? 0),
            referenceCompositeId
        ),
        createRow(
            'Codecs',
            'Audio codecs used.',
            'N/A',
            mapValues((s) => {
                const tracks = s?.audioTracks || [];
                const codecs = new Set(
                    tracks.flatMap((t) =>
                        t.codecs.map((c) => c.value.split('.')[0])
                    )
                );
                return Array.from(codecs).sort((a, b) => a.localeCompare(b));
            }),
            referenceCompositeId,
            renderList
        ),
        createRow(
            'Languages',
            'Available audio languages.',
            'RFC 5646',
            mapValues((s) => {
                const tracks = s?.audioTracks || [];
                return Array.from(
                    new Set(tracks.map((t) => t.lang).filter(Boolean))
                ).sort((a, b) => a.localeCompare(b));
            }),
            referenceCompositeId,
            renderList
        ),
    ];

    // --- 5. Text / Accessibility ---
    const textPoints = [
        createRow(
            'Track Count',
            'Total number of text/subtitle tracks.',
            'N/A',
            mapValues((s) => s?.content.totalTextTracks ?? 0),
            referenceCompositeId
        ),
        createRow(
            'Formats',
            'Subtitle formats (e.g. vtt, stpp).',
            'N/A',
            mapValues((s) => {
                const tracks = s?.textTracks || [];
                const formats = new Set(
                    tracks.flatMap((t) =>
                        t.codecsOrMimeTypes.map((c) => c.value)
                    )
                );
                return Array.from(formats);
            }),
            referenceCompositeId,
            renderList
        ),
        createRow(
            'Forced Subs',
            'Contains forced subtitles for translation.',
            'N/A',
            mapValues((s) => (s?.textTracks || []).some((t) => t.isForced)),
            referenceCompositeId,
            (v) => (v ? 'Yes' : 'No')
        ),
    ];

    // --- 6. Security / DRM ---
    const securityPoints = [
        createRow(
            'Encryption',
            'Is the content encrypted?',
            'CENC / HLS',
            mapValues((s) => s?.security?.isEncrypted),
            referenceCompositeId,
            (v) => (v ? 'Encrypted' : 'Clear')
        ),
        createRow(
            'DRM Systems',
            'Supported DRM Systems.',
            'PSSH / EXT-X-KEY',
            mapValues((s) => {
                const systems = s?.security?.systems || [];
                return systems.map((sys) => {
                    const uuid = sys.systemId.toLowerCase();
                    if (uuid.includes('edef8ba9')) return 'Widevine';
                    if (uuid.includes('9a04f079')) return 'PlayReady';
                    if (uuid.includes('94ce86fb')) return 'FairPlay';
                    return 'Unknown';
                });
            }),
            referenceCompositeId,
            renderList
        ),
        createRow(
            'License Servers',
            'Distinct license server URLs detected.',
            'N/A',
            mapValues((s) => (s?.security?.licenseServerUrls || []).length),
            referenceCompositeId
        ),
    ];

    // --- 7. Timing & Latency ---
    const timingPoints = [
        createRow(
            'Low Latency Mode',
            'Is low-latency streaming signaled?',
            'LL-HLS / LL-DASH',
            mapValues((s) => s?.lowLatency?.isLowLatency),
            referenceCompositeId,
            (v) => (v ? 'Enabled' : 'Standard')
        ),
        createRow(
            'Target Latency',
            'Suggested end-to-end latency.',
            'N/A',
            mapValues((s) => {
                const ll = s?.lowLatency;
                return ll?.targetLatency ? `${ll.targetLatency}s` : null;
            }),
            referenceCompositeId
        ),
        createRow(
            'Segment Duration',
            'Average or target segment duration.',
            'N/A',
            mapValues(
                (s) =>
                    s?.hls?.mediaPlaylistDetails?.averageSegmentDuration ||
                    s?.dash?.maxSegmentDuration
            ),
            referenceCompositeId,
            (v) => (v ? `${v.toFixed(2)}s` : 'N/A')
        ),
    ];

    // --- ABR Ladder Data (For Charts) ---
    const abrData = resolvedTargets.map((target) => {
        const videoTracks = target.summary?.videoTracks || [];
        return {
            name: `${target.streamName} [${target.label}]`,
            streamId: target.id,
            isReference: target.id === referenceCompositeId,
            tracks: videoTracks
                .map((t) => {
                    const resString =
                        t.resolutions && t.resolutions.length > 0
                            ? t.resolutions[0].value
                            : null;

                    let width = 0,
                        height = 0;

                    if (resString) {
                        const parts = resString.split('x');
                        width = parseInt(parts[0], 10) || 0;
                        height = parseInt(parts[1], 10) || 0;
                    }

                    return {
                        width,
                        height,
                        bandwidth: t.bandwidth,
                    };
                })
                .filter((t) => t.width && t.height && t.bandwidth),
        };
    });

    return {
        abrData,
        targetHeaders: resolvedTargets, // Pass headers to UI
        sections: [
            { title: 'General', icon: 'summary', points: generalPoints },
            { title: 'Segment Stats', icon: 'server', points: segmentPoints },
            {
                title: 'Video Details',
                icon: 'clapperboard',
                points: videoPoints,
            },
            { title: 'Audio Details', icon: 'audioLines', points: audioPoints },
            {
                title: 'Text & Accessibility',
                icon: 'fileText',
                points: textPoints,
            },
            { title: 'Security', icon: 'shieldCheck', points: securityPoints },
            { title: 'Timing & Latency', icon: 'timer', points: timingPoints },
        ],
    };
}