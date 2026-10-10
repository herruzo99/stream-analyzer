import { eventBus } from '@/application/event-bus';
import {
    findDashMissingTooltips,
    findHlsMissingTooltips,
} from '@/features/parserCoverage/domain/tooltip-coverage-analyzer';
import { useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { openModalWithContent } from '@/ui/services/modalService';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html, render } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';
import xmlFormatter from 'xml-formatter';
import {
    dashManifestTemplate,
    flattenManifest,
} from './components/dash/renderer.js';
import { parseDuration } from './components/smart-tokens.js';
import { dashTooltipData } from './components/dash/tooltip-data.js';
import { hlsManifestTemplate } from './components/hls/renderer.js';
import { hlsTooltipData } from './components/hls/tooltip-data.js';
import './components/sidebar.js';

// Helper functions (Pure)
function calculateMatches(manifestObject, manifestString, protocol, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];

    const lowerTerm = searchTerm.toLowerCase();
    const indices = [];

    if (protocol === 'dash' && manifestObject) {
        const lines = [];
        flattenManifest(manifestObject, 'MPD', 0, lines);

        lines.forEach((line, index) => {
            const content = [
                line.tagName,
                line.content,
                ...Object.keys(line.attributes || {}),
                ...Object.values(line.attributes || {}),
            ]
                .join(' ')
                .toLowerCase();

            if (content.includes(lowerTerm)) {
                indices.push(index);
            }
        });
    } else {
        const lines = (manifestString || '').split(/\r?\n/);
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes(lowerTerm)) {
                indices.push(index);
            }
        });
    }
    return indices;
}

const layoutCardStyles = {

    borderRadius: '0.75rem',
    boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
    backdropFilter: 'blur(12px)',
};

class InteractiveManifestView {
    // Port note: was `extends BaseView` (never committed). The base only
    // provided container setup, subscribe() tracking, and shell padding
    // helpers; container/subscribe are inlined below, and the padding call
    // had no 1.2.0 equivalent (dropped).
    constructor() {
        this.hasContextualSidebar = true;
        this._unsubs = [];
        this.container = null;
        this.stream = null;

        // Interactive State
        this.delegatedEventHandler = this.handleInteraction.bind(this);
        this.boundHandleScroll = this.handleScroll.bind(this);

        this.currentStreamId = null;
        this.hoverDebounceTimeout = null;
        this.clockInterval = null;
        this.useSPD = true;
        this.isScrolling = false;
        this.scrollTimeout = null;
    }

    // =========================================================================
    // LIFECYCLE (1.2.0 view shape: mount/unmount)
    // =========================================================================

    subscribe(store, listener) {
        const unsubscribe = store.subscribe(listener);
        this._unsubs.push(unsubscribe);
        return unsubscribe;
    }

    /**
     * @param {HTMLElement} containerElement
     * @param {{ stream?: any }} [args]
     */
    mount(containerElement, { stream } = {}) {
        this.container = containerElement;
        this.stream = stream || null;
        this.onMount();
    }

    unmount() {
        this.onUnmount();
        for (const unsubscribe of this._unsubs.splice(0)) {
            try {
                unsubscribe();
            } catch {
                /* ignore late unsubscribe errors */
            }
        }
        if (this.container) render(html``, this.container);
        this.container = null;
        this.stream = null;
    }

    onMount() {
        this.currentStreamId = this.stream ? this.stream.id : null;

        // Subscriptions
        this.subscribe(useUiStore, (state, prevState) => { // Removed subscribeSelected for now
            if (
                state.interactiveManifestShowSubstituted !== prevState.interactiveManifestShowSubstituted ||
                state.interactiveManifestHoveredItem !== prevState.interactiveManifestHoveredItem ||
                state.interactiveManifestSelectedItem !== prevState.interactiveManifestSelectedItem ||
                state.manifestSearch !== prevState.manifestSearch
            ) {
                this.render();
            }
        });

        this.subscribe(useAnalysisStore, () => this.render());

        // Events
        // mount() sets this.container before onMount
        this.container.addEventListener('mouseover', this.delegatedEventHandler);
        this.container.addEventListener('mouseout', this.delegatedEventHandler);
        this.container.addEventListener('click', this.delegatedEventHandler);
        this.container.addEventListener('scroll', this.boundHandleScroll, { capture: true });

        // Shell Config
        uiActions.setActiveSidebar('contextual');

        // Clock
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 100);

