import { html } from 'lit-html';
import { closeDropdown } from '@/ui/services/dropdownService';
import { formatBitrate } from '@/ui/shared/format';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore.js';

// --- ARCHITECTURAL REFACTOR (DRY): Import shared templates ---
import {
    videoSelectionPanelTemplate,
    audioSelectionPanelTemplate,
    textSelectionPanelTemplate,
} from '@/features/playerSimulation/ui/components/track-selection-dropdown.js';

// Export the imported templates so they can be used by other components in this feature
export {
    videoSelectionPanelTemplate,
    audioSelectionPanelTemplate,
    textSelectionPanelTemplate,
};
// --- END REFACTOR ---

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

/**
 * Renders a dropdown panel for selecting a global "virtual" video track.
 * This aggregates all available resolutions from all players.
 * @returns {import('lit-html').TemplateResult}
 */
export const virtualTrackDropdownTemplate = () => {
    const { players } = useMultiPlayerStore.getState();
    if (!players || players.size === 0) {
        return html`<div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-4 text-sm text-slate-400"
        >
            No players available to select tracks from.
        </div>`;
    }

    // --- ARCHITECTURAL FIX: Correctly merge tracks by resolution height ---
    const uniqueResolutions = new Map();
    for (const player of players.values()) {
        for (const track of player.variantTracks) {
            if (track.height && track.videoCodec) {
                const height = track.height;
                const existing = uniqueResolutions.get(height);
                if (
                    !existing ||
                    (track.videoBandwidth || track.bandwidth) >
                        (existing.videoBandwidth || existing.bandwidth)
                ) {
                    uniqueResolutions.set(height, track);
                }
            }
        }
    }

    const sortedTracks = Array.from(uniqueResolutions.values()).sort(
        (a, b) => (b.height || 0) - (a.height || 0)
    );
    // --- END FIX ---

    const handleSelect = (height) => {
        eventBus.dispatch('ui:multi-player:set-global-video-track-by-height', {
            height,
        });
        closeDropdown();
    };

    if (sortedTracks.length === 0) {
        return html`<div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-4 text-sm text-slate-400"
        >
            No video tracks found across all players.
        </div>`;
    }

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-2 space-y-2"
        >
            ${sortedTracks.map((track) =>
                trackCardTemplate({
                    label: `${track.height}p`,
                    details: `Up to ${formatBitrate(
                        track.videoBandwidth || track.bandwidth
                    )}`,
                    subDetails: `Represents all available ${track.height}p tracks`,
                    isActive: false, // This is a global action, not a state reflection
                    onClick: () => handleSelect(track.height),
                })
            )}
        </div>
    `;
};