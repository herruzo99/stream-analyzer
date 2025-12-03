import { eventBus } from '@/application/event-bus';
import { resetApplicationState } from '@/application/use_cases/resetApplicationState';
import { playerService } from '@/features/playerSimulation/application/playerService';
import { getLastUsedStreams } from '@/infrastructure/persistence/streamStorage';
import { isDebugMode } from '@/shared/utils/env';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore } from '@/state/playerStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { copyShareUrlToClipboard } from '@/ui/services/shareService';
import { toggleAllPolling } from '@/ui/services/streamActionsService';
import { html } from 'lit-html';
import { debugDropdownPanelTemplate } from './debug-dropdown-panel.js';
import { pollingDropdownPanelTemplate } from './polling-dropdown-panel.js';
import { settingsDropdownTemplate } from './settings-dropdown.js'; // New Import

function handleRestart() {
    if (
        confirm('Start a new analysis session? Current state will be cleared.')
    ) {
        resetApplicationState();
        const lastUsed = getLastUsedStreams();
        if (lastUsed && lastUsed.length > 0) {
            analysisActions.setStreamInputs(lastUsed);
        }
    }
}

const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
        eventBus.dispatch(EVENTS.UI.SEGMENT_ANALYSIS_REQUESTED, { files });
    }
    e.target.value = ''; // Reset
};

// --- Templates for Button Styles ---

const primaryButton = (icon, label, onClick) => html`
    <button
        @click=${onClick}
        class="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 
               bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50 hover:border-slate-600 hover:shadow-md"
        title="${label}"
    >
        <span class="scale-105 opacity-90">${icon}</span>
        <span
            class="text-[10px] font-bold uppercase tracking-wider leading-none"
            >${label}</span
        >
    </button>
`;

const labeledIconButton = (
    icon,
    label,
    onClick,
    colorClass = 'text-slate-400 hover:text-white'
) => html`
    <button
        @click=${onClick}
        class="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 w-full
               hover:bg-white/5 active:scale-95 active:bg-white/10
               ${colorClass}"
        title="${label}"
    >
        <span class="scale-100 opacity-80">${icon}</span>
        <span
            class="text-[9px] font-bold uppercase tracking-wider opacity-60 leading-none whitespace-nowrap"
            >${label}</span
        >
    </button>
`;

const toolMenuItem = (icon, title, desc, onClick, badge = null) => html`
    <button
        @click=${onClick}
        class="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group border border-transparent hover:border-white/5"
    >
        <div
            class="p-1.5 rounded bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-colors border border-slate-700/50"
        >
            ${icon}
        </div>
        <div class="grow min-w-0">
            <div class="flex justify-between items-center">
                <span
                    class="text-xs font-bold text-slate-200 group-hover:text-white transition-colors"
                    >${title}</span
                >
                ${badge
                    ? html`<span
                          class="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold tracking-wide"
                          >${badge}</span
                      >`
                    : ''}
            </div>
            <div
                class="text-[10px] text-slate-500 truncate group-hover:text-slate-400 transition-colors"
            >
                ${desc}
            </div>
        </div>
    </button>
`;

// --- Dropdown Menus ---

const utilitiesMenuTemplate = (activeStream) => html`
    <div
        class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-72 p-2 ring-1 ring-black/50 space-y-1 animate-scaleIn origin-bottom-left"
    >
        <div
            class="px-3 py-2 border-b border-white/5 mb-1 flex justify-between items-center"
        >
            <span
                class="text-[10px] font-bold uppercase tracking-widest text-slate-500"
                >Engineering Tools</span
            >
        </div>

        ${activeStream?.protocol === 'dash'
            ? toolMenuItem(
                  icons.calculator,
                  'Timing Calculator',
                  'Debug DASH segment availability',
                  () => {
                      closeDropdown();
                      eventBus.dispatch(EVENTS.UI.SHOW_DASH_TIMING_CALCULATOR, {
                          streamId: activeStream.id,
                      });
                  },
                  'DASH'
              )
            : ''}
        ${toolMenuItem(
            icons.fileScan,
            'Segment Inspector',
            'Analyze local ISOBMFF/TS files',
            () => {
                closeDropdown();
                const input = document.getElementById('global-segment-upload');
                if (input) input.click();
            }
        )}
        ${toolMenuItem(
            icons.shield,
            'PSSH Inspector',
            'Decode & Verify DRM Init Data',
            () => {
                closeDropdown();
                eventBus.dispatch('ui:drm-inspector:open');
            }
        )}
        ${toolMenuItem(
            icons.code,
            'Manifest Patcher',
            'Inject faults or modify tags',
            () => {
                closeDropdown();
                eventBus.dispatch(EVENTS.UI.SHOW_MANIFEST_PATCHER);
            }
        )}
    </div>
`;

