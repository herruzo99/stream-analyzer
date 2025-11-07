import { html } from 'lit-html';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { isCodecSupported } from '@/infrastructure/parsing/utils/codec-support';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';

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

    if (typeof sourcedData === 'boolean') {
        return sourcedData
            ? html`<span class="text-success font-semibold">Yes</span>`
            : html`<span class="text-slate-400">No</span>`;
    }

    if (
        sourcedData === null ||
        sourcedData === undefined ||
        sourcedData === ''
    ) {
        return html`<span class="text-slate-500">N/A</span>`;
    }

    return sourcedData;
};

export const renderCodecInfo = (codecInfo) => {
    const supportedIcon = codecInfo.supported
        ? icons.checkCircle
        : icons.xCircleRed;
    const colorClass = codecInfo.supported ? 'text-green-400' : 'text-red-400';
    const tooltip = codecInfo.supported
        ? 'Codec is supported by internal parsers.'
        : 'Codec is not supported by internal parsers. Playback may fail.';

    return html`<div class="flex items-center">
        ${renderSourcedValue(codecInfo)}${html`<span
            class="inline-block ml-2 shrink-0 ${colorClass} ${tooltipTriggerClasses}"
            data-tooltip=${tooltip}
            >${supportedIcon}</span
        >`}
    </div>`;
};

export const statCardTemplate = ({
    label,
    value,
    tooltip = '',
    isoRef = null,
    customClasses = '',
    icon = null,
    iconBgClass = 'bg-slate-800 text-slate-400',
}) => {
    if (value === null || value === undefined) {
        return '';
    }

    return html`
        <div
            class="bg-slate-900 p-3 rounded-lg border border-slate-700 flex items-center gap-4 ${customClasses}"
        >
            ${icon
                ? html`<div
                      class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBgClass}"
                  >
                      ${icon}
                  </div>`
                : ''}
            <div class="grow">
                <dt
                    class="text-xs font-medium text-slate-400 ${tooltipTriggerClasses}"
                    data-tooltip="${tooltip}"
                    data-iso="${isoRef}"
                >
                    ${label}
                </dt>
                <dd
                    class="text-base text-left font-mono text-white mt-1 wrap-break-word"
                >
                    ${renderSourcedValue(value)}
                </dd>
            </div>
        </div>
    `;
};

export const listCardTemplate = ({
    label,
    items,
    tooltip = '',
    isoRef = null,
    icon = null,
}) => {
    if (!items || items.length === 0) return '';
    return html`
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700">
            <dt
                class="text-xs font-medium text-slate-400 flex items-center gap-2 ${tooltipTriggerClasses}"
                data-tooltip="${tooltip}"
                data-iso="${isoRef || ''}"
            >
                ${icon || ''}
                <span>${label}</span>
            </dt>
            <dd class="text-sm text-left font-mono text-white mt-2 space-y-1">
                ${items.map(
                    (item) =>
                        html`<div
                            class="bg-slate-800/50 p-2 rounded flex items-center justify-between"
                        >
                            <span
                                >${typeof item === 'object' && item.strings
                                    ? item
                                    : renderSourcedValue(item)}</span
                            >
                        </div>`
                )}
            </dd>
        </div>
    `;
};

