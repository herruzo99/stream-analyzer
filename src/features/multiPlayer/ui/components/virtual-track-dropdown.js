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
                class="dropdown-panel bg-slate-900 border border-slate-700 rounded-xl p-4 text-center text-sm text-slate-400 shadow-xl w-64"
            >
                <div class="mb-2 text-slate-500">${icons.alertTriangle}</div>
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
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-72 p-2 ring-1 ring-black/50"
        >
            <div
                class="px-3 py-2 mb-1 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex justify-between"
            >
                <span>Global Quality Target</span>
            </div>

            <div
                class="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar"
            >
                ${sortedTracks.length === 0
                    ? html`
                          <div
                              class="p-4 text-center text-xs text-slate-500 italic"
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
                                  class="w-full text-left p-2.5 rounded-lg hover:bg-white/10 transition-colors group flex items-center justify-between border border-transparent hover:border-white/5"
                              >
                                  <div class="flex items-center gap-3">
                                      <div
                                          class="p-1.5 rounded bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-colors"
                                      >
                                          ${icons.layers}
                                      </div>
                                      <div>
                                          <div
                                              class="text-sm font-bold text-slate-200 group-hover:text-white"
                                          >
                                              ${track.height}p
                                          </div>
                                          <div
                                              class="text-[10px] text-slate-500 font-mono"
                                          >
                                              Up to ${bitrate}
                                          </div>
                                      </div>
                                  </div>
                                  <span
                                      class="text-slate-600 group-hover:text-blue-400 transition-colors transform group-hover:translate-x-1"
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
