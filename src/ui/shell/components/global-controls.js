import { eventBus } from '@/application/event-bus';
import { resetApplicationState } from '@/application/use_cases/resetApplicationState';
import { playerService } from '@/features/playerSimulation/application/playerService';
import { getLastUsedStreams } from '@/infrastructure/persistence/streamStorage';
import { isDebugMode } from '@/shared/utils/env';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { usePlayerStore } from '@/state/playerStore';
import { useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { openModalWithContent } from '@/ui/services/modalService';
import { copyShareUrlToClipboard } from '@/ui/services/shareService';
import { toggleAllPolling } from '@/ui/services/streamActionsService';
import { html } from 'lit-html';

import { debugDropdownPanelTemplate } from './debug-dropdown-panel.js';
import { pollingDropdownPanelTemplate } from './polling-dropdown-panel.js';
import { settingsDropdownTemplate } from './settings-dropdown.js';

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
        class="flex-1 flex flex-col items-center justify-center gap-2 py-4 px-2 transition-all duration-300 group relative overflow-hidden
               text-slate-400 hover:text-slate-100 hover:shadow-[0_0_20px_#3b82f6]/20"
        style="border-radius: calc(0.75rem * 0.75); background: #1e293b; "
        title="${label}"
    >
        <!-- Hover Glow -->
        <div
            class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        ></div>

        <span
            class="relative z-10 transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:text-blue-400 group-hover:drop-shadow-[0_0_8px_#3b82f6]"
        >
            ${icon}
        </span>
        <span
            class="relative z-10 text-[10px] font-extrabold uppercase tracking-[0.15em] leading-none transition-colors duration-300"
            >${label}</span
        >
    </button>
`;

const labeledIconButton = (
    icon,
    label,
    onClick,
    colorClass = 'text-slate-400 hover:text-slate-100'
) => html`
    <button
        @click=${onClick}
        class="flex flex-col items-center justify-center gap-1.5 p-2 transition-all duration-300 w-full group
               bg-transparent hover:bg-slate-800 border border-transparent active:scale-95
               ${colorClass}"
        style="border-radius: calc(0.75rem * 0.5); border-color: transparent;"
        title="${label}"
    >
        <span
            class="transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_5px_currentColor]"
            >${icon}</span
        >
        <span
            class="text-[9px] font-extrabold uppercase tracking-[0.1em] opacity-60 group-hover:opacity-100 leading-none whitespace-nowrap"
            >${label}</span
        >
    </button>
`;

const toolMenuItem = (icon, title, desc, onClick, badge = null) => html`
    <button
        @click=${onClick}
        class="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100/5 transition-colors text-left group border border-transparent hover:border-slate-100/5"
    >
        <div
            class="p-1.5 rounded bg-slate-800 text-slate-400 group-hover:text-slate-100 group-hover:bg-slate-800 transition-colors border border-slate-800"
        >
            ${icon}
        </div>
        <div class="grow min-w-0">
            <div class="flex justify-between items-center">
                <span
                    class="text-xs font-bold text-slate-100 group-hover:text-slate-100 transition-colors"
                    >${title}</span
                >
                ${badge
        ? html`<span
                          class="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold tracking-wide"
                          >${badge}</span
                      >`
        : ''}
            </div>
            <div
                class="text-[10px] text-slate-400 truncate group-hover:text-slate-400 transition-colors"
            >
                ${desc}
            </div>
        </div>
    </button>
`;

// --- Dropdown Menus ---

import '@/ui/core/BaseDropdown.js';
// ... previous imports ...

// --- Dropdown Menus ---

const utilitiesMenuTemplate = (activeStream) => html`
    <base-dropdown class="w-80">
        <div
            slot="header"
            class="px-5 py-3 border-b border-slate-800/20 mb-2 flex justify-between items-center bg-slate-800 rounded-t-xl"
        >
            <span
                class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400/80"
                >Engineering Tools</span
            >
            <span
                class="text-blue-400 drop-shadow-[0_0_8px_#3b82f6]"
                >${icons.wrench}</span
            >
        </div>
        <div class="p-2 space-y-1">

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
            icons.zapOff,
            'Chaos Tools',
            'Simulate network failures',
            () => {
                closeDropdown();
                openModalWithContent({
                    title: 'Chaos Tools',
                    url: 'Network Interventions',
                    content: { type: 'networkIntervention', data: {} },
                    isFullWidth: false,
                });
            }
        )}
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
                openModalWithContent({
                    title: 'PSSH Inspector',
                    url: 'drm-inspector',
                    content: {
                        type: 'drmInspector',
                        data: {}
                    }
                });
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
    </base-dropdown>
