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
    values, // Array of { streamId, value }
    referenceStreamId,
    formatter = (v) => String(v ?? 'N/A')
) => {
    // Find the reference value
    const refEntry = values.find((v) => v.streamId === referenceStreamId);
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
        } else if (
            referenceStreamId !== null &&
            referenceStreamId !== undefined
        ) {
            // Compare against reference
            // If this is the reference stream itself, it's always a match
            if (entry.streamId === referenceStreamId) {
                status = 'match';
            } else if (valString === refString) {
                status = 'match';
            } else {
                status = 'diff';
            }
        } else {
            // No reference selected: check if all are same
            // We compare the current value against ALL other values in the row.
            const allSame = values.every(
                (v) => JSON.stringify(v.value) === valString
            );
            status = allSame ? 'match' : 'diff';
        }

        return {
            streamId: entry.streamId,
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
 * @param {import('@/types').Stream[]} streams
 * @param {number | null} referenceStreamId
 */
export function createComparisonViewModel(streams, referenceStreamId) {
    const mapValues = (accessor) =>
        streams.map((s) => ({ streamId: s.id, value: accessor(s) }));

    // Helper to access the normalized summary safely
    const summary = (s) => s.manifest?.summary;

    // --- 1. General Configuration ---
    const generalPoints = [
        createRow(
            'Protocol',
            'Streaming protocol used.',
            'N/A',
            mapValues((s) => summary(s)?.general.protocol),
            referenceStreamId
        ),
        createRow(
            'Type',
            'static (VOD) vs dynamic (live)',
            'DASH: 5.3.1.2 / HLS: 4.3.3.5',
            mapValues((s) => summary(s)?.general.streamType),
            referenceStreamId
        ),
        createRow(
            'Profiles / Version',
            'Declared feature sets or HLS version.',
            'DASH: 8.1 / HLS: 4.3.1.2',
            mapValues((s) =>
                s.protocol === 'dash'
                    ? summary(s)?.dash?.profiles
                    : `v${summary(s)?.hls?.version}`
            ),
            referenceStreamId
        ),
        createRow(
            'Duration',
            'Total duration of the content.',
            'N/A',
            mapValues((s) => summary(s)?.general.duration),
            referenceStreamId,
            (v) => (v ? `${v.toFixed(2)}s` : 'Unknown')
        ),
    ];

    // --- 2. Video Configuration ---
    const videoPoints = [
        createRow(
            'Track Count',
            'Total number of video tracks/variants.',
            'N/A',
            mapValues((s) => summary(s)?.content.totalVideoTracks ?? 0),
            referenceStreamId
        ),
        createRow(
            'Max Bitrate',
            'Highest available video bitrate.',
            'N/A',
            mapValues((s) => {
                const tracks = summary(s)?.videoTracks || [];
                if (tracks.length === 0) return 0;
                return Math.max(...tracks.map((t) => t.bandwidth));
            }),
            referenceStreamId,
            formatBitrate
        ),
        createRow(
            'Codecs',
            'Video codecs used.',
            'ISO/IEC 14496-15',
            mapValues((s) => {
                const tracks = summary(s)?.videoTracks || [];
                // Extract unique codecs prefixes (e.g., avc1, hvc1)
                const codecs = new Set(
                    tracks.flatMap((t) =>
                        t.codecs.map((c) => c.value.split('.')[0])
                    )
                );
                return Array.from(codecs).sort();
            }),
            referenceStreamId,
            renderList
        ),
        createRow(
            'Video Range',
            'Dynamic range (SDR, HLG, PQ).',
            'N/A',
            mapValues((s) => {
                const tracks = summary(s)?.videoTracks || [];
                return (
                    Array.from(
                        new Set(tracks.map((t) => t.videoRange).filter(Boolean))
                    ).join(', ') || 'SDR'
                );
            }),
            referenceStreamId
        ),
    ];

    // --- 3. Audio Configuration ---
    const audioPoints = [
        createRow(
            'Track Count',
            'Total number of audio renditions.',
            'N/A',
            mapValues((s) => summary(s)?.content.totalAudioTracks ?? 0),
            referenceStreamId
        ),
        createRow(
            'Codecs',
            'Audio codecs used.',
            'N/A',
            mapValues((s) => {
                const tracks = summary(s)?.audioTracks || [];
                const codecs = new Set(
                    tracks.flatMap((t) =>
                        t.codecs.map((c) => c.value.split('.')[0])
                    )
                );
                return Array.from(codecs).sort();
            }),
            referenceStreamId,
            renderList
        ),
        createRow(
            'Languages',
            'Available audio languages.',
            'RFC 5646',
            mapValues((s) => {
                const tracks = summary(s)?.audioTracks || [];
                return Array.from(
                    new Set(tracks.map((t) => t.lang).filter(Boolean))
                ).sort();
            }),
            referenceStreamId,
            renderList
        ),
    ];

    // --- 4. Text / Accessibility ---
    const textPoints = [
        createRow(
            'Track Count',
            'Total number of text/subtitle tracks.',
            'N/A',
            mapValues((s) => summary(s)?.content.totalTextTracks ?? 0),
            referenceStreamId
        ),
        createRow(
            'Formats',
            'Subtitle formats (e.g. vtt, stpp).',
            'N/A',
            mapValues((s) => {
                const tracks = summary(s)?.textTracks || [];
                const formats = new Set(
                    tracks.flatMap((t) =>
                        t.codecsOrMimeTypes.map((c) => c.value)
                    )
                );
                return Array.from(formats);
            }),
            referenceStreamId,
            renderList
        ),
        createRow(
            'Forced Subs',
            'Contains forced subtitles for translation.',
            'N/A',
            mapValues((s) =>
                (summary(s)?.textTracks || []).some((t) => t.isForced)
            ),
            referenceStreamId,
            (v) => (v ? 'Yes' : 'No')
        ),
    ];

    // --- 5. Security / DRM ---
    const securityPoints = [
        createRow(
            'Encryption',
            'Is the content encrypted?',
            'CENC / HLS',
            mapValues((s) => summary(s)?.security?.isEncrypted),
            referenceStreamId,
            (v) => (v ? 'Encrypted' : 'Clear')
        ),
        createRow(
            'DRM Systems',
            'Supported DRM Systems.',
            'PSSH / EXT-X-KEY',
            mapValues((s) => {
                const systems = summary(s)?.security?.systems || [];
                return systems.map((sys) => {
                    const uuid = sys.systemId.toLowerCase();
                    if (uuid.includes('edef8ba9')) return 'Widevine';
                    if (uuid.includes('9a04f079')) return 'PlayReady';
                    if (uuid.includes('94ce86fb')) return 'FairPlay';
                    return 'Unknown';
                });
            }),
            referenceStreamId,
            renderList
        ),
        createRow(
            'License Servers',
            'Distinct license server URLs detected.',
            'N/A',
            mapValues(
                (s) => (summary(s)?.security?.licenseServerUrls || []).length
            ),
            referenceStreamId
        ),
    ];

    // --- 6. Timing & Latency ---
    const timingPoints = [
        createRow(
            'Low Latency Mode',
            'Is low-latency streaming signaled?',
            'LL-HLS / LL-DASH',
            mapValues((s) => summary(s)?.lowLatency?.isLowLatency),
            referenceStreamId,
            (v) => (v ? 'Enabled' : 'Standard')
        ),
        createRow(
            'Target Latency',
            'Suggested end-to-end latency.',
            'N/A',
            mapValues((s) => {
                const ll = summary(s)?.lowLatency;
                return ll?.targetLatency ? `${ll.targetLatency}s` : null;
            }),
            referenceStreamId
        ),
        createRow(
            'Segment Duration',
            'Average or target segment duration.',
            'N/A',
            mapValues((s) => {
                const sum = summary(s);
                if (sum?.hls?.targetDuration)
                    return `${sum.hls.targetDuration}s`;
                if (sum?.dash?.maxSegmentDuration)
                    return `~${sum.dash.maxSegmentDuration}s`;
                return null;
            }),
            referenceStreamId
        ),
    ];

    // --- ABR Ladder Data ---
    const abrData = streams.map((stream) => {
        const videoTracks = summary(stream)?.videoTracks || [];
        return {
            name: stream.name,
            streamId: stream.id,
            isReference: stream.id === referenceStreamId,
            tracks: videoTracks
                .map((t) => ({
                    width: t.resolutions[0]?.value.split('x')[0],
                    height: t.resolutions[0]?.value.split('x')[1],
                    bandwidth: t.bandwidth,
                }))
                .filter((t) => t.width && t.height && t.bandwidth),
        };
    });

    return {
        abrData,
        sections: [
            { title: 'General', icon: 'summary', points: generalPoints },
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
