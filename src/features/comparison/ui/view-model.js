import { formatBitrate } from '@/ui/shared/format';
import { dashFeatureDefinitions } from '@/infrastructure/parsing/dash/feature-definitions';
import { hlsFeatureDefinitions } from '@/infrastructure/parsing/hls/feature-definitions';

const renderList = (items) =>
    items && items.length > 0
        ? `<div class="flex flex-wrap gap-1">${items
              .map(
                  (item) =>
                      `<span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs">${
                          typeof item === 'object' ? item.value : item
                      }</span>`
              )
              .join('')}</div>`
        : 'N/A';

const createRow = (
    label,
    tooltip,
    isoRef,
    values,
    formatter = (v) => String(v ?? 'N/A')
) => {
    const valueGroups = new Map();
    let nextGroupId = 0;

    const valuesWithInfo = values.map((v) => {
        const valueString = JSON.stringify(v);
        let groupId = -1;
        let status = 'same'; // Default status

        if (v === null || v === undefined || v === '') {
            status = 'missing';
        } else {
            if (valueGroups.has(valueString)) {
                groupId = valueGroups.get(valueString);
            } else {
                groupId = nextGroupId++;
                valueGroups.set(valueString, groupId);
            }
        }

        return {
            value: formatter(v),
            groupId,
            status,
        };
    });

    const hasDifferences = valueGroups.size > 1;
    const overallStatus = !hasDifferences
        ? 'same'
        : values.some((v) => v === null || v === undefined || v === '')
          ? 'missing'
          : 'different';

    return {
        label,
        tooltip,
        isoRef,
        values: valuesWithInfo,
        status: overallStatus,
        isUsedByAny: values.some((v) => v === true),
    };
};

const createFeatureRows = (streams) => {
    const allFeatureDefs = [
        ...dashFeatureDefinitions,
        ...hlsFeatureDefinitions,
    ];
    const uniqueFeatureNames = [
        ...new Set(allFeatureDefs.map((f) => f.name)),
    ].sort();

    const featureFormatter = (value) => {
        if (value === true) {
            return `<span class="text-green-400 font-semibold">Used</span>`;
        }
        if (value === false) {
            return `<span class="text-slate-500">Not Used</span>`;
        }
        return 'N/A';
    };

    return uniqueFeatureNames.map((name) => {
        const def = allFeatureDefs.find((f) => f.name === name);
        const values = streams.map((s) => {
            const result = s.featureAnalysis.results.get(name);
            if (!result) return null;
            return result.used;
        });

        return createRow(name, def.desc, def.isoRef, values, featureFormatter);
    });
};

const createComplianceRows = (streams) => {
    const errorCounts = streams.map(
        (s) =>
            s.manifestUpdates[0]?.complianceResults.filter(
                (r) => r.status === 'fail'
            ).length || 0
    );
    const warningCounts = streams.map(
        (s) =>
            s.manifestUpdates[0]?.complianceResults.filter(
                (r) => r.status === 'warn'
            ).length || 0
    );

    return [
        createRow(
            'Errors',
            'Number of compliance rule failures.',
            '',
            errorCounts
        ),
        createRow(
            'Warnings',
            'Number of compliance rule warnings.',
            '',
            warningCounts
        ),
    ];
};

