import { eventBus } from '@/application/event-bus';
import {
    getLastUsedStreams,
    getPresets,
    getWorkspaces,
} from '@/infrastructure/persistence/streamStorage';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import './smart-input.js';

const bentoCard = (
    title,
    icon,
    content,
    onClick,
    size = 'sm',
    color = 'slate',
    action = null
) => {
    const sizes = { sm: 'col-span-1', md: 'col-span-2' };
    const colors = {
        slate: 'hover:border-slate-500/50 bg-slate-800/40',
        blue: 'hover:border-blue-500/50 bg-blue-900/10',
        purple: 'hover:border-purple-500/50 bg-purple-900/10',
        emerald: 'hover:border-emerald-500/50 bg-emerald-900/10',
    };

    return html`
        <div
            @click=${onClick}
            class="${sizes[
                size
            ]} group relative p-6 rounded-3xl border border-slate-800 ${colors[
                color
            ]} backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden h-48 flex flex-col"
        >
            <div class="flex justify-between items-start mb-4">
                <div
                    class="p-3 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 group-hover:text-white transition-colors shadow-inner"
                >
                    ${icon}
                </div>
                ${action
                    ? html`<div class="relative z-10">${action}</div>`
                    : size === 'md'
                      ? html`<div
                            class="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-slate-400"
                        >
                            Quick Load &rarr;
                        </div>`
                      : ''}
            </div>
            <div class="mt-auto">
                <h3
                    class="text-lg font-bold text-slate-200 group-hover:text-white mb-1"
                >
                    ${title}
                </h3>
                <div
                    class="text-sm text-slate-500 font-medium leading-relaxed group-hover:text-slate-400 line-clamp-2"
                >
                    ${content}
                </div>
            </div>
        </div>
    `;
};

const quickLibraryCard = (item, type) => {
    const isPreset = type === 'preset';
    const icon = isPreset ? icons.star : icons.history;
    const color = isPreset ? 'text-yellow-400' : 'text-blue-400';

    // Action: Queue the item (add to staging without running)
    const handleQueue = (e) => {
        e.stopPropagation();
        analysisActions.addStreamInputFromPreset(item);
    };

    // Action: Run immediately (replace queue and start analysis)
    const handleRun = (e) => {
        e.stopPropagation();
        analysisActions.setStreamInputs([item]);
        const { streamInputs } = useAnalysisStore.getState();
        eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
            inputs: streamInputs,
        });
    };

    return html`
        <div
            class="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 transition-all group w-full hover:bg-slate-800 hover:border-slate-600"
        >
            <div
                class="shrink-0 p-2 rounded-lg bg-slate-900 border border-slate-800 ${color}"
            >
                ${icon}
            </div>

            <div
                class="grow min-w-0 cursor-pointer"
                @click=${handleQueue}
                title="Click to add to queue"
            >
                <div
                    class="text-xs font-bold text-slate-300 group-hover:text-white truncate transition-colors"
                >
                    ${item.name}
                </div>
                <div
                    class="text-[10px] font-mono text-slate-500 truncate opacity-60 group-hover:opacity-80 transition-opacity"
                >
                    ${new URL(item.url).hostname}
                </div>
            </div>

            <div
                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <button
                    @click=${handleRun}
                    class="p-2 text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors"
                    title="Analyze Now"
                >
                    ${icons.play}
                </button>
                <button
                    @click=${handleQueue}
                    class="p-2 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Add to Queue"
                >
                    ${icons.plusCircle}
                </button>
            </div>
        </div>
    `;
};

