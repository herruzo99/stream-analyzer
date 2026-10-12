import { eventBus } from '@/application/event-bus';
import { resetApplicationState } from '@/application/use_cases/resetApplicationState';
import { playerService } from '@/features/playerSimulation/application/playerService';
import { isDebugMode } from '@/shared/utils/env';
import { useAnalysisStore } from '@/state/analysisStore';
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

// Two-tap inline confirm. Armed state lives in module scope (not the
// button element) because the footer re-renders on every store write and
// would wipe element state between the two taps.
let restartArmedAt = 0;
const RESTART_ARM_MS = 4000;

function isRestartArmed() {
    return Date.now() - restartArmedAt < RESTART_ARM_MS;
}

function handleRestart() {
    if (!isRestartArmed()) {
        restartArmedAt = Date.now();
        // Re-render the footer so the armed label shows immediately.
        useUiStore.setState({});
        window.setTimeout(() => {
            restartArmedAt = 0;
            // Nudge subscribers so the armed label drops even when
            // nothing else wrote to the store in the meantime.
            useUiStore.setState({});
        }, RESTART_ARM_MS + 50);
        return;
    }
    restartArmedAt = 0;
    resetApplicationState();
}

const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
        eventBus.dispatch(EVENTS.UI.SEGMENT_ANALYSIS_REQUESTED, { files });
    }
    e.target.value = ''; // Reset
};

// --- Templates for Button Styles ---

const primaryButton = (icon, label, onClick, extraClass = '') => html`
    <button
        @click=${onClick}
        class="flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 hover:text-slate-100 transition-colors ${extraClass}"
        title="${label}"
    >
        ${icon}
        <span class="mono text-[11px] font-medium">${label}</span>
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
        class="flex items-center justify-center gap-1.5 px-2 py-2 rounded-md w-full bg-transparent hover:bg-white/5 border border-transparent transition-colors ${colorClass}"
        title="${label}"
        aria-label="${label}"
    >
        ${icon}
        <span class="mono text-[10px] whitespace-nowrap">${label}</span>
    </button>
`;

const toolMenuItem = (icon, title, desc, onClick, badge = null, disabled = false) => html`
    <button
        @click=${onClick}
        ?disabled=${disabled}
        title=${disabled ? desc : title}
        class="w-full flex items-center gap-3 p-2.5 rounded-md transition-colors text-left ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-white/5'}"
    >
        <span class="p-1.5 rounded text-slate-500"> ${icon} </span>
        <span class="grow min-w-0">
            <span class="flex justify-between items-center gap-2">
                <span class="text-[13px] font-medium text-slate-100"
                    >${title}</span
                >
                ${badge
                    ? html`<span
                          class="mono text-[10px] text-slate-500 border border-white/10 rounded px-1.5 py-px"
                          >${badge}</span
                      >`
                    : ''}
            </span>
            <span class="block text-[11px] text-slate-500 truncate"
                >${desc}</span
            >
        </span>
    </button>
`;

import '@/ui/core/BaseDropdown.js';

const utilitiesMenuTemplate = (activeStream) => html`
    <base-dropdown class="w-80">
        <div
            slot="header"
            class="px-4 py-3 border-b border-white/5 mb-1 flex justify-between items-center"
        >
            <span class="mono text-[11px] font-medium text-slate-400"
                >Tools</span
            >
            <span class="text-slate-600">${icons.wrench}</span>
        </div>
        <div class="p-2">

        ${toolMenuItem(
            icons.calculator,
            'Timing calculator',
            activeStream?.protocol === 'dash'
                ? 'Debug DASH segment availability'
                : 'DASH streams only — current stream is not DASH',
            () => {
                if (activeStream?.protocol !== 'dash') return;
                closeDropdown();
                eventBus.dispatch(EVENTS.UI.SHOW_DASH_TIMING_CALCULATOR, {
                    streamId: activeStream.id,
                });
            },
            'dash',
            activeStream?.protocol !== 'dash'
        )}
        ${toolMenuItem(
            icons.zapOff,
            'Chaos tools',
            'Simulate network failures',
            () => {
                closeDropdown();
                openModalWithContent({
                    title: 'Chaos tools',
                    url: 'Network Interventions',
                    content: { type: 'networkIntervention', data: {} },
                    isFullWidth: false,
                });
            }
        )}
        ${toolMenuItem(
            icons.fileScan,
            'Segment inspector',
            'Analyze local ISOBMFF/TS files',
            () => {
                closeDropdown();
                const input = document.getElementById('global-segment-upload');
                if (input) input.click();
            }
        )}
        ${toolMenuItem(
            icons.shield,
            'PSSH inspector',
            'Decode and verify DRM init data',
            () => {
                closeDropdown();
                openModalWithContent({
                    title: 'PSSH inspector',
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
            'Manifest patcher',
            'Inject faults or modify tags',
            () => {
                closeDropdown();
                eventBus.dispatch(EVENTS.UI.SHOW_MANIFEST_PATCHER);
            }
        )}
        </div>
    </base-dropdown>
`;

// --- Compact Helpers ---
const compactPillButton = (icon, onClick, tooltip, colorClass = '') => html`
    <button
        @click=${onClick}
        class="w-8 h-8 rounded-md flex items-center justify-center transition-colors ${colorClass || 'text-slate-500 hover:text-slate-100 hover:bg-white/5'}"
        title="${tooltip}"
        aria-label="${tooltip}"
    >
        ${icon}
    </button>
`;

