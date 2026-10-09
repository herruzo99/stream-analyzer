import { BaseView } from '@/ui/core/BaseView';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';

import { adTimelineTemplate } from './components/ad-timeline.js';
import { breakCardTemplate } from './components/break-card.js';
import { inspectorTemplate } from './components/inspector.js';
import { createAdvertisingViewModel } from './view-model.js';
import { statCardTemplate } from '@/features/summary/ui/components/shared';

// Prism Glass Layout Styles
// We can use these in styleMap for containers that need to look like glass cards
const layoutCardStyles = {
    borderRadius: 'var(--region-radius)',
    boxShadow: 'var(--region-shadow)',
    backdropFilter: 'var(--region-backdrop)',
};

class AdvertisingView extends BaseView {
    onMount() {
        this.selectedAvailId = null;
        // Start with sidebar enabled for this view
        uiActions.setActiveSidebar('contextual');

        // Subscribe to Analysis Store
        this.subscribe(useAnalysisStore, () => this.render());

        // Subscribe to UI Store
        // BaseView automatically filters out shell updates to prevent loops,
        // but reacts to other changes like activeSidebar.

        // Ensure Main slot has padding (Prism Glass default)
        this.setMainPadding(true);
    }

    onUnmount() {
        // BaseView handles subscription and slot cleanup
    }

    toggleSettings() {
        const { activeSidebar } = useUiStore.getState();
        const isContextualOpen = activeSidebar === 'contextual';

        if (isContextualOpen && !this.selectedAvailId) {
            // If already open and showing settings -> Close
            uiActions.setActiveSidebar(null);
        } else {
            // Else -> Open and show settings
            uiActions.setActiveSidebar('contextual');
            this.selectedAvailId = null;
        }
        // No need to call render manually; store update triggers it via BaseView subscription
    }

    renderTemplate() {
        const { streams, activeStreamId } = useAnalysisStore.getState();
        const { adDetectionPreferences } = useUiStore.getState();
        const stream = streams.find((s) => s.id === activeStreamId);

        // --- EMPTY STATE ---
        if (!stream) {
            this.setShellSlot('topBar', null);
            this.setShellSlot('rightSidebar', null);
            return html`
                <div class="flex flex-col items-center justify-center h-full text-[var(--text-on-A-secondary)] animate-fadeIn">
                    <div class="p-6 rounded-full bg-[var(--bg-surface-B-panel)] mb-4">
                        ${icons.search}
                    </div>
                    <p class="text-lg font-medium text-[var(--text-on-A-primary)]">
                        No stream loaded.
                    </p>
                </div>
            `;
        }

        const vm = createAdvertisingViewModel(stream, adDetectionPreferences);
        const selectedAvail = vm.avails.find((a) => a.id === this.selectedAvailId) || null;

        // --- SLOT INJECTION ---
        this.renderTopBar();
        this.renderRightSidebar(selectedAvail);

        // --- MAIN CONTENT ---
        const handleSelect = (avail) => {
            this.selectedAvailId = avail.id;
            // Ensure sidebar is open when selecting an item
            uiActions.setActiveSidebar('contextual');
            // Store update will trigger render, but selectedAvailId local change won't, so we render()
            this.render();
        };

        return html`
            <div class="flex flex-col h-full animate-fadeIn custom-scrollbar" style="gap: var(--region-gap)">
                
                <!-- STATS ROW -->
                <!-- We use a grid that adapts to screen size -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                    ${statCardTemplate({
            label: 'Total Breaks',
            value: vm.stats.totalAvails,
            icon: icons.layers,
            colorVar: '--secondary-accent',
            customClasses: '!bg-[var(--bg-glass-B-4)] hover:!bg-[var(--bg-glass-B-5)] transition-colors duration-300'
        })}
                    ${statCardTemplate({
            label: 'Ad Load',
            value: `${vm.stats.adLoad}%`,
            icon: icons.percent,
            tooltip: 'Percentage of total duration occupied by ads.',
            colorVar: '--primary-accent',
            customClasses: '!bg-[var(--bg-glass-B-3)] hover:!bg-[var(--bg-glass-B-4)] transition-colors duration-300'
        })}
                    ${statCardTemplate({
            label: 'Total Duration',
            value: `${vm.stats.totalAdDuration}s`,
            icon: icons.clock,
            colorVar: '--tertiary-accent',
            customClasses: '!bg-[var(--bg-glass-B-3)] hover:!bg-[var(--bg-glass-B-4)] transition-colors duration-300'
        })}
                    ${statCardTemplate({
            label: 'SCTE-35 Signals',
            value: (vm.stats.detectionCounts['SCTE35_INBAND'] || 0) + (vm.stats.detectionCounts['SCTE35_DATERANGE'] || 0),
            icon: icons.binary,
            colorVar: '--color-info',
            customClasses: '!bg-[var(--bg-glass-B-2)] hover:!bg-[var(--bg-glass-B-3)] transition-colors duration-300'
        })}
                </div>

                <!-- TIMELINE PANEL -->
                <div
                    class="p-6 transition-all duration-300 group"
                    style=${styleMap({ ...layoutCardStyles, background: 'var(--bg-glass-B-6)' })}
                >
                     <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xs font-bold text-[var(--text-on-A-secondary)] uppercase tracking-wider flex items-center gap-2">
                            <span class="p-1.5 rounded-lg bg-[var(--bg-surface-A-elevated)] text-[var(--primary-accent)]">
                                ${icons.barChart}
                            </span>
                            Timeline Visualization
                        </h3>
                        <span class="px-2 py-1 rounded-md bg-[var(--bg-surface-A-elevated)]/50 border border-[var(--border-on-A)]/30 text-[10px] font-mono text-[var(--text-on-A-secondary)] hover:text-[var(--text-on-A-primary)] transition-colors cursor-default">
                            ${vm.duration.toFixed(2)}s Total
                        </span>
                    </div>
                    ${adTimelineTemplate(vm.avails, vm.duration, handleSelect, this.selectedAvailId)}
                </div>

                <!-- BREAK CHRONOLOGY (FEED) -->
                <div
                    class="flex flex-col grow overflow-hidden transition-all duration-300"
                    style=${styleMap({ ...layoutCardStyles, background: 'var(--bg-glass-B-6)' })}
                >
                    <div class="p-4 border-b border-[var(--border-on-B)]/30 backdrop-blur-md flex items-center justify-between shrink-0">
                        <h3 class="text-xs font-bold text-[var(--text-on-A-secondary)] uppercase tracking-wider flex items-center gap-2">
                            <span class="p-1.5 rounded-lg bg-[var(--bg-surface-A-elevated)] text-[var(--secondary-accent)]">
                                ${icons.list}
                            </span>
                            Break Chronology
                        </h3>
                        <span class="px-2 py-0.5 rounded-full bg-[var(--primary-accent)]/10 border border-[var(--primary-accent)]/20 text-[10px] font-bold text-[var(--primary-accent)]">
                            ${vm.avails.length} Events
                        </span>
                    </div>

                    <div class="p-4 overflow-y-auto custom-scrollbar space-y-3 grow">
                        ${vm.avails.length === 0
                ? html`
                                <div class="flex flex-col items-center justify-center h-full text-[var(--text-on-A-secondary)] opacity-60">
                                    <div class="p-6 rounded-full bg-[var(--bg-surface-A-elevated)]/50 mb-4 border border-[var(--border-on-A)]/30">
                                        ${icons.ghost}
                                    </div>
                                    <p class="text-sm font-bold">No Ad Breaks Detected</p>
                                    <p class="text-xs mt-1 opacity-70">Adjust settings to enable heuristic detection</p>
                                </div>
                            `
                : vm.avails.map((avail) => breakCardTemplate(avail, avail.id === this.selectedAvailId, handleSelect))
            }
                    </div>
                </div>
            </div>
        `;
    }