const trackCardTemplate = (track, type, gridColumns) => {
    const icon = {
        video: icons.clapperboard,
        audio: icons.audioLines,
        text: icons.fileText,
        application: icons.fileText,
    }[type];

    let roles = track.roles?.join(', ') || 'N/A';

    // --- NEW: Add visual indicator for trick play tracks ---
    const isTrickPlay = track.roles?.includes('trick');
    if (isTrickPlay) {
        roles = html`<span
            class="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-800 text-orange-200"
            >Trick Play</span
        >`;
    }
    // --- END NEW ---

    const codecsToRender = [];
    if (type === 'text' || type === 'application') {
        if (Array.isArray(track.codecsOrMimeTypes)) {
            codecsToRender.push(...track.codecsOrMimeTypes);
        } else if (track.mimeType) {
            codecsToRender.push({
                value: track.mimeType,
                source: 'manifest',
                supported: isCodecSupported(track.mimeType),
            });
        }
    } else {
        if (Array.isArray(track.codecs)) {
            codecsToRender.push(...track.codecs);
        } else if (track.codecs && track.codecs.value) {
            codecsToRender.push({
                value: track.codecs.value,
                source: track.codecs.source,
                supported: isCodecSupported(track.codecs.value),
            });
        }
    }

    let contentTemplate;

    if (type === 'video') {
        const effectiveBitrate = formatBitrate(track.bandwidth);
        const manifestBitrate = formatBitrate(track.manifestBandwidth);
        let bitrate;
        if (
            track.manifestBandwidth &&
            track.bandwidth !== track.manifestBandwidth
        ) {
            bitrate = html`${effectiveBitrate}
                <span
                    class="block text-[10px] text-yellow-400 ${tooltipTriggerClasses}"
                    data-tooltip="The manifest @bandwidth is ${manifestBitrate}, but the effective max bitrate from the 'btrt' box in the init segment is ${effectiveBitrate}. The effective rate is shown."
                    >(Manifest: ${manifestBitrate})</span
                >`;
        } else {
            bitrate = effectiveBitrate;
        }

        let resolution = 'N/A';
        if (track.resolutions && track.resolutions.length > 0) {
            resolution = track.resolutions.map((r) => r.value).join(', ');
        } else if (track.width?.value && track.height?.value) {
            resolution = `${track.width.value}x${track.height.value}`;
        }
        contentTemplate = html`
            <div
                class="p-2 border-r border-slate-700 font-mono text-slate-200 truncate flex items-center gap-2"
                title=${track.id}
            >
                ${icon} <span>${track.id}</span>
            </div>
            <div class="p-2 border-r border-slate-700 font-mono text-slate-200">
                ${bitrate}
            </div>
            <div class="p-2 border-r border-slate-700 font-mono text-slate-200">
                ${resolution}
            </div>
            <div
                class="p-2 border-r border-slate-700 font-mono text-slate-200 space-y-1"
            >
                ${codecsToRender.map(
                    (c) => html`<div>${renderCodecInfo(c)}</div>`
                )}
            </div>
            <div class="p-2 font-mono text-slate-400">${roles}</div>
        `;
    } else if (type === 'audio') {
        contentTemplate = html`
            <div
                class="p-2 border-r border-slate-700 font-mono text-slate-200 truncate flex items-center gap-2"
                title=${track.id}
            >
                ${icon} <span>${track.id}</span>
            </div>
            <div class="p-2 border-r border-slate-700 font-mono text-slate-200">
                ${track.lang || 'N/A'}
            </div>
            <div class="p-2 border-r border-slate-700 font-mono text-slate-200">
                ${track.channels || 'N/A'}
            </div>
            <div
                class="p-2 border-r border-slate-700 font-mono text-slate-200 space-y-1"
            >
                ${codecsToRender.map(
                    (c) => html`<div>${renderCodecInfo(c)}</div>`
                )}
            </div>
            <div class="p-2 font-mono text-slate-400">${roles}</div>
        `;
    } else {
        // text or application
        contentTemplate = html`
            <div
                class="p-2 border-r border-slate-700 font-mono text-slate-200 truncate flex items-center gap-2"
                title=${track.id}
            >
                ${icon} <span>${track.id}</span>
            </div>
            <div class="p-2 border-r border-slate-700 font-mono text-slate-200">
                ${track.lang || 'N/A'}
            </div>
            <div
                class="p-2 border-r border-slate-700 font-mono text-slate-200 space-y-1"
            >
                ${codecsToRender.map(
                    (c) => html`<div>${renderCodecInfo(c)}</div>`
                )}
            </div>
            <div class="p-2 font-mono text-slate-400">${roles}</div>
        `;
    }

    return html`
        <div class="grid ${gridColumns} items-center">${contentTemplate}</div>
    `;
};

export const trackTableTemplate = (tracks, type) => {
    if (!tracks || tracks.length === 0) return '';

    const sortedTracks = [...tracks];
    if (type === 'video') {
        sortedTracks.sort((a, b) => {
            const heightA = a.height?.value || 0;
            const heightB = b.height?.value || 0;
            if (heightA !== heightB) {
                return heightA - heightB;
            }
            const widthA = a.width?.value || 0;
            const widthB = b.width?.value || 0;
            return widthA - widthB;
        });
    }

    let gridColumns;
    let headerTemplate;

    if (type === 'video') {
        gridColumns = 'grid-cols-[minmax(200px,1fr)_150px_150px_1fr_100px]';
        headerTemplate = html`
            <div class="p-2 border-r border-slate-700">Representation ID</div>
            <div class="p-2 border-r border-slate-700">Bitrate</div>
            <div class="p-2 border-r border-slate-700">Resolution</div>
            <div class="p-2 border-r border-slate-700">Codecs</div>
            <div class="p-2">Roles</div>
        `;
    } else if (type === 'audio') {
        gridColumns = 'grid-cols-[minmax(200px,1fr)_100px_100px_1fr_100px]';
        headerTemplate = html`
            <div class="p-2 border-r border-slate-700">Representation ID</div>
            <div class="p-2 border-r border-slate-700">Language</div>
            <div class="p-2 border-r border-slate-700">Channels</div>
            <div class="p-2 border-r border-slate-700">Codecs</div>
            <div class="p-2">Roles</div>
        `;
    } else {
        // text or application
        gridColumns = 'grid-cols-[minmax(200px,1fr)_100px_1fr_100px]';
        headerTemplate = html`
            <div class="p-2 border-r border-slate-700">Representation ID</div>
            <div class="p-2 border-r border-slate-700">Language</div>
            <div class="p-2 border-r border-slate-700">Formats</div>
            <div class="p-2">Roles</div>
        `;
    }

    return html`
        <div class="border border-slate-700 rounded-lg overflow-hidden">
            <!-- Header -->
            <div
                class="grid ${gridColumns} bg-slate-800/50 font-semibold text-xs text-slate-400"
            >
                ${headerTemplate}
            </div>
            <!-- Rows -->
            <div class="divide-y divide-slate-700">
                ${sortedTracks.map((track) =>
                    trackCardTemplate(track, type, gridColumns)
                )}
            </div>
        </div>
    `;
};