const compactCircleButton = (icon, onClick, title) => html`
    <button
        @click=${onClick}
        class="w-10 h-10 rounded-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 flex items-center justify-center transition-colors text-slate-300"
        title="${title}"
        aria-label="${title}"
    >
        ${icon}
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

    // Re-rendered by the shell on every store write; the armed flag is
    // module state so the label survives re-renders between taps.
    const newSessionLabel = isRestartArmed() ? 'Sure?' : 'New session';
    // --- COMPACT LAYOUT ---
    if (isGlobalNavCompact) {
        return html`
            <div class="flex flex-col items-center gap-3 py-3 px-1 w-full">
                <input type="file" id="global-segment-upload" class="hidden" multiple @change=${handleFileSelect} />

                <div class="flex flex-col gap-1 p-1 border border-white/10 rounded-md bg-white/[0.02]">
                    ${compactPillButton(icons.newAnalysis, handleRestart, 'New session (click twice to clear)')}
                    ${compactPillButton(icons.search, () => eventBus.dispatch('ui:search:open'), 'Search')}
                </div>

                ${hasLive ? html`
                    <div class="flex flex-col items-center border border-white/10 rounded-md overflow-hidden p-0.5">
                        <button
                            @click=${toggleAllPolling}
                            class="w-8 h-8 flex items-center justify-center rounded transition-colors ${isAnyPolling ? 'text-emerald-300' : 'text-slate-500'}"
                            title="${isAnyPolling ? `Polling on (${liveStreams.length} live)` : 'Polling paused'} — toggle all"
                            aria-label="${isAnyPolling ? 'Pause' : 'Resume'} live polling"
                        >
                            <span class="w-2.5 h-2.5 rounded-full bg-current"></span>
                        </button>
                        <button
                            @click=${(e) => toggleDropdown(e.currentTarget, pollingDropdownPanelTemplate, e, { side: 'right' })}
                            class="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-100 transition-colors"
                            title="Polling settings"
                            aria-label="Polling settings"
                        >
                            ${icons.settings}
                        </button>
                    </div>
                ` : ''}

                <div class="flex flex-col gap-1 items-center w-full">
                    ${compactCircleButton(icons.share, copyShareUrlToClipboard, 'Share')}
                    ${compactCircleButton(icons.settings, (e) => toggleDropdown(e.currentTarget, settingsDropdownTemplate, e, { side: 'right' }), 'Settings')}
                    ${compactCircleButton(icons.wrench, (e) => toggleDropdown(e.currentTarget, () => utilitiesMenuTemplate(activeStream), e, { side: 'right' }), 'Tools')}
                    ${isLoaded ? compactPillButton(icons.power, () => playerService.destroy(), 'Stop playback', 'text-red-400') : ''}
                    ${isDebugMode ? compactPillButton(icons.debug, (e) => toggleDropdown(e.currentTarget, debugDropdownPanelTemplate, e, { side: 'right' }), 'Debug', 'text-amber-300') : ''}
                </div>
            </div>
        `;
    }

    // --- EXPANDED LAYOUT ---
    return html`
        <div class="px-3 py-3 space-y-3 border-t border-white/5">
            <input type="file" id="global-segment-upload" class="hidden" multiple @change=${handleFileSelect} />

            <div class="flex gap-2">
                ${primaryButton(
                    icons.newAnalysis,
                    newSessionLabel,
                    handleRestart,
                    isRestartArmed() ? 'text-red-300 border-red-400/40' : ''
                )}
                ${primaryButton(icons.search, 'Search', () => eventBus.dispatch('ui:search:open'))}
            </div>

            ${hasLive ? html`
                <div class="flex items-center gap-1 border border-white/10 rounded-md overflow-hidden p-1">
                    <button
                        @click=${toggleAllPolling}
                        title="Toggle polling for all ${liveStreams.length} live stream(s)"
                        class="grow flex items-center justify-center gap-2 px-3 py-2 rounded mono text-[11px] transition-colors
                        ${isAnyPolling ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-slate-400'}"
                    >
                         <span class="w-2 h-2 rounded-full bg-current"></span>
                         <span>${isAnyPolling ? `polling (${liveStreams.length})` : 'paused'}</span>
                    </button>
                    <button
                        @click=${(e) => toggleDropdown(e.currentTarget, pollingDropdownPanelTemplate, e, { side: 'right' })}
                        class="p-2 text-slate-500 hover:text-slate-100 transition-colors"
                        title="Polling settings"
                        aria-label="Polling settings"
                    >
                        ${icons.settings}
                    </button>
                </div>
            ` : ''}

            <div class="grid grid-cols-3 gap-1 pt-3 border-t border-white/5">
                ${labeledIconButton(icons.share, 'Share', copyShareUrlToClipboard)}
                ${labeledIconButton(icons.settings, 'Settings', (e) => toggleDropdown(e.currentTarget, settingsDropdownTemplate, e, { side: 'right' }))}
                ${labeledIconButton(icons.wrench, 'Tools', (e) => toggleDropdown(e.currentTarget, () => utilitiesMenuTemplate(activeStream), e, { side: 'right' }))}
                ${isLoaded ? labeledIconButton(icons.power, 'Stop', () => playerService.destroy(), 'text-red-400') : ''}
                ${isDebugMode ? labeledIconButton(icons.debug, 'Debug', (e) => toggleDropdown(e.currentTarget, debugDropdownPanelTemplate, e, { side: 'right' }), 'text-amber-300') : ''}
            </div>
        </div>
    `;
};
