import { html } from 'lit-html';
import { closeDropdown } from '@/ui/services/dropdownService';
import { formatBitrate } from '@/ui/shared/format';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { eventBus } from '@/application/event-bus';

const trackCardTemplate = ({
    label,
    details,
    subDetails = null,
    isActive,
    onClick,
}) => {
    const activeClasses = 'bg-blue-800 border-blue-600 ring-2 ring-blue-500';
    const baseClasses =
        'bg-slate-900/50 p-3 rounded-lg border border-slate-700 cursor-pointer transition-all duration-150 ease-in-out text-left w-full';
    const hoverClasses = 'hover:bg-slate-700 hover:border-slate-500';
    const tooltipText = `${details}${subDetails ? ` | ${subDetails}` : ''}`;

    return html`
        <button
            class="${baseClasses} ${hoverClasses} ${isActive
                ? activeClasses
                : ''}"
            @click=${onClick}
            data-tooltip=${tooltipText}
        >
            <div class="flex justify-between items-center">
                <span class="font-semibold text-slate-200 truncate"
                    >${label}</span
                >
                ${isActive
                    ? html`<span
                          class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white"
                          >ACTIVE</span
                      >`
                    : ''}
            </div>
            <div
                class="text-xs text-slate-400 font-mono truncate mt-1 ${tooltipTriggerClasses}"
            >
                ${details}
            </div>
            ${subDetails
                ? html`<div
                      class="text-xs text-slate-500 font-mono truncate mt-1"
                  >
                      ${subDetails}
                  </div>`
                : ''}
        </button>
    `;
};

export const videoSelectionPanelTemplate = (
    videoTracks,
    isAbrEnabled,
    streamId
) => {
    const handleSelect = (track) => {
        const isAuto = track === null;
        if (isAuto) {
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

    // --- ARCHITECTURAL OVERHAUL: Robust De-duplication and Rich Data ---
    const uniqueTracks = new Map();
    (videoTracks || []).forEach((track) => {
        // Create a unique key based on all relevant video properties
        const key = `${track.height}x${track.width}@${track.videoBandwidth || track.bandwidth}|${track.videoCodec}|${track.frameRate}`;
        if (!uniqueTracks.has(key)) {
            uniqueTracks.set(key, track);
        }
    });

    const tracksToRender = [...uniqueTracks.values()].sort((a, b) => {
        if ((b.height || 0) !== (a.height || 0)) {
            return (b.height || 0) - (a.height || 0);
        }
        return (
            (b.videoBandwidth || b.bandwidth || 0) -
            (a.videoBandwidth || a.bandwidth || 0)
        );
    });
    // --- END OVERHAUL ---

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-2 space-y-2 max-h-[60vh] overflow-y-auto"
        >
            ${trackCardTemplate({
                label: 'Auto (ABR)',
                details: 'Adaptive Bitrate Switching',
                subDetails: null,
                isActive: isAbrEnabled,
                onClick: () => handleSelect(null),
            })}
            ${tracksToRender.map((track) => {
                const details = [
                    formatBitrate(track.videoBandwidth || track.bandwidth),
                    track.frameRate
                        ? `${parseFloat(track.frameRate).toFixed(2)}fps`
                        : null,
                ]
                    .filter(Boolean)
                    .join(' | ');

                return trackCardTemplate({
                    label: `${track.height}p`,
                    details: details,
                    subDetails: track.videoCodec,
                    isActive: track.active && !isAbrEnabled,
                    onClick: () => handleSelect(track),
                });
            })}
        </div>
    `;
};

export const audioSelectionPanelTemplate = (audioTracks, streamId) => {
    const handleSelect = (track) => {
        eventBus.dispatch('ui:player:select-audio-track', {
            streamId,
            language: track.language,
            label: track.label, // Pass label for more specific selection
        });
        closeDropdown();
    };

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-2 space-y-2"
        >
            ${audioTracks.map((track) =>
                trackCardTemplate({
                    label: track.label || track.language,
                    details: `Role: ${
                        (track.roles || []).join(', ') || 'main'
                    }`,
                    subDetails: track.codec,
                    isActive: track.active,
                    onClick: () => handleSelect(track),
                })
            )}
        </div>
    `;
};

export const textSelectionPanelTemplate = (textTracks, streamId) => {
    const handleSelect = (track) => {
        eventBus.dispatch('ui:player:select-text-track', { streamId, track });
        closeDropdown();
    };

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-2 space-y-2"
        >
            ${trackCardTemplate({
                label: 'Text Tracks Off',
                details: 'No subtitles or captions will be displayed.',
                subDetails: null,
                isActive: !textTracks.some((t) => t.active),
                onClick: () => handleSelect(null),
            })}
            ${textTracks.map((track) =>
                trackCardTemplate({
                    label: track.label || track.language,
                    details: `Kind: ${track.kind || 'subtitle'}`,
                    subDetails: `Role: ${
                        (track.roles || []).join(', ') || 'main'
                    }`,
                    isActive: track.active,
                    onClick: () => handleSelect(track),
                })
            )}
        </div>
    `;
};