export const landingViewTemplate = () => {
    const history = getLastUsedStreams();
    const presets = getPresets();
    const workspaces = getWorkspaces();
    const latestStream = history[0];

    const openWorkspaces = () => {
        uiActions.setStreamLibraryTab('workspaces');
        uiActions.setLibraryModalOpen(true);
    };

    const openPresets = () => {
        uiActions.setStreamLibraryTab('presets');
        uiActions.setLibraryModalOpen(true);
    };

    const openExamples = () => {
        uiActions.setStreamLibraryTab('examples');
        uiActions.setLibraryModalOpen(true);
    };

    // Action: Direct to Analysis (Run)
    const handleResumeDirect = () => {
        if (history.length > 0) {
            analysisActions.setStreamInputs(history);
            const { streamInputs } = useAnalysisStore.getState();
            eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
                inputs: streamInputs,
            });
        }
    };

    // Action: Open in Staging Area (Edit)
    const handleResumeStaging = () => {
        if (history.length > 0) {
            analysisActions.setStreamInputs(history);
            // Setting streamInputs triggers the UI to switch to staging view automatically via input-view logic
        }
    };

    // Split Button for Resume Card: Right side (Play) triggers direct analysis
    const resumeAction = html`
        <button
            @click=${(e) => {
                e.stopPropagation();
                handleResumeDirect();
            }}
            class="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/30 transition-all hover:scale-110 active:scale-95 border border-blue-400/20"
            title="Analyze Immediately"
        >
            ${icons.play}
        </button>
    `;

    const slot1Content = latestStream
        ? bentoCard(
              'Resume Session',
              icons.history, // Using history icon for the main "load to staging" area
              html`Continue with
                  <span class="text-blue-400 font-mono"
                      >${new URL(latestStream.url).hostname}</span
                  >`,
              handleResumeStaging, // Main card click -> Staging
              'sm',
              'blue',
              resumeAction // Floating action -> Direct Analysis
          )
        : bentoCard(
              'New Analysis',
              icons.plusCircle,
              'Start fresh. Paste a manifest or drop a file above.',
              () => {
                  const input = /** @type {HTMLElement} */ (
                      document.querySelector('smart-input-component')
                  );
                  if (input) input.focus();
              },
              'sm',
              'slate'
          );

    return html`
        <div
            class="flex flex-col items-center h-full w-full p-8 pb-20 overflow-y-auto custom-scrollbar"
        >
            <div class="w-full max-w-2xl mb-16 text-center relative z-10">
                <div class="inline-block mb-6 relative">
                    <div
                        class="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"
                    ></div>
                    <img
                        src="/icon.png"
                        class="relative w-20 h-20 drop-shadow-2xl"
                        alt="Logo"
                    />
                </div>
                <h1
                    class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-4 tracking-tight"
                >
                    Stream Analyzer
                </h1>
                <p
                    class="text-lg text-slate-400 font-medium max-w-lg mx-auto mb-10 leading-relaxed"
                >
                    The professional workbench for DASH & HLS validation.
                    <span class="text-slate-500"
                        >Parse, inspect, and debug streaming manifests.</span
                    >
                </p>
                <smart-input-component variant="hero"></smart-input-component>
            </div>

            <div class="w-full max-w-5xl space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${slot1Content}
                    ${bentoCard(
                        'Workspaces',
                        icons.folder,
                        html`${workspaces.length} environments saved.`,
                        openWorkspaces,
                        'sm',
                        'emerald'
                    )}
                    ${bentoCard(
                        'Presets',
                        icons.star,
                        html`Access ${presets.length} configurations.`,
                        openPresets,
                        'sm',
                        'purple'
                    )}
                </div>

                <div
                    class="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm"
                >
                    <div class="flex items-center justify-between mb-4">
                        <h3
                            class="font-bold text-slate-300 flex items-center gap-2"
                        >
                            ${icons.history} Recent History
                        </h3>
                        <button
                            @click=${() => {
                                uiActions.setStreamLibraryTab('history');
                                uiActions.setLibraryModalOpen(true);
                            }}
                            class="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            View All
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${history.length > 0
                            ? history
                                  .slice(0, 4)
                                  .map((h) => quickLibraryCard(h, 'history'))
                            : html`<div
                                  class="col-span-2 text-center text-slate-600 text-xs italic py-4"
                              >
                                  No recent history found.
                              </div>`}
                    </div>
                </div>

                <div class="flex justify-center pt-8 gap-6">
                    <button
                        @click=${openExamples}
                        class="flex items-center gap-2 text-slate-500 hover:text-white text-xs font-bold transition-colors"
                    >
                        ${icons.library} Public Examples
                    </button>
                </div>
            </div>
        </div>
    `;
};
