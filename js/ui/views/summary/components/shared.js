import { html } from 'lit-html';
import { tooltipTriggerClasses } from '../../../../shared/constants.js';

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
                ${value}
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
        headers = ['ID', 'Bitrate', 'Resolution', 'Codecs', 'Roles'];
        rows = tracks.map(
            (track) => html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">
                        ${track.bitrateRange || formatBitrate(track.bandwidth)}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.resolutions?.join(', ') ||
                        `${track.width}x${track.height}`}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.codecs?.join
                            ? track.codecs.join(', ')
                            : track.codecs || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">${track.roles?.join(', ') || 'N/A'}</td>
                </tr>
            `
        );
    } else if (type === 'audio') {
        headers = ['ID', 'Language', 'Codecs', 'Channels', 'Roles'];
        rows = tracks.map(
            (track) => html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">${track.lang || 'N/A'}</td>
                    <td class="p-2 font-mono">
                        ${track.codecs?.join
                            ? track.codecs.join(', ')
                            : track.codecs || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">
                        ${track.channels || 'N/A'}
                    </td>
                    <td class="p-2 font-mono">${track.roles?.join(', ') || 'N/A'}</td>
                </tr>
            `
        );
    } else {
        // text
        headers = ['ID', 'Language', 'Format', 'Roles'];
        rows = tracks.map(
            (track) => html`
                <tr>
                    <td class="p-2 font-mono">${track.id}</td>
                    <td class="p-2 font-mono">${track.lang || 'N/A'}</td>
                    <td class="p-2 font-mono">
                        ${track.codecsOrMimeTypes?.join(', ') ||
                        track.codecs ||
                        track.mimeType ||
                        'N/A'}
                    </td>
                    <td class="p-2 font-mono">${track.roles?.join(', ') || 'N/A'}</td>
                </tr>
            `
        );
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