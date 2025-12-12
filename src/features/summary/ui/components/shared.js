import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';

const isVideoCodec = (codecString) => {
    if (!codecString) return false;
    const lowerCodec = codecString.toLowerCase();
    const videoPrefixes = [
        'avc1',
        'avc3',
        'hvc1',
        'hev1',
        'mp4v',
        'dvh1',
        'dvhe',
        'av01',
        'vp09',
        'mjpg',
    ];
    return videoPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
};

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
        : 'Codec is not supported by internal parsers.';

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

    const roleValues = (track.roles || []).map((r) => r.value).filter(Boolean);
    let roles;
    const isTrickPlay = roleValues.includes('trick');

    if (isTrickPlay) {
        const otherRoles = roleValues.filter((r) => r !== 'trick');
        const trickBadge = html`<span
            class="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-800 text-orange-200"
            >Trick Play</span
        >`;
        if (otherRoles.length > 0) {
            roles = html`${otherRoles.join(', ')} ${trickBadge}`;
        } else {
            roles = trickBadge;
        }
    } else {
        roles = roleValues.length > 0 ? roleValues.join(', ') : 'N/A';
    }

    let codecsToRender = [];
    if (type === 'text' || type === 'application') {
        codecsToRender = track.codecsOrMimeTypes || [];
    } else {
        codecsToRender = track.codecs || [];
    }

    const formatFrameRate = (fr) => {
        if (!fr) return 'N/A';
        if (typeof fr === 'number') return fr.toFixed(2);
        if (typeof fr === 'string') {
            if (fr.includes('/')) {
                const [num, den] = fr.split('/').map(Number);
                if (den) return (num / den).toFixed(2);
            }
            const num = parseFloat(fr);
            return isNaN(num) ? 'N/A' : num.toFixed(2);
        }
        return 'N/A';
    };

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

        // --- Extra Props Column (ScanType, HDCP, SAR, Dependency) ---
        let extraProps = [];
        if (track.scanType) {
            extraProps.push(
                html`<span
                    class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 text-[10px]"
                    >${track.scanType}</span
                >`
            );
        }
        if (track.hdcpLevel) {
            extraProps.push(
                html`<span
                    class="px-1.5 py-0.5 bg-amber-900/20 text-amber-400 border border-amber-500/30 text-[10px] flex items-center gap-1"
                    >${icons.hdcp} ${track.hdcpLevel}</span
                >`
            );
        }
        if (track.sar) {
            extraProps.push(
                html`<span
                    class="px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-600 text-[10px]"
                    title="Sample Aspect Ratio"
                    >SAR ${track.sar}</span
                >`
            );
        }
        if (track.codingDependency) {
            extraProps.push(
                html`<span
                    class="px-1.5 py-0.5 bg-purple-900/20 text-purple-300 border border-purple-500/30 text-[10px]"
                    >Dependent</span
                >`
            );
        }
        if (track.maxPlayoutRate) {
            extraProps.push(
                html`<span
                    class="px-1.5 py-0.5 bg-blue-900/20 text-blue-300 border border-blue-500/30 text-[10px]"
                    >${track.maxPlayoutRate}x</span
                >`
            );
        }

        contentTemplate = html`
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200 truncate flex items-center gap-2"
                title=${track.label || track.id}
            >
                ${icon} <span>${track.label || track.id}</span>
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200"
            >
                ${bitrate}
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200"
            >
                ${resolution}
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200"
            >
                ${formatFrameRate(track.frameRate)}
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200 space-y-1"
            >
                ${codecsToRender
                .filter((c) => isVideoCodec(c.value))
                .map((c) => html`<div>${renderCodecInfo(c)}</div>`)}
            </div>

            <!-- Audio Mux -->
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200 space-y-1"
            >
                ${track.muxedAudio?.codecs?.length > 0
                ? track.muxedAudio.codecs.map(
                    (c) => html`<div>${renderCodecInfo(c)}</div>`
                )
                : html`<span class="text-slate-500">N/A</span>`}
            </div>

            <!-- Extra (Merged Roles + Props) -->
            <div
                class="h-full p-2 font-mono text-slate-400 flex flex-col gap-1"
            >
                <div>${roles}</div>
                ${extraProps.length > 0
                ? html`<div class="flex flex-wrap gap-1 mt-1">
                          ${extraProps}
                      </div>`
                : ''}
            </div>
        `;
    } else if (type === 'audio') {
        contentTemplate = html`
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200 truncate flex items-center gap-2"
                title=${track.label || track.id}
            >
                ${icon} <span>${track.label || track.id}</span>
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200"
            >
                ${track.lang || 'N/A'}
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200"
            >
                ${track.format || 'Unknown'}
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200 space-y-1"
            >
                <span>${track.channels || 'N/A'}</span>
                ${track.sampleRate
                ? html`<span class="text-[10px] text-slate-500"
                          >${track.sampleRate} Hz</span
                      >`
                : ''}
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200"
            >
                ${formatBitrate(track.bandwidth)}
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200 space-y-1"
            >
                ${codecsToRender.map(
                    (c) => html`<div>${renderCodecInfo(c)}</div>`
                )}
            </div>
            <div class="h-full p-2 font-mono text-slate-400">${roles}</div>
        `;
    } else {
        // text or application
        contentTemplate = html`
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200 truncate flex items-center gap-2"
                title=${track.label || track.id}
            >
                ${icon} <span>${track.label || track.id}</span>
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200"
            >
                ${track.lang || 'N/A'}
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200"
            >
                ${track.format || 'Unknown'}
            </div>
            <div
                class="h-full p-2 border-r border-slate-700 font-mono text-slate-200 space-y-1"
            >
                ${codecsToRender.map(
            (c) => html`<div>${renderCodecInfo(c)}</div>`
        )}
            </div>
            <div class="h-full p-2 font-mono text-slate-400">${roles}</div>
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
                return heightB - heightA;
            }
            return (b.bandwidth || 0) - (a.bandwidth || 0);
        });
    }

    let gridColumns;
    let headerTemplate;

    if (type === 'video') {
        gridColumns =
            'grid-cols-[minmax(150px,1fr)_125px_125px_100px_1fr_1fr_180px]';
        headerTemplate = html`
            <div class="p-2 border-r border-slate-700">Label</div>
            <div class="p-2 border-r border-slate-700">Bitrate</div>
            <div class="p-2 border-r border-slate-700">Resolution</div>
            <div class="p-2 border-r border-slate-700">Frame Rate</div>
            <div class="p-2 border-r border-slate-700">Video Codec(s)</div>
            <div class="p-2 border-r border-slate-700">Muxed Audio</div>
            <div class="p-2">Roles / Info</div>
        `;
    } else if (type === 'audio') {
        gridColumns =
            'grid-cols-[minmax(200px,1fr)_100px_100px_100px_125px_1fr_125px]';
        headerTemplate = html`
            <div class="p-2 border-r border-slate-700">Rendition ID</div>
            <div class="p-2 border-r border-slate-700">Language</div>
            <div class="p-2 border-r border-slate-700">Format</div>
            <div class="p-2 border-r border-slate-700">Ch / Hz</div>
            <div class="p-2 border-r border-slate-700">Bitrate</div>
            <div class="p-2 border-r border-slate-700">Codecs</div>
            <div class="p-2">Roles</div>
        `;
    } else {
        // text or application
        gridColumns = 'grid-cols-[minmax(200px,1fr)_125px_125px_1fr_125px]';
        headerTemplate = html`
            <div class="p-2 border-r border-slate-700">Rendition ID</div>
            <div class="p-2 border-r border-slate-700">Language</div>
            <div class="p-2 border-r border-slate-700">Format</div>
            <div class="p-2 border-r border-slate-700">Codecs</div>
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