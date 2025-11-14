import { formatBitrate } from '@/ui/shared/format';
import { appLog } from '@/shared/utils/debug';

const valueOrNA = (value) =>
    value !== null && value !== undefined ? value : 'N/A';

const renderList = (items) =>
    items && items.length > 0
        ? `<div class="flex flex-wrap gap-1">${items
              .map((item) => {
                  const value = typeof item === 'object' ? item.value : item;
                  return `<span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs">${value}</span>`;
              })
              .join('')}</div>`
        : 'N/A';

const createRow = (label, tooltip, isoRef, values) => {
    const firstValue = JSON.stringify(values[0]);
    const isSame = values.every((v) => JSON.stringify(v) === JSON.stringify(firstValue));
    const status = isSame ? 'same' : 'different';

    return {
        label,
        tooltip,
        isoRef,
        values: values.map((v) =>
            String(v === null || v === undefined || v === '' ? 'N/A' : v)
        ),
        status,
    };
};

export function createComparisonViewModel(streams) {
    const generalPoints = [
        createRow(
            'Type',
            'static (VOD) vs dynamic (live)',
            'DASH: 5.3.1.2 / HLS: 4.3.3.5',
            streams.map((s) => s.manifest?.type ?? 'N/A')
        ),
        createRow(
            'Profiles / Version',
            'Declared feature sets or HLS version.',
            'DASH: 8.1 / HLS: 4.3.1.2',
            streams.map((s) => valueOrNA(s.manifest?.profiles))
        ),
        createRow(
            'Min Buffer / Target Duration',
            'Minimum client buffer time (DASH) or max segment duration (HLS).',
            'DASH: 5.3.1.2 / HLS: 4.3.3.1',
            streams.map((s) => {
                const value =
                    s.manifest?.minBufferTime ??
                    s.manifest?.summary?.hls?.targetDuration;
                return value ? `${value}s` : 'N/A';
            })
        ),
        createRow(
            'Live Window (DVR)',
            'DVR window for live streams.',
            'DASH: 5.3.1.2',
            streams.map((s) => {
                if (s.manifest?.type !== 'dynamic') {
                    return 'N/A';
                }
                const value =
                    s.manifest?.timeShiftBufferDepth ??
                    s.manifest?.summary?.hls?.dvrWindow;
                return value ? `${value.toFixed(2)}s` : 'N/A';
            })
        ),
        createRow(
            'Segment Format',
            'The container format used for media segments (e.g., ISOBMFF or MPEG-2 TS).',
            'DASH: 5.3.7 / HLS: 4.3.2.5',
            streams.map((s) => valueOrNA(s.manifest?.segmentFormat))
        ),
    ];

    const abrData = streams.map((stream) => {
        const videoRepresentations =
            stream.manifest?.periods
                .flatMap((p) => p.adaptationSets)
                .filter((as) => as.contentType === 'video')
                .flatMap((as) => as.representations) || [];

        return {
            name: stream.name,
            tracks: videoRepresentations
                .map((rep) => ({
                    width: rep.width?.value,
                    height: rep.height?.value,
                    bandwidth: rep.bandwidth,
                }))
                .filter((t) => t.width && t.height && t.bandwidth),
        };
    });

    appLog('ComparisonViewModel', 'log', 'Generated ABR Ladder Data:', abrData);

    const videoPoints = [
        createRow(
            '# Video Quality Levels',
            'Total number of video tracks or variants.',
            'DASH: 5.3.5 / HLS: 4.3.4.2',
            streams.map((s) =>
                valueOrNA(s.manifest?.summary?.content.totalVideoTracks)
            )
        ),
        createRow(
            'Bitrate Range',
            'Min and Max bandwidth values for video from the manifest.',
            'DASH: 5.3.5.2 / HLS: 4.3.4.2',
            streams.map((s) => {
                const tracks = s.manifest?.summary?.videoTracks;
                if (!tracks || tracks.length === 0) return 'N/A';
                
                const bitrates = tracks
                    .map((track) => track.bandwidth)
                    .filter((b) => typeof b === 'number' && !isNaN(b));

                if (bitrates.length === 0) return 'N/A';

                const min = Math.min(...bitrates);
                const max = Math.max(...bitrates);

                if (min === max) return formatBitrate(min);
                return `${formatBitrate(min)} - ${formatBitrate(
                    max
                )}`;
            })
        ),
        createRow(
            'Video Resolutions',
            'List of unique video resolutions.',
            'DASH: 5.3.7.2 / HLS: 4.3.4.2',
            streams.map((s) =>
                renderList([
                    ...new Set(
                        s.manifest?.summary?.videoTracks.flatMap((vt) =>
                            vt.resolutions.map((r) => r.value)
                        ) || []
                    ),
                ])
            )
        ),
        createRow(
            'Video Codecs',
            'Unique video codecs found.',
            'DASH: 5.3.7.2 / HLS: 4.3.4.2',
            streams.map((s) =>
                renderList([
                    ...new Set(
                        s.manifest?.summary?.videoTracks.flatMap((vt) =>
                            vt.codecs.map((c) => c.value)
                        ) || []
                    ),
                ])
            )
        ),
    ];

    const audioPoints = [
        createRow(
            '# Audio Tracks',
            'Groups of audio tracks, often by language.',
            'DASH: 5.3.3 / HLS: 4.3.4.1',
            streams.map((s) =>
                valueOrNA(s.manifest?.summary?.content.totalAudioTracks)
            )
        ),
        createRow(
            'Audio Languages',
            'Declared languages for audio tracks.',
            'DASH: 5.3.3.2 / HLS: 4.3.4.1',
            streams.map((s) =>
                renderList([
                    ...new Set(
                        s.manifest?.summary?.audioTracks
                            .map((at) => at.lang)
                            .filter(Boolean) || []
                    ),
                ])
            )
        ),
        createRow(
            'Audio Codecs',
            'Unique audio codecs.',
            'DASH: 5.3.7.2 / HLS: 4.3.4.2',
            streams.map((s) =>
                renderList([
                    ...new Set(
                        s.manifest?.summary?.audioTracks.flatMap((at) =>
                            at.codecs.map((c) => c.value)
                        ) || []
                    ),
                ])
            )
        ),
    ];

    const securityPoints = [
        createRow(
            'Content Protection',
            'Detected DRM systems.',
            'DASH: 5.8.4.1 / HLS: 4.3.2.4',
            streams.map((s) =>
                s.manifest?.summary?.security?.isEncrypted
                    ? renderList(
                          s.manifest.summary.security.systems.map(
                              (sys) => sys.systemId
                          )
                      )
                    : 'No'
            )
        ),
    ];

    return [
        { title: 'General', points: generalPoints },
        { title: 'Video Details', points: videoPoints, abrData: abrData },
        { title: 'Audio Details', points: audioPoints },
        { title: 'Security', points: securityPoints },
    ];
}