export function createComparisonViewModel(streams) {
    const generalPoints = [
        createRow(
            'Type',
            'static (VOD) vs dynamic (live)',
            'DASH: 5.3.1.2 / HLS: 4.3.3.5',
            streams.map((s) => s.manifest?.type ?? null)
        ),
        createRow(
            'Profiles / Version',
            'Declared feature sets or HLS version.',
            'DASH: 8.1 / HLS: 4.3.1.2',
            streams.map((s) => s.manifest?.profiles ?? null)
        ),
        createRow(
            'Segment Format',
            'The container format used for media segments (e.g., ISOBFF or MPEG-2 TS).',
            'DASH: 5.3.7 / HLS: 4.3.2.5',
            streams.map((s) => s.manifest?.segmentFormat ?? null)
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

    const videoPoints = [
        createRow(
            '# Video Quality Levels',
            'Total number of video tracks or variants.',
            'DASH: 5.3.5 / HLS: 4.3.4.2',
            streams.map(
                (s) => s.manifest?.summary?.content.totalVideoTracks ?? null
            )
        ),
        createRow(
            'Bitrate Range',
            'Min and Max bandwidth values for video from the manifest.',
            'DASH: 5.3.5.2 / HLS: 4.3.4.2',
            streams.map((s) => {
                const tracks = s.manifest?.summary?.videoTracks;
                if (!tracks || tracks.length === 0) return null;
                const bitrates = tracks
                    .map((track) => track.bandwidth)
                    .filter((b) => typeof b === 'number' && !isNaN(b));
                if (bitrates.length === 0) return null;
                const min = Math.min(...bitrates);
                const max = Math.max(...bitrates);
                if (min === max) return formatBitrate(min);
                return `${formatBitrate(min)} - ${formatBitrate(max)}`;
            })
        ),
        createRow(
            'Video Resolutions',
            'List of unique video resolutions.',
            'DASH: 5.3.7.2 / HLS: 4.3.4.2',
            streams.map((s) =>
                renderList(
                    [
                        ...new Set(
                            s.manifest?.summary?.videoTracks.flatMap(
                                (vt) => vt.resolutions.map((r) => r.value) || []
                            )
                        ),
                    ].sort()
                )
            )
        ),
        createRow(
            'Video Codecs',
            'Unique video codecs found.',
            'DASH: 5.3.7.2 / HLS: 4.3.4.2',
            streams.map((s) =>
                renderList(
                    [
                        ...new Set(
                            s.manifest?.summary?.videoTracks.flatMap(
                                (vt) => vt.codecs.map((c) => c.value) || []
                            )
                        ),
                    ].sort()
                )
            )
        ),
    ];

    const audioPoints = [
        createRow(
            '# Audio Tracks',
            'Groups of audio tracks, often by language.',
            'DASH: 5.3.3 / HLS: 4.3.4.1',
            streams.map(
                (s) => s.manifest?.summary?.content.totalAudioTracks ?? null
            )
        ),
        createRow(
            'Audio Languages',
            'Declared languages for audio tracks.',
            'DASH: 5.3.3.2 / HLS: 4.3.4.1',
            streams.map((s) =>
                renderList(
                    [
                        ...new Set(
                            s.manifest?.summary?.audioTracks
                                .map((at) => at.lang)
                                .filter(Boolean) || []
                        ),
                    ].sort()
                )
            )
        ),
        createRow(
            'Audio Codecs',
            'Unique audio codecs.',
            'DASH: 5.3.7.2 / HLS: 4.3.4.2',
            streams.map((s) =>
                renderList(
                    [
                        ...new Set(
                            s.manifest?.summary?.audioTracks.flatMap(
                                (at) => at.codecs.map((c) => c.value) || []
                            )
                        ),
                    ].sort()
                )
            )
        ),
    ];

    const securityPoints = [
        createRow(
            'Encrypted',
            'Whether content protection is signaled.',
            'DASH: 5.8.4.1 / HLS: 4.3.2.4',
            streams.map((s) =>
                s.manifest?.summary?.security?.isEncrypted ? 'Yes' : 'No'
            )
        ),
        createRow(
            'DRM Systems',
            'Detected DRM systems.',
            'DASH: 5.8.4.1 / HLS: 4.3.2.4',
            streams.map((s) =>
                renderList(
                    s.manifest?.summary?.security?.systems.map(
                        (sys) => sys.name
                    ) || []
                )
            )
        ),
    ];

    return {
        abrData,
        sections: [
            { title: 'General', icon: 'summary', points: generalPoints },
            {
                title: 'Video Details',
                icon: 'clapperboard',
                points: videoPoints,
            },
            {
                title: 'Audio Details',
                icon: 'audio-lines',
                points: audioPoints,
            },
            {
                title: 'Security',
                icon: 'shield-check',
                points: securityPoints,
            },
            {
                title: 'Feature Usage',
                icon: 'features',
                points: createFeatureRows(streams),
            },
            {
                title: 'Compliance',
                icon: 'compliance',
                points: createComplianceRows(streams),
            },
        ],
    };
}