`;

// --- Main Component ---

// --- Main Component ---

// --- Compact Helpers ---
const compactPillButton = (icon, onClick, tooltip, colorClass = '') => html`
    <button
        @click=${onClick}
        class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${colorClass || 'text-slate-400 hover:text-slate-100'}"
        data-tooltip="${tooltip}"
        data-tooltip-placement="right"
    >
        ${icon}
    </button>
`;

const compactCircleButton = (icon, onClick, title) => html`
    <button
        @click=${onClick}
        class="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-800 border border-slate-800/30 hover:border-blue-500/50 flex items-center justify-center transition-all duration-300 shadow-md group relative overflow-hidden"
        data-tooltip="${title}"
        data-tooltip-placement="right"
    >
        <div class="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <span class="relative z-10 group-hover:scale-110 transition-transform duration-300 text-slate-100">${icon}</span>
    </button>
`;

export const globalControlsTemplate = () => {
    const { streams, activeStreamId } = useAnalysisStore.getState();
    const { isLoaded } = usePlayerStore.getState();
    const { isGlobalNavCompact } = useUiStore.getState();

    const activeStream = streams.find((s) => s.id === activeStreamId) ?? streams[0];
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');
    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const hasLive = liveStreams.length > 0;

    // --- COMPACT LAYOUT (BOLD) ---
    if (isGlobalNavCompact) {
        return html`
            <div class="flex flex-col items-center gap-6 py-2 px-1 w-full transition-all duration-300">
                <!--Hidden Global File Input-->
                <input type="file" id="global-segment-upload" class="hidden" multiple @change=${handleFileSelect} />

                <!-- Group 1: Primary Actions (Vertical Pill) -->
                <div class="flex flex-col gap-2 p-1.5 bg-slate-800 border border-slate-800/10 rounded-full shadow-inner">
                    ${compactPillButton(icons.newAnalysis, handleRestart, 'New Session', 'hover:text-blue-400')}
                    ${compactPillButton(icons.search, () => eventBus.dispatch('ui:search:open'), 'Search')}
                </div>

                <!-- Group 2: Live (If Active) -->
                ${hasLive ? html`
                    <div class="flex flex-col items-center bg-slate-800 border border-slate-800/20 rounded-full overflow-hidden shadow-lg p-0.5 w-9">
                        <button
                            @click=${toggleAllPolling}
                            class="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 relative ${isAnyPolling ? 'text-emerald-400' : 'text-amber-400'}"
                            data-tooltip="${isAnyPolling ? 'Polling Active' : 'Polling Paused'}"
                            data-tooltip-placement="right"
                        >
                            ${isAnyPolling ? html`<span class="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse"></span>` : ''}
                            <div class="w-2.5 h-2.5 rounded-full bg-current shadow-[0_0_8px_currentColor] relative z-10"></div>
                        </button>
                        
                        <div class="w-4 h-[1px] bg-slate-800/20"></div>

                        <button
                            @click=${(e) => toggleDropdown(e.currentTarget, pollingDropdownPanelTemplate, e)}
                            class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors"
                            data-tooltip="Polling Settings"
                            data-tooltip-placement="right"
                        >
                            ${icons.settings}
                        </button>
                    </div>
                ` : ''}

                <!-- Group 3: Utilities (Stacked) -->
                <div class="flex flex-col gap-4 items-center w-full">
                    ${compactCircleButton(icons.share, copyShareUrlToClipboard, 'Share')}
                    ${compactCircleButton(icons.settings, (e) => toggleDropdown(e.currentTarget, settingsDropdownTemplate, e), 'Settings')}
                    ${compactCircleButton(icons.wrench, (e) => toggleDropdown(e.currentTarget, () => utilitiesMenuTemplate(activeStream), e), 'Tools')}
                    
                     ${isLoaded ? html`
                        <div class="h-[1px] w-4 bg-slate-800/20"></div>
                        ${compactPillButton(icons.power, () => playerService.destroy(), 'Kill Session', 'text-red-400 hover:bg-red-500/10')}
                    ` : ''}

                    ${isDebugMode ? html`
                         ${compactPillButton(icons.debug, (e) => toggleDropdown(e.currentTarget, debugDropdownPanelTemplate, e), 'Debug Controls', 'text-amber-400')}
                    ` : ''}
                </div>
            </div>
        `;
    }

    // --- EXPANDED LAYOUT (Standard) ---
    return html`
        <div
            class="p-5 space-y-5 transition-all duration-300"
            style="background: #1e293b;  border-radius: 0.75rem; backdrop-filter: blur(12px); box-shadow: 0 8px 30px rgb(0 0 0 / 0.35); margin: 0.75rem;"
        >
            <input type="file" id="global-segment-upload" class="hidden" multiple @change=${handleFileSelect} />

            <!-- Primary Session Controls -->
            <div class="flex gap-4">
                ${primaryButton(icons.newAnalysis, 'New Session', handleRestart)}
                ${primaryButton(icons.search, 'Search', () => eventBus.dispatch('ui:search:open'))}
            </div>

            <!-- Live Stream Pulse -->
            ${hasLive ? html`
                <div
                    class="flex items-center gap-0 bg-slate-800 border border-slate-800/20 overflow-hidden p-1 shadow-inner relative group/polling"
                    style="border-radius: calc(0.75rem * 0.75)"
                >
                    <button
                        @click=${toggleAllPolling}
                        class="flex-1 flex items-center justify-center gap-3 px-3 py-3 text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all duration-500 relative overflow-hidden
                        ${isAnyPolling ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/15'}"
                        style="border-radius: calc(0.75rem * 0.5)"
                    >
                         ${isAnyPolling ? html`<div class="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent animate-shimmer"></div>` : ''}
                         <span class="relative flex h-2.5 w-2.5">
                              ${isAnyPolling ? html`<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>` : ''}
                              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-current shadow-[0_0_8px_currentColor]"></span>
                         </span>
                         <span class="relative z-10">${isAnyPolling ? 'Live Polling' : 'Polling Paused'}</span>
                    </button>
                    <div class="w-[1px] h-6 bg-slate-800/30 mx-1"></div>
                    <button
                        @click=${(e) => toggleDropdown(e.currentTarget, pollingDropdownPanelTemplate, e)}
                        class="p-2.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all duration-300"
                        style="border-radius: calc(0.75rem * 0.5)"
                        title="Polling Settings"
                    >
                        <span class="group-hover/polling:rotate-90 transition-transform duration-500 block">${icons.settings}</span>
                    </button>
                </div>
            ` : ''}

            <!-- Session Utilities -->
            <div class="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/20">
                ${labeledIconButton(icons.share, 'Share', copyShareUrlToClipboard)}
                ${labeledIconButton(icons.settings, 'Settings', (e) => toggleDropdown(e.currentTarget, settingsDropdownTemplate, e))}
                ${labeledIconButton(icons.wrench, 'Tools', (e) => toggleDropdown(e.currentTarget, () => utilitiesMenuTemplate(activeStream), e), 'text-purple-300 hover:text-slate-100 hover:bg-purple-500/15')}
                ${isLoaded ? labeledIconButton(icons.power, 'Kill', () => playerService.destroy(), 'text-red-400 hover:bg-red-500/15 hover:text-red-400') : ''}
                ${isDebugMode ? labeledIconButton(icons.debug, 'Debug', (e) => toggleDropdown(e.currentTarget, debugDropdownPanelTemplate, e), 'text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/15') : ''}
            </div>
        </div>
    `;
};
