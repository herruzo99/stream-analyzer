import { html } from 'lit-html';
import { analysisState } from '../../core/state.js';
import { tooltipTriggerClasses } from '../../shared/constants.js';
import { getDrmSystemName } from '../../shared/utils/drm.js';

const formatBitrate = (bps) => {
    if (!bps || isNaN(bps)) return 'N/A';
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    return `${(bps / 1000).toFixed(0)} kbps`;
};

const sections = {
    'Manifest Properties': [
        {
            label: 'Type',
            tooltip: 'static vs dynamic',
            iso: 'Clause 5.3.1.2',
            accessor: (manifest) => manifest.getAttribute('type'),
        },
        {
            label: 'Profiles',
            tooltip: 'Declared feature sets',
            iso: 'Clause 8.1',
            accessor: (manifest) =>
                (manifest.getAttribute('profiles') || '')
                    .replace(/urn:mpeg:dash:profile:/g, ' ')
                    .trim(),
        },
        {
            label: 'Min Buffer Time',
            tooltip: 'Minimum client buffer time.',
            iso: 'Clause 5.3.1.2',
            accessor: (manifest) =>
                manifest.getAttribute('minBufferTime') || 'N/A',
        },
        {
            label: 'Live Window',
            tooltip: 'DVR window for live streams.',
            iso: 'Clause 5.3.1.2',
            accessor: (manifest) =>
                manifest.getAttribute('timeShiftBufferDepth') || 'N/A',
        },
    ],
    'Content Overview': [
        {
            label: '# of Periods',
            tooltip: 'Number of content periods.',
            iso: 'Clause 5.3.2',
            accessor: (manifest) => manifest.querySelectorAll('Period').length,
        },
        {
            label: 'Content Protection',
            tooltip: 'Detected DRM systems.',
            iso: 'Clause 5.8.4.1',
            accessor: (manifest) => {
                const schemes = [
                    ...new Set(
                        Array.from(
                            manifest.querySelectorAll('ContentProtection')
                        ).map((cp) =>
                            getDrmSystemName(cp.getAttribute('schemeIdUri'))
                        )
                    ),
                ];
                return schemes.length > 0 ? schemes.join(', ') : 'No';
            },
        },
    ],
    'Video Details': [
        {
            label: '# Video Reps',
            tooltip: 'Total number of video quality levels.',
            iso: 'Clause 5.3.5',
            accessor: (manifest) =>
                manifest.querySelectorAll(
                    'AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation'
                ).length,
        },
        {
            label: 'Video Bitrates',
            tooltip: 'Min and Max bandwidth values for video.',
            iso: 'Table 9',
            accessor: (manifest) => {
                const b = Array.from(
                    manifest.querySelectorAll(
                        'AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation'
                    )
                ).map((r) => parseInt(r.getAttribute('bandwidth')));
                return b.length
                    ? `${formatBitrate(Math.min(...b))} - ${formatBitrate(
                          Math.max(...b)
                      )}`
                    : 'N/A';
            },
        },
        {
            label: 'Video Resolutions',
            tooltip: 'List of unique video resolutions.',
            iso: 'Table 14',
            accessor: (manifest) => {
                const res = [
                    ...new Set(
                        Array.from(
                            manifest.querySelectorAll(
                                'AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation'
                            )
                        ).map((r) => {
                            const as = r.closest('AdaptationSet');
                            const width =
                                r.getAttribute('width') ||
                                as.getAttribute('width');
                            const height =
                                r.getAttribute('height') ||
                                as.getAttribute('height');
                            return `${width}x${height}`;
                        })
                    ),
                ];
                return res.map((r) => html`<div>${r}</div>`);
            },
        },
        {
            label: 'Video Codecs',
            tooltip: 'Unique video codecs.',
            iso: 'Table 14',
            accessor: (manifest) => {
                const codecs = [
                    ...new Set(
                        Array.from(
                            manifest.querySelectorAll(
                                'AdaptationSet[contentType="video"] Representation, AdaptationSet[mimeType^="video"] Representation'
                            )
                        ).map(
                            (r) =>
                                r.getAttribute('codecs') ||
                                r
                                    .closest('AdaptationSet')
                                    .getAttribute('codecs')
                        )
                    ),
                ];
                return codecs
                    .filter(Boolean)
                    .map((c) => html`<div>${c}</div>`);
            },
        },
    ],
    'Audio Details': [
        {
            label: '# Audio Tracks',
            tooltip: 'Groups of audio tracks, often by language.',
            iso: 'Clause 5.3.3',
            accessor: (manifest) =>
                manifest.querySelectorAll(
                    'AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]'
                ).length,
        },
        {
            label: 'Audio Languages',
            tooltip: 'Declared languages for audio tracks.',
            iso: 'Table 5',
            accessor: (manifest) => {
                const langs = [
                    ...new Set(
                        Array.from(
                            manifest.querySelectorAll(
                                'AdaptationSet[contentType="audio"], AdaptationSet[mimeType^="audio"]'
                            )
                        ).map((as) => as.getAttribute('lang'))
                    ),
                ];
                return langs.filter(Boolean).join(', ') || 'N/A';
            },
        },
        {
            label: 'Audio Codecs',
            tooltip: 'Unique audio codecs.',
            iso: 'Table 14',
            accessor: (manifest) => {
                const codecs = [
                    ...new Set(
                        Array.from(
                            manifest.querySelectorAll(
                                'AdaptationSet[contentType="audio"] Representation, AdaptationSet[mimeType^="audio"] Representation'
                            )
                        ).map(
                            (r) =>
                                r.getAttribute('codecs') ||
                                r
                                    .closest('AdaptationSet')
                                    .getAttribute('codecs')
                        )
                    ),
                ];
                return codecs
                    .filter(Boolean)
                    .map((c) => html`<div>${c}</div>`);
            },
        },
    ],
};

const sectionTemplate = (title, items, streams) => html`
    <h3 class="text-xl font-bold mt-6 mb-2">${title}</h3>
    <div
        class="grid border-t border-l border-gray-700 divide-y divide-gray-700"
        style="grid-template-columns: 200px repeat(${streams.length}, 1fr);"
    >
        <!-- Header Row -->
        <div
            class="font-semibold text-gray-400 p-2 border-r border-b border-gray-700"
        >
            Property
        </div>
        ${streams.map(
            (stream) =>
                html`<div
                    class="font-semibold text-gray-400 p-2 border-r border-b border-gray-700"
                >
                    ${stream.name}
                </div>`
        )}
        <!-- Data Rows -->
        ${items.map(
            (item) => html`
                <div
                    class="font-medium text-gray-400 p-2 border-r border-gray-700 ${tooltipTriggerClasses}"
                    data-tooltip="${item.tooltip}"
                    data-iso="${item.iso}"
                >
                    ${item.label}
                </div>
                ${streams.map(
                    (stream) =>
                        html`<div
                            class="p-2 font-mono text-sm border-r border-gray-700"
                        >
                            ${item.accessor(
                                /** @type {Element} */ (
                                    stream.manifest.rawElement
                                )
                            )}
                        </div>`
                )}
            `
        )}
    </div>
`;

export function getComparisonTemplate() {
    const dashStreams = analysisState.streams.filter(
        (s) => s.protocol === 'dash'
    );

    if (analysisState.streams.length < 2) {
        return html``; // Should not be visible anyway
    }

    if (dashStreams.length < 2) {
        return html`<div class="text-center p-8">
            <p class="text-lg text-gray-400">
                Comparison view currently only supports DASH streams.
            </p>
            <p class="text-sm text-gray-500 mt-2">
                Please select at least two DASH streams to compare.
            </p>
        </div>`;
    }

    return html`
        ${Object.entries(sections).map(([title, items]) =>
            sectionTemplate(title, items, dashStreams)
        )}
    `;
}