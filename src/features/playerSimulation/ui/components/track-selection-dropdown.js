import { eventBus } from '@/application/event-bus';
import * as icons from '@/ui/icons';
import { closeDropdown } from '@/ui/services/dropdownService';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

const dropdownContainerClass =
    'dropdown-panel bg-white/5  border border-white/10 rounded-md  w-80 overflow-hidden ring-1 ring-slate-800 flex flex-col max-h-[60vh]';
const scrollContainerClass =
    'overflow-y-auto p-2 space-y-1 custom-scrollbar grow';
const headerClass =
    'px-3 py-2 bg-white/5 border-b border-white/10 text-[10px] font-bold   text-slate-400 flex justify-between items-center';

const trackItemTemplate = ({
    label,
    primaryMeta,
    secondaryMeta,
    tags = [],
    isActive,
    onClick,
}) => {
    return html`
        <button
            @click=${onClick}
            class="group w-full text-left p-2 rounded-md transition-all duration-200 flex items-center gap-3 border ${isActive ? 'bg-emerald-500/10 border-emerald-400/25 ' : 'bg-transparent border-transparent hover:bg-white/10 hover:border-white/10'}"
        >
            <!-- Status Indicator -->
            <div
                class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-white/5 text-slate-100' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-100'}"
            >
                ${isActive ? icons.checkCircle : icons.circle}
            </div>

            <!-- Content -->
            <div class="grow min-w-0 flex flex-col">
                <div class="flex items-center justify-between gap-2">
                    <span
                        class="text-sm font-bold truncate ${isActive ? 'text-slate-100' : 'text-slate-100'}"
                    >
                        ${label}
                    </span>
                    ${tags.length > 0
                        ? html`
                              <div class="flex gap-1">
                                  ${tags.map(
                                      (t) => html`
                                          <span
                                              class="text-[9px] px-1.5 rounded border font-mono ${isActive ? 'bg-emerald-500/10 border-emerald-400/25 text-slate-100' : 'bg-white/5 border-white/10 text-slate-400'}"
                                          >
                                              ${t}
                                          </span>
                                      `
                                  )}
                              </div>
                          `
                        : ''}
                </div>

                <div
                    class="flex items-center gap-2 text-xs ${isActive ? 'text-slate-100' : 'text-slate-400'} font-mono mt-0.5"
                >
                    ${primaryMeta ? html`<span>${primaryMeta}</span>` : ''}
                    ${primaryMeta && secondaryMeta
                        ? html`<span class="opacity-50">•</span>`
                        : ''}
                    ${secondaryMeta
                        ? html`<span class="truncate">${secondaryMeta}</span>`
                        : ''}
                </div>
            </div>
        </button>
    `;
};

// --- Video Selection ---
export const videoSelectionPanelTemplate = (
    videoTracks,
    isAbrEnabled,
    streamId
) => {
    const handleSelect = (track) => {
        if (track === null) {
            eventBus.dispatch('ui:player:set-abr-enabled', {
                streamId,
                enabled: true,
            });
        } else {
            eventBus.dispatch('ui:player:select-video-track', {
                streamId,
                track,
            });
        }
        closeDropdown();
    };

    // Deduplicate and Sort
    const uniqueTracks = new Map();
    (videoTracks || []).forEach((track) => {
        const key = `${track.height}x${track.width}@${track.videoBandwidth || track.bandwidth}`;
        if (!uniqueTracks.has(key)) uniqueTracks.set(key, track);
    });

    const tracksToRender = [...uniqueTracks.values()].sort((a, b) => {
        return (
            (b.videoBandwidth || b.bandwidth || 0) -
            (a.videoBandwidth || a.bandwidth || 0)
        );
    });

    return html`
        <div class="${dropdownContainerClass}">
            <div class="${headerClass}">
                <span>Video Quality</span>
                <span
                    class="bg-white/5 px-1.5 py-0.5 rounded text-slate-100"
                    >${tracksToRender.length} Levels</span
                >
            </div>
            <div class="${scrollContainerClass}">
                ${trackItemTemplate({
                    label: 'Auto (ABR)',
                    primaryMeta: 'Adaptive Bitrate',
                    secondaryMeta: 'Optimized for Network',
                    isActive: isAbrEnabled,
                    tags: ['Auto'],
                    onClick: () => handleSelect(null),
                })}
                <div class="h-px bg-white/5 mx-2 my-1"></div>
                ${tracksToRender.map((track) => {
                    const bitrate = formatBitrate(
                        track.videoBandwidth || track.bandwidth
                    );
                    const resolution = track.height
                        ? `${track.height}p`
                        : 'Unknown';
                    const codec = track.videoCodec
                        ? track.videoCodec.split('.')[0]
                        : '';

                    return trackItemTemplate({
                        label: resolution,
                        primaryMeta: bitrate,
                        secondaryMeta: codec,
                        isActive: track.active && !isAbrEnabled,
                        onClick: () => handleSelect(track),
                    });
                })}
            </div>
        </div>
    `;
};

// --- Audio Selection ---
export const audioSelectionPanelTemplate = (audioTracks, streamId) => {
    const handleSelect = (track) => {
        eventBus.dispatch('ui:player:select-audio-track', {
            streamId,
            language: track.language,
            label: track.label,
        });
        closeDropdown();
    };

    return html`
        <div class="${dropdownContainerClass}">
            <div class="${headerClass}">
                <span>Audio Tracks</span>
                <span
                    class="bg-white/5 px-1.5 py-0.5 rounded text-slate-100"
                    >${audioTracks.length} Available</span
                >
            </div>
            <div class="${scrollContainerClass}">
                ${audioTracks.map((track) => {
                    const lang = track.language || 'und';
                    const label = track.label || lang;
                    const roles = (track.roles || []).join(', ');

                    return trackItemTemplate({
                        label: label.toUpperCase(),
                        primaryMeta: track.codec,
                        secondaryMeta: roles,
                        tags: [lang],
                        isActive: track.active,
                        onClick: () => handleSelect(track),
                    });
                })}
            </div>
        </div>
    `;
};

// --- Text Selection ---
export const textSelectionPanelTemplate = (textTracks, streamId) => {
    const handleSelect = (track) => {
        eventBus.dispatch('ui:player:select-text-track', { streamId, track });
        closeDropdown();
    };

    const noneActive = !textTracks.some((t) => t.active);

    return html`
        <div class="${dropdownContainerClass}">
            <div class="${headerClass}">
                <span>Subtitles / Captions</span>
            </div>
            <div class="${scrollContainerClass}">
                ${trackItemTemplate({
                    label: 'Off',
                    primaryMeta: 'No subtitles',
                    secondaryMeta: null,
                    isActive: noneActive,
                    onClick: () => handleSelect(null),
                })}
                <div class="h-px bg-white/5 mx-2 my-1"></div>
                ${textTracks.map((track) => {
                    const label = track.label || track.language || 'Untitled';
                    return trackItemTemplate({
                        label: label,
                        primaryMeta: track.kind,
                        secondaryMeta: null,
                        tags: [track.language || 'und'],
                        isActive: track.active,
                        onClick: () => handleSelect(track),
                    });
                })}
            </div>
        </div>
    `;
};
