import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import * as icons from '@/ui/icons';
import { closeDropdown } from '@/ui/services/dropdownService';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

// Re-export shared templates for use within the feature
export {
    audioSelectionPanelTemplate,
    textSelectionPanelTemplate,
    videoSelectionPanelTemplate,
} from '@/features/playerSimulation/ui/components/track-selection-dropdown.js';

export const virtualTrackDropdownTemplate = () => {
    const { players } = useMultiPlayerStore.getState();

    if (!players || players.size === 0) {
        return html`
            <div
                class="dropdown-panel bg-white/5 border border-white/10 rounded-md p-4 text-center text-sm text-slate-400 w-64"
            >
                <div class="mb-2 text-slate-400">
                    ${icons.alertTriangle}
                </div>
                No active players found.
            </div>
        `;
    }

    // Aggregate unique resolutions across all players
    const uniqueResolutions = new Map();
    for (const player of players.values()) {
        for (const track of player.variantTracks) {
            if (track.height && track.videoCodec) {
                const height = track.height;
                const existing = uniqueResolutions.get(height);
                // Keep the highest bitrate version of this resolution for display metadata
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

    const handleSelect = (height) => {
        eventBus.dispatch('ui:multi-player:set-global-video-track-by-height', {
            height,
        });
        closeDropdown();
    };

    return html`
        <div
            class="dropdown-panel bg-white/5 border border-white/10 rounded-md w-72 p-2 ring-1"
        >
            <div
                class="px-3 py-2 mb-1 border-b border-white/10 text-[10px] font-bold text-slate-400 flex justify-between"
            >
                <span>Global Quality Target</span>
            </div>

            <div
                class="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar"
            >
                ${sortedTracks.length === 0
                    ? html`
                          <div
                              class="p-4 text-center text-xs text-slate-400 italic"
                          >
                              No video tracks available.
                          </div>
                      `
                    : sortedTracks.map((track) => {
                          const bitrate = formatBitrate(
                              track.videoBandwidth || track.bandwidth
                          );
                          return html`
                              <button
                                  @click=${() => handleSelect(track.height)}
                                  class="w-full text-left p-2.5 rounded-md hover:bg-white/10 transition-colors group flex items-center justify-between border border-transparent hover:border-white/10"
                              >
                                  <div class="flex items-center gap-3">
                                      <div
                                          class="p-1.5 rounded bg-white/5 text-slate-400 group-hover:text-slate-100 group-hover:bg-white/10 transition-colors"
                                      >
                                          ${icons.layers}
                                      </div>
                                      <div>
                                          <div
                                              class="text-sm font-bold text-slate-100 group-hover:text-slate-100"
                                          >
                                              ${track.height}p
                                          </div>
                                          <div
                                              class="text-[10px] text-slate-400 font-mono"
                                          >
                                              Up to ${bitrate}
                                          </div>
                                      </div>
                                  </div>
                                  <span
                                      class="text-slate-400 group-hover:text-emerald-200 transition-colors transform group-hover:translate-x-1"
                                  >
                                      ${icons.arrowRight}
                                  </span>
                              </button>
                          `;
                      })}
            </div>
        </div>
    `;
};
