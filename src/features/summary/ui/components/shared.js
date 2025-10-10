import { html } from 'lit-html';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

const renderSourcedValue = (sourcedData) => {
    if (
        typeof sourcedData === 'object' &&
        sourcedData !== null &&
        'source' in sourcedData
    ) {
        return html`${sourcedData.value}${sourcedData.source === 'segment'
            ? html`<span
                  class="ml-1 text-cyan-400 ${tooltipTriggerClasses}"
                  data-tooltip="This value was derived by inspecting a media segment, not from the manifest."
                  >🔬</span
              >`
            : ''}`;
    }
    return sourcedData;
};

export const statCardTemplate = (
    label,
    value,
    tooltipText,
    isoRef,
    customClasses = ''
) => {
    if (
        value === null ||
        value === undefined ||
        (typeof value === 'object' && value.value === null) ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
    )
        return '';
    const testId = `stat-card-${label.toLowerCase().replace(/[\s/]+/g, '-')}`;
    return html`
        <div
            data-testid="${testId}"
            class="bg-gray-800 p-3 rounded-lg border border-gray-700 ${customClasses}"
        >
            <dt
                class="text-xs font-medium text-gray-400 ${tooltipTriggerClasses}"
                data-tooltip="${tooltipText}"
                data-iso="${isoRef}"
            >
                ${label}
            </dt>
            <dd
                class="text-base text-left font-mono text-white mt-1 break-words"
            >
                ${renderSourcedValue(value)}
            </dd>
        </div>
    `;
};

export const listCardTemplate = ({ label, items, tooltip, isoRef = null }) => {
    if (!items || items.length === 0) return '';
    return html`
        <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <dt
                class="text-xs font-medium text-gray-400 ${tooltipTriggerClasses}"
                data-tooltip="${tooltip}"
                data-iso="${isoRef || ''}"
            >
                ${label}
            </dt>
            <dd class="text-sm text-left font-mono text-white mt-2 space-y-1">
                ${items.map(
                    (item) =>
                        html`<div class="bg-gray-900/50 p-1 rounded">
                            ${renderSourcedValue(item)}
                        </div>`
                )}
            </dd>
        </div>
    `;
};

export const trackTableTemplate = (tracks, type) => {
    if (!tracks || tracks.length === 0) return '';
    let headers;
    let rows;

    const formatBitrate = (bps) => {
        if (typeof bps === 'string' && bps.includes('bps')) return bps;
        if (!bps || isNaN(bps)) return 'N/A';
        if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
        return `${(bps / 1000).toFixed(0)} kbps`;
    };

    if (type === 'video') {
        headers = [
            'ID',
            'Bitrate',
            'Resolution',
            'Codecs',
            'Roles',
            'Dependencies',
        ];
        rows = tracks.map((track) => {
            const codecs = Array.isArray(track.codecs)
                ? track.codecs
                : track.codecs?.value
                  ? [track.codecs]
                  : [];
            const resolutions = Array.isArray(track.resolutions)
                ? track.resolutions
                : track.width?.value
                  ? [
                        {
                            value: `${track.width.value}x${track.height.value}`,
                            source: track.width.source,
                        },
                    ]
                  : [];
            return html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">
                        ${track.bitrateRange || formatBitrate(track.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">
                        ${resolutions.length > 0
                            ? resolutions.map(
                                  (res, i) =>
                                      html`${i > 0
                                          ? ', '
                                          : ''}${renderSourcedValue(res)}`
                              )
                            : 'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${codecs.map(
                            (codec, i) =>
                                html`${i > 0 ? ', ' : ''}${renderSourcedValue(
                                    codec
                                )}`
                        ) || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.roles?.join(', ') || 'N/A'}
                    </td>
                    <td
                        class="p-2 font-mono ${tooltipTriggerClasses}"
                        data-tooltip="A list of other Representation IDs that this Representation depends on for decoding (e.g., for Scalable Video Coding)."
                        data-iso="DASH: 5.3.5.2"
                    >
                        ${track.dependencyId || 'N/A'}
                    </td>
                </tr>
            `;
        });
    } else if (type === 'audio') {
        headers = ['ID', 'Language', 'Codecs', 'Channels', 'Roles'];
        rows = tracks.map((track) => {
            const codecs = Array.isArray(track.codecs)
                ? track.codecs
                : track.codecs?.value
                  ? [track.codecs]
                  : [];
            return html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">${track.lang || 'N/A'}</td>
                    <td class="p-2 font-mono">
                        ${codecs.map(
                            (codec, i) =>
                                html`${i > 0 ? ', ' : ''}${renderSourcedValue(
                                    codec
                                )}`
                        ) || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">${track.channels || 'N/A'}</td>
                    <td class="p-2 font-mono">
                        ${track.roles?.join(', ') || 'N/A'}
                    </td>
                </tr>
            `;
        });
    } else {
        // text
        headers = ['ID', 'Language', 'Format', 'Roles'];
        rows = tracks.map((track) => {
            const codecsOrMimeTypes = Array.isArray(track.codecsOrMimeTypes)
                ? track.codecsOrMimeTypes
                : track.codecs?.value || track.mimeType
                  ? [
                        track.codecs || {
                            value: track.mimeType,
                            source: 'manifest',
                        },
                    ]
                  : [];
            return html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">${track.lang || 'N/A'}</td>
                    <td class="p-2 font-mono">
                        ${codecsOrMimeTypes.map(
                            (item, i) =>
                                html`${i > 0 ? ', ' : ''}${renderSourcedValue(
                                    item
                                )}`
                        ) || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.roles?.join(', ') || 'N/A'}
                    </td>
                </tr>
            `;
        });
    }

    return html`
        <div
            class="bg-gray-900/50 rounded border border-gray-700/50 overflow-x-auto"
        >
            <table class="w-full text-left text-xs min-w-[600px]">
                <thead class="bg-gray-800/50">
                    <tr>
                        ${headers.map(
                            (h) =>
                                html`<th
                                    class="p-2 font-semibold text-gray-400"
                                >
                                    ${h}
                                </th>`
                        )}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700/50">
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
};