// --- Main Component ---

export const globalControlsTemplate = () => {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { isLoaded } = usePlayerStore.getState();

    const activeStream = streams.find((s) => s.id === activeStreamId);
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');
    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const hasLive = liveStreams.length > 0;

    return html`
        <div
            class="border-t border-white/5 bg-slate-950/80 backdrop-blur-md p-4 space-y-4"
        >
            <!-- Hidden Global File Input -->
            <input
                type="file"
                id="global-segment-upload"
                class="hidden"
                multiple
                @change=${handleFileSelect}
            />

            <!-- 1. Primary Session Controls -->
            <div class="flex gap-3">
                ${primaryButton(
                    icons.newAnalysis,
                    'New Session',
                    handleRestart
                )}
                ${primaryButton(icons.search, 'Search', () =>
                    eventBus.dispatch('ui:search:open')
                )}
            </div>

            <!-- 2. Live Stream Pulse (Conditional) -->
            ${hasLive
                ? html`
                      <div
                          class="flex items-center gap-0 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden p-1 shadow-inner"
                      >
                          <button
                              @click=${toggleAllPolling}
                              class="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                        ${isAnyPolling
                                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10'
                                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/10'}"
                          >
                              <span class="relative flex h-2 w-2">
                                  ${isAnyPolling
                                      ? html`<span
                                            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"
                                        ></span>`
                                      : ''}
                                  <span
                                      class="relative inline-flex rounded-full h-2 w-2 bg-current"
                                  ></span>
                              </span>
                              ${isAnyPolling
                                  ? 'Live Polling'
                                  : 'Polling Paused'}
                          </button>
                          <div class="w-px h-5 bg-slate-800 mx-1"></div>
                          <button
                              @click=${(e) =>
                                  toggleDropdown(
                                      e.currentTarget,
                                      pollingDropdownPanelTemplate,
                                      e
                                  )}
                              class="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                              title="Polling Settings"
                          >
                              ${icons.settings}
                          </button>
                      </div>
                  `
                : ''}

            <!-- 3. Session Utilities -->
            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                ${labeledIconButton(
                    icons.share,
                    'Share',
                    copyShareUrlToClipboard
                )}
                <!-- Updated Settings Action -->
                ${labeledIconButton(icons.settings, 'Settings', (e) =>
                    toggleDropdown(e.currentTarget, settingsDropdownTemplate, e)
                )}
                ${labeledIconButton(
                    icons.wrench,
                    'Tools',
                    (e) =>
                        toggleDropdown(
                            e.currentTarget,
                            () => utilitiesMenuTemplate(activeStream),
                            e
                        ),
                    'text-purple-400 hover:text-purple-300 hover:bg-purple-900/20'
                )}
                ${isLoaded
                    ? labeledIconButton(
                          icons.power,
                          'Kill',
                          () => playerService.destroy(),
                          'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                      )
                    : ''}
                ${isDebugMode
                    ? labeledIconButton(
                          icons.debug,
                          'Debug',
                          (e) =>
                              toggleDropdown(
                                  e.currentTarget,
                                  debugDropdownPanelTemplate,
                                  e
                              ),
                          'text-yellow-500/70 hover:text-yellow-400'
                      )
                    : ''}
            </div>
        </div>
    `;
};