        this.render();
    }

    onUnmount() {
        if (this.container) {
            this.container.removeEventListener('mouseover', this.delegatedEventHandler);
            this.container.removeEventListener('mouseout', this.delegatedEventHandler);
            this.container.removeEventListener('click', this.delegatedEventHandler);
            this.container.removeEventListener('scroll', this.boundHandleScroll, { capture: true });
        }

        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        if (this.hoverDebounceTimeout) clearTimeout(this.hoverDebounceTimeout);
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);

        this.currentStreamId = null;
        // shell slot cleanup handled by BaseView
    }

    // =========================================================================
    // LOGIC
    // =========================================================================

    updateClock() {
        // Calculate Time First (Independent of View)
        const realTime = Date.now();
        let simulatedTime = realTime;

        const { activeStreamId, streams } = useAnalysisStore.getState();
        const streamId = activeStreamId || this.currentStreamId;

        if (this.useSPD && streamId) {
            const stream = streams.find((s) => s.id === streamId);
            if (stream?.manifest?.serializedManifest?.[':@']?.suggestedPresentationDelay) {
                const spdStr = stream.manifest.serializedManifest[':@'].suggestedPresentationDelay;
                const spd = parseDuration(spdStr);
                if (spd) {
                    simulatedTime -= spd.total * 1000;
                }
            }
        }

        // Global Pulse (Dispatch REAL TIME, as badges now handle SPD offset themselves)
        // This prevents "Double Shifting" (Real - SPD vs Abs + SPD)
        document.dispatchEvent(
            new CustomEvent('manifest-ticker-pulse', { detail: { now: realTime } })
        );

        // Update Top Bar Clock (Use Simulated Time for display)
        const clockEl = document.getElementById('manifest-live-clock');
        if (clockEl) {
            clockEl.textContent = new Date(simulatedTime).toLocaleTimeString();
        }
    }

    handleScroll() {
        this.isScrolling = true;
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        if (this.hoverDebounceTimeout) clearTimeout(this.hoverDebounceTimeout);

        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
        }, 150);
    }

    handleInteraction(e) {
        const stream = useAnalysisStore.getState().streams.find(
            (s) => s.id === this.currentStreamId
        );
        if (!stream) return;

        if (this.isScrolling) return;

        const target = e.target;
        const token = target.closest('[data-type]');

        if (this.hoverDebounceTimeout) clearTimeout(this.hoverDebounceTimeout);

        if (e.type === 'mouseout') {
            const relatedTarget = e.relatedTarget;
            if (!e.currentTarget.contains(relatedTarget)) {
                eventBus.dispatch('ui:interactive-manifest:item-unhovered');
            }
            return;
        }

        if (token) {
            const type = token.dataset.type;
            const name = token.dataset.name;
            const path = token.dataset.path;
            const value = token.dataset.value;
            const timescale = token.dataset.timescale ? parseFloat(token.dataset.timescale) : null;
            const anchorTime = token.dataset.anchorTime ? parseFloat(token.dataset.anchorTime) : null;
            const pto = token.dataset.pto ? parseFloat(token.dataset.pto) : null;
            const spd = token.dataset.spd ? parseFloat(token.dataset.spd) : null;
            let allAttributes = {};
            try {
                if (token.dataset.allAttributes) {
                    allAttributes = JSON.parse(token.dataset.allAttributes);
                }
            } catch (e) {
                console.warn('Failed to parse allAttributes', e);
            }

            const tooltipData = stream.protocol === 'dash' ? dashTooltipData : hlsTooltipData;
            const info = tooltipData[name] || {
                text: `No definition found for "${name}".`,
                isoRef: 'N/A',
            };

            const parentTag = name.includes('@') ? name.split('@')[0] : null;
            const item = {
                type, name, key: name, info, path, value, parentTag,
                context: { timescale, anchorTime, pto, spd, allAttributes },
            };

            if (e.type === 'mouseover') {
                this.hoverDebounceTimeout = setTimeout(() => {
                    uiActions.setInteractiveManifestHoveredItem(item);
                }, 50);
            } else if (e.type === 'click') {
                uiActions.setInteractiveManifestSelectedItem(item);
                uiActions.setInteractiveManifestHoveredItem(item);
            }
        }
    }

    // =========================================================================
    // RENDERING
    // =========================================================================

    render() {
        if (!this.container || this.currentStreamId === null) return;

        const stream = useAnalysisStore.getState().streams.find((s) => s.id === this.currentStreamId);
        if (!stream || !stream.manifest) {
            render(
                html`
                    <div class="flex flex-col items-center justify-center h-full text-slate-400 animate-fadeIn">
                         <p class="text-lg font-medium text-slate-200">No Manifest loaded.</p>
                    </div>
                `,
                this.container
            );
            const sidebarContainer = document.getElementById('contextual-sidebar');
            if (sidebarContainer) render(html``, sidebarContainer);
            return;
        }

        const {
            interactiveManifestShowSubstituted,
            interactiveManifestHoveredItem,
            interactiveManifestSelectedItem,
            manifestSearch,
        } = useUiStore.getState();

        let manifestToRender = null;
        let stringToRender = null;
        let diffData = null;
        let targetSerializedForAnalysis = stream.manifest.serializedManifest;

        // XML Formatting Cache check
        if (!stream.formattedManifestCache) {
            stream.formattedManifestCache = { raw: null, formatted: null };
        }

        // Logic for HLS Media Playlists vs Master
        if (stream.protocol === 'hls' && stream.activeMediaPlaylistId && stream.activeMediaPlaylistId !== 'master') {
            const mediaPlaylist = stream.mediaPlaylists.get(stream.activeMediaPlaylistId);
            if (!mediaPlaylist) return;
            stringToRender = mediaPlaylist.rawManifest;
            if (interactiveManifestShowSubstituted && mediaPlaylist.manifest?.serializedManifest?.substitutedRaw) {
                stringToRender = mediaPlaylist.manifest.serializedManifest.substitutedRaw;
            }
            if (mediaPlaylist.manifest) {
                targetSerializedForAnalysis = mediaPlaylist.manifest.serializedManifest;
            }
        } else {
            stringToRender = stream.rawManifest;
            manifestToRender = stream.manifest.serializedManifest;
            if (stream.patchedRawManifest) {
                stringToRender = stream.patchedRawManifest;
                manifestToRender = stream.manifest.serializedManifest;
            }
            if (stream.protocol === 'dash' && stringToRender) {
                if (stream.formattedManifestCache.raw !== stringToRender) {
                    const lines = stringToRender.split('\n').length;
                    if (lines < 10 && stringToRender.length > 200) {
                        try {
                            const formatted = xmlFormatter(stringToRender, { indentation: '  ', collapseContent: true, lineSeparator: '\n' });
                            stream.formattedManifestCache.raw = stringToRender;
                            stream.formattedManifestCache.formatted = formatted;
                            stringToRender = formatted;
                        } catch {
                            stream.formattedManifestCache.raw = stringToRender;
                            stream.formattedManifestCache.formatted = stringToRender;
                        }
                    } else {
                        stream.formattedManifestCache.raw = stringToRender;
                        stream.formattedManifestCache.formatted = stringToRender;
                    }
                } else {
                    stringToRender = stream.formattedManifestCache.formatted;
                }
            }
        }

        // Search Matches
        if (manifestSearch.term && manifestSearch.term.length >= 2) {
            const matches = calculateMatches(manifestToRender, stringToRender, stream.protocol, manifestSearch.term);
            if (matches.length !== manifestSearch.matchIndices.length || matches[0] !== manifestSearch.matchIndices[0]) {
                setTimeout(() => uiActions.setManifestSearchMatches(matches), 0);
            }
        } else if (manifestSearch.matchIndices.length > 0) {
            setTimeout(() => uiActions.setManifestSearchMatches([]), 0);
        }

        // Actions
        const handlePatcher = () => {
            openModalWithContent({
                title: 'Manifest Patcher',
                url: stream.originalUrl,
                content: { type: 'manifestPatcher', data: { streamId: stream.id } },
                isFullWidth: true,
            });
        };
        const handleTimingCalculator = () => {
            eventBus.dispatch(EVENTS.UI.SHOW_DASH_TIMING_CALCULATOR, { streamId: stream.id });
        };
        const handleDownloadDebug = () => {
            let missingItems = [];
            if (stream.protocol === 'dash') missingItems = findDashMissingTooltips(targetSerializedForAnalysis);
            else if (stream.protocol === 'hls') missingItems = findHlsMissingTooltips(targetSerializedForAnalysis);

            const reportText = missingItems.length > 0
                ? missingItems.map((m) => `[${m.type}] ${m.name}`).join('\n')
                : 'No missing tooltip definitions found.';
            const content = `--- MANIFEST CONTENT (${stream.name}) ---\n\n${stringToRender}\n\n--- MISSING TOOLTIP DEFINITIONS REPORT ---\nGenerated: ${new Date().toISOString()}\nProtocol: ${stream.protocol.toUpperCase()}\nContext: ${stream.activeMediaPlaylistId || 'Main'}\n\n${reportText}\n`;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${stream.name.replace(/[^a-z0-9]/gi, '_')}_debug_report.txt`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        };

        // Topbar
        const searchBar = html`
            <div class="flex items-center bg-slate-800 rounded-full border border-slate-800 p-0.5 mx-2 min-w-[240px]">
                <div class="pl-3 text-slate-400">${icons.search}</div>
                <input type="text"
                    class="bg-transparent border-none text-xs text-slate-100 focus:ring-0 h-8 w-24 sm:w-48 placeholder-slate-400"
                    placeholder="Find in manifest..."
                    .value=${manifestSearch.term}
                    @input=${(e) => uiActions.setManifestSearchTerm(e.target.value)}
                    @keydown=${(e) => {
                if (e.key === 'Enter') {
                    if (e.shiftKey) uiActions.prevManifestSearchResult();
                    else uiActions.nextManifestSearchResult();
                }
            }}
                />
                ${manifestSearch.matchIndices.length > 0
                ? html`
                          <span class="text-[10px] text-slate-400 font-mono whitespace-nowrap px-1">
                              ${manifestSearch.currentResultIndex + 1}/${manifestSearch.matchIndices.length}
                          </span>
                          <div class="flex border-l border-slate-800 ml-1 pl-1">
                              <button @click=${() => uiActions.prevManifestSearchResult()} class="p-1 hover:text-slate-100 text-slate-400 hover:bg-slate-800 rounded-full">${icons.chevronUp}</button>
                              <button @click=${() => uiActions.nextManifestSearchResult()} class="p-1 hover:text-slate-100 text-slate-400 hover:bg-slate-800 rounded-full">${icons.chevronDown}</button>
                          </div>
                      `
                : ''}
                ${manifestSearch.term ? html`<button @click=${() => uiActions.setManifestSearchTerm('')} class="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-full ml-1">${icons.xCircle}</button>` : ''}
            </div>
        `;

        const toolbar = html`
            <div class="w-full h-full flex items-center justify-between px-4">
                <div class="flex items-center gap-4">
                    <div class="flex flex-col">
                         <span class="font-bold text-slate-200 truncate max-w-[200px]" title="${stream.name}">${stream.name}</span>
                         <div class="flex items-center gap-2">
                             <span class="text-[10px] font-mono text-slate-400">${stream.protocol.toUpperCase()}</span>
                             ${stream?.manifest?.type === 'dynamic'
                                 ? html`<span
                                       class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider"
                                       title="Live stream (dynamic manifest): badges show LIVE/age verdicts against the live edge"
                                       ><span class="relative flex h-1.5 w-1.5"
                                           ><span
                                               class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                                           ></span
                                           ><span
                                               class="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"
                                           ></span></span
                                       >Live</span
                                   >`
                                 : ''}
                             ${stream.protocol === 'dash' && stream.manifest?.serializedManifest?.[':@']?.availabilityStartTime
                ? html`
                                      <div class="flex items-center gap-2 pl-2 border-l border-slate-700/30">
                                          <div class="flex items-center gap-1.5">
                                              ${stream.manifest?.serializedManifest?.[':@']?.suggestedPresentationDelay
                        ? html`
                                                        ${(() => {
                                const spdStr = stream.manifest.serializedManifest[':@'].suggestedPresentationDelay;
                                const spd = parseDuration(spdStr);
                                const spdSecs = spd ? spd.total : 0;
                                return html`
                                                                <button @click=${() => { this.useSPD = !this.useSPD; this.render(); this.updateClock(); }}
                                                                    class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-200 ${this.useSPD ? 'bg-blue-500 border-blue-500 text-slate-200 shadow-[0_0_15px_#3b82f6/40] ring-1 ring-blue-500/50' : 'bg-slate-800 border-slate-800 text-slate-400 hover:border-blue-500 hover:text-blue-400'}"
                                                                    title="Toggle Suggested Presentation Delay">
                                                                    <div class="flex items-center gap-1">
                                                                        <span class="text-[9px] font-black tracking-wider uppercase ${this.useSPD ? 'opacity-100' : 'opacity-70'}">SPD</span>
                                                                        <span class="text-[10px] font-mono font-bold ${this.useSPD ? 'bg-white/20' : 'bg-black/10'} px-1 rounded-sm">${spdSecs}s</span>
                                                                    </div>
                                                                    <div class="w-1.5 h-1.5 rounded-full ${this.useSPD ? 'bg-white animate-pulse' : 'bg-slate-400/50'}"></div>
                                                                </button>
                                                            `;
                            })()}
                                                    ` : ''
                    }
                                          </div>
                                          <span id="manifest-live-clock" class="text-[10px] font-mono text-blue-400 font-bold tracking-tight">--:--:--</span>
                                      </div>
                                  ` : ''
            }
                         </div>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                     ${searchBar}
                     <div class="h-6 w-px bg-slate-800/50 mx-1"></div>
                     ${stream.protocol === 'dash' ? html`<button @click=${handleTimingCalculator}
                        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500 text-slate-100 text-[11px] font-bold uppercase tracking-wider border border-blue-500 shadow-[0_0_15px_#3b82f6_40] hover:brightness-110 transition-all"
                        title="Open the DASH Timing Calculator">${icons.calculator}<span class="hidden sm:inline">Calculator</span></button>` : ''}
                    <button @click=${handleDownloadDebug} class="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors relative group" title="Download Manifest & Debug Report">${icons.download}</button>
                    <button @click=${handlePatcher} class="p-2 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors relative group" title="Manifest Patcher">${icons.code}</button>
                    <button @click=${() => copyTextToClipboard(stringToRender, 'Copied!')} class="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors relative group" title="Copy to Clipboard">${icons.clipboardCopy}</button>
                </div>
            </div>
        `;
        // (1.2.0 has no shell slots: toolbar is composed into the template below)

        // Sidebar + rows share one clock: raw wall time for live streams
        // only. Badges subtract SPD themselves (see the manifest ticker
        // comment in updateClock); VOD gets null so no live/freshness
        // badges render.
        const isLiveStream = stream?.manifest?.type === 'dynamic';
        const now = isLiveStream ? Date.now() : null;
        // Pass useSPD state to sidebar (rendered into the shell's contextual
        // sidebar element, as in 1.2.0 — there are no shell slots)
        const sidebarContainer = document.getElementById('contextual-sidebar');
        if (sidebarContainer) {
            render(
                html`<interactive-manifest-sidebar .now=${now} .isSpdActive=${this.useSPD}></interactive-manifest-sidebar>`,
                sidebarContainer
            );
        }

        // Content
        const searchMatchLineIndex = manifestSearch.matchIndices.length > 0 && manifestSearch.currentResultIndex !== -1
            ? manifestSearch.matchIndices[manifestSearch.currentResultIndex] : -1;
        const allMatchIndices = new Set(manifestSearch.matchIndices);

        let codeView;
        if (stream.protocol === 'hls') {
            codeView = hlsManifestTemplate(
                stream, stringToRender, interactiveManifestHoveredItem, interactiveManifestSelectedItem,
                new Set(), diffData, searchMatchLineIndex, allMatchIndices
            );
        } else {
            codeView = dashManifestTemplate(
                manifestToRender, interactiveManifestHoveredItem, interactiveManifestSelectedItem,
                new Set(), diffData, searchMatchLineIndex, allMatchIndices, now, this.useSPD
            );
        }

        render(
            html`
                <div class="flex flex-col h-full w-full relative overflow-hidden">
                    <div class="shrink-0 px-2 pt-2">${toolbar}</div>
                    <div class="grow relative overflow-hidden flex flex-col" style=${styleMap({ ...layoutCardStyles, background: '#1e293b', padding: '0' })}>
                         <div class="grow relative overflow-hidden bg-transparent custom-scrollbar flex flex-col" id="manifest-code-container">
                             ${codeView}
                        </div>
                    </div>
                </div>
            `,
            this.container
        );
    }
}

export const interactiveManifestView = new InteractiveManifestView();
