const valueOrNA = (value) =>
    value !== null && value !== undefined ? value : 'N/A';

const renderList = (items) =>
    items && items.length > 0
        ? items.map((item) => `<div>${item}</div>`).join('')
        : 'N/A';

/**
 * Defines the points of comparison and contains the logic to extract
 * data for each stream from the new summary model.
 * @param {import('../../../core/types.js').Stream[]} streams
 * @returns {object[]} An array of comparison point objects ready for rendering.
 */
export function createComparisonViewModel(streams) {
    const comparisonPoints = [
        // --- Manifest Properties ---
        {
            label: 'Type',
            tooltip: 'static (VOD) vs dynamic (live)',
            isoRef: 'DASH: 5.3.1.2 / HLS: 4.3.3.5',
            values: streams.map((s) =>
                valueOrNA(
                    s.manifest?.summary.general.streamType.startsWith('Live')
                        ? 'dynamic'
                        : 'static'
                )
            ),
        },
        {
            label: 'Profiles / Version',
            tooltip: 'Declared feature sets or HLS version.',
            isoRef: 'DASH: 8.1 / HLS: 4.3.1.2',
            values: streams.map((s) =>
                valueOrNA(
                    s.manifest?.summary.dash?.profiles ||
                        `Version ${s.manifest?.summary.hls?.version}`
                )
            ),
        },
        {
            label: 'Min Buffer / Target Duration',
            tooltip:
                'Minimum client buffer time (DASH) or max segment duration (HLS).',
            isoRef: 'DASH: 5.3.1.2 / HLS: 4.3.3.1',
            values: streams.map((s) => {
                const val =
                    s.manifest?.summary.dash?.minBufferTime ??
                    s.manifest?.summary.hls?.targetDuration;
                return val ? `${val}s` : 'N/A';
            }),
        },
        {
            label: 'Live Window',
            tooltip: 'DVR window for live streams.',
            isoRef: 'DASH: 5.3.1.2',
            values: streams.map((s) =>
                s.manifest?.summary.dash?.timeShiftBufferDepth
                    ? `${s.manifest.summary.dash.timeShiftBufferDepth}s`
                    : 'N/A'
            ),
        },
        {
            label: 'Segment Format',
            tooltip:
                'The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).',
            isoRef: 'DASH: 5.3.7 / HLS: 4.3.2.5',
            values: streams.map((s) =>
                valueOrNA(s.manifest?.summary.general.segmentFormat)
            ),
        },
        // --- Content Overview ---
        {
            label: '# of Periods',
            tooltip: 'Number of content periods (DASH-specific).',
            isoRef: 'DASH: 5.3.2',
            values: streams.map((s) =>
                s.protocol === 'dash'
                    ? String(s.manifest?.summary.content.totalPeriods || 0)
                    : 'N/A'
            ),
        },
        {
            label: 'Content Protection',
            tooltip: 'Detected DRM systems.',
            isoRef: 'DASH: 5.8.4.1 / HLS: 4.3.2.4',
            values: streams.map((s) => {
                const security = s.manifest?.summary.security;
                return security?.isEncrypted
                    ? security.systems.join(', ')
                    : 'No';
            }),
        },
        // --- Video Details ---
        {
            label: '# Video Quality Levels',
            tooltip: 'Total number of video tracks or variants.',
            isoRef: 'DASH: 5.3.5 / HLS: 4.3.4.2',
            values: streams.map((s) =>
                String(s.manifest?.summary.content.totalVideoTracks || 0)
            ),
        },
        {
            label: 'Video Bitrate Range',
            tooltip: 'Min and Max bandwidth values for video.',
            isoRef: 'DASH: 5.3.5.2 / HLS: 4.3.4.2',
            values: streams.map((s) =>
                s.manifest?.summary.videoTracks.length > 0
                    ? s.manifest.summary.videoTracks[0].bitrateRange
                    : 'N/A'
            ),
        },
        {
            label: 'Video Resolutions',
            tooltip: 'List of unique video resolutions.',
            isoRef: 'DASH: 5.3.7.2 / HLS: 4.3.4.2',
            values: streams.map((s) =>
                renderList([
                    ...new Set(
                        s.manifest?.summary.videoTracks.flatMap(
                            (vt) => vt.resolutions
                        )
                    ),
                ])
            ),
        },
        {
            label: 'Video Codecs',
            tooltip: 'Unique video codecs found.',
            isoRef: 'DASH: 5.3.7.2 / HLS: 4.3.4.2',
            values: streams.map((s) =>
                renderList([
                    ...new Set(
                        s.manifest?.summary.videoTracks.flatMap(
                            (vt) => vt.codecs
                        )
                    ),
                ])
            ),
        },
        // --- Audio Details ---
        {
            label: '# Audio Tracks',
            tooltip: 'Groups of audio tracks, often by language.',
            isoRef: 'DASH: 5.3.3 / HLS: 4.3.4.1',
            values: streams.map((s) =>
                String(s.manifest?.summary.content.totalAudioTracks || 0)
            ),
        },
        {
            label: 'Audio Languages',
            tooltip: 'Declared languages for audio tracks.',
            isoRef: 'DASH: 5.3.3.2 / HLS: 4.3.4.1',
            values: streams.map((s) => {
                const languages = [
                    ...new Set(
                        s.manifest?.summary.audioTracks
                            .map((at) => at.lang)
                            .filter(Boolean)
                    ),
                ];
                return languages.length > 0
                    ? languages.join(', ')
                    : 'Not Specified';
            }),
        },
        {
            label: 'Audio Codecs',
            tooltip: 'Unique audio codecs.',
            isoRef: 'DASH: 5.3.7.2 / HLS: 4.3.4.2',
            values: streams.map((s) =>
                renderList([
                    ...new Set(
                        s.manifest?.summary.audioTracks.flatMap(
                            (at) => at.codecs
                        )
                    ),
                ])
            ),
        },
        // --- Accessibility & Metadata ---
        {
            label: '# of Text Tracks',
            tooltip: 'Number of subtitle or caption tracks.',
            isoRef: 'DASH: 5.3.3 / HLS: 4.3.4.1',
            values: streams.map((s) =>
                String(s.manifest?.summary.content.totalTextTracks || 0)
            ),
        },
        {
            label: 'Text Languages',
            tooltip: 'Declared languages for subtitle/caption tracks.',
            isoRef: 'DASH: 5.3.3.2 / HLS: 4.3.4.1',
            values: streams.map((s) => {
                const languages = [
                    ...new Set(
                        s.manifest?.summary.textTracks
                            .map((tt) => tt.lang)
                            .filter(Boolean)
                    ),
                ];
                return languages.length > 0
                    ? languages.join(', ')
                    : 'Not Specified';
            }),
        },
        {
            label: 'Text Formats',
            tooltip: 'MIME types or codecs for text tracks.',
            isoRef: 'DASH: 5.3.7.2',
            values: streams.map((s) =>
                renderList([
                    ...new Set(
                        s.manifest?.summary.textTracks.flatMap(
                            (tt) => tt.codecsOrMimeTypes
                        )
                    ),
                ])
            ),
        },
        {
            label: 'Video Range',
            tooltip: 'Dynamic range of the video content (SDR, PQ, HLG).',
            isoRef: 'HLS 2nd Ed: 4.4.6.2',
            values: streams.map((s) =>
                valueOrNA(
                    [
                        ...new Set(
                            s.manifest?.summary.videoTracks
                                .map((vt) => vt.videoRange)
                                .filter(Boolean)
                        ),
                    ].join(', ')
                )
            ),
        },
    ];

    const groupByCategory = (points) => [
        {
            title: 'Manifest Properties',
            points: points.slice(0, 5),
        },
        {
            title: 'Content Overview',
            points: points.slice(5, 7),
        },
        {
            title: 'Video Details',
            points: points.slice(7, 11),
        },
        {
            title: 'Audio Details',
            points: points.slice(11, 14),
        },
        {
            title: 'Accessibility & Metadata',
            points: points.slice(14, 18),
        },
    ];

    return groupByCategory(comparisonPoints);
}