    renderTopBar() {
        const { activeSidebar } = useUiStore.getState();
        const isContextualOpen = activeSidebar === 'contextual';
        const isSettingsActive = isContextualOpen && !this.selectedAvailId;

        // Inject Hero Header into Top Bar
        // We use { padding: true } to respect the shell gap
        this.setShellSlot('topBar', html`
            <div class="w-full h-full flex items-center justify-between">
                 <div class="relative group">
                    <div class="flex items-center gap-4 p-2">
                        <div class="p-3 rounded-xl bg-gradient-to-br from-[var(--primary-accent)]/20 to-[var(--secondary-accent)]/20 text-[var(--primary-accent)] shadow-inner border border-[var(--primary-accent)]/10 relative overflow-hidden">
                             ${icons.activity}
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-[var(--text-on-A-primary)] leading-none tracking-tight">
                                Ad Verification
                            </h1>
                            <div class="flex items-center gap-2 mt-1.5">
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-[var(--primary-accent)]/10 text-[var(--primary-accent)] border border-[var(--primary-accent)]/20">
                                    SCTE-35
                                </span>
                                <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--text-on-A-secondary)] opacity-80">
                                    & Manifest Analysis
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Action -->
                <button
                    @click=${() => this.toggleSettings()}
                    class="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 font-bold text-sm ${isSettingsActive
                ? 'bg-[var(--primary-accent)] text-[var(--text-on-accent)] border-[var(--primary-accent)] shadow-[0_0_15px_var(--primary-accent-glow)]'
                : 'bg-[var(--bg-surface-B-panel)]/50 text-[var(--text-on-A-secondary)] border-[var(--border-on-A)]/30 hover:bg-[var(--bg-surface-B-panel)] hover:text-[var(--text-on-A-primary)]'
            }"
                >
                    ${icons.settings}
                    <span>Config</span>
                </button>
            </div>
        `, { padding: true });
    }

    renderRightSidebar(selectedAvail) {
        const { activeSidebar } = useUiStore.getState();
        const isContextualOpen = activeSidebar === 'contextual';

        if (!isContextualOpen) {
            this.setShellSlot('rightSidebar', null);
            return;
        }

        // The Inspector template handles its own scrolling (h-full flex flex-col)
        // We inject it into the sidebar slot.
        const onClose = () => {
            // When closing from the Inspector (which is usually the "Configure" button in the Break card),
            // we want to return to the Settings view (Clear selection)
            this.selectedAvailId = null;
            this.render();
        };

        this.setShellSlot('rightSidebar', inspectorTemplate(selectedAvail, onClose));
    }
}

export const advertisingView = new AdvertisingView();
