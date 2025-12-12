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
    classes = '',
    color = 'slate',
    action = null
) => {
    const colors = {
        slate: 'hover:border-slate-500/50 bg-slate-800/40',
        blue: 'hover:border-blue-500/50 bg-blue-900/10',
        purple: 'hover:border-purple-500/50 bg-purple-900/10',
        emerald: 'hover:border-emerald-500/50 bg-emerald-900/10',
    };

    return html`
        <div
            @click=${onClick}
            class="${classes} group relative p-5 rounded-3xl border border-slate-800 ${colors[
                color
            ]} backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden flex flex-col justify-between"
        >
            <div class="flex justify-between items-start mb-2">
                <div
                    class="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-slate-300 group-hover:text-white transition-colors shadow-inner"
                >
                    ${icon}
                </div>
                ${action
                    ? html`<div class="relative z-10">${action}</div>`
                    : ''}
            </div>
            <div>
                <h3
                    class="text-base font-bold text-slate-200 group-hover:text-white mb-1"
                >
                    ${title}
                </h3>
                <div
                    class="text-xs text-slate-500 font-medium leading-relaxed group-hover:text-slate-400 line-clamp-2"
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

    const handleQueue = (e) => {
        e.stopPropagation();
        analysisActions.addStreamInputFromPreset(item);
    };

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

    const handleResumeDirect = () => {
        if (history.length > 0) {
            analysisActions.setStreamInputs(history);
            const { streamInputs } = useAnalysisStore.getState();
            eventBus.dispatch(EVENTS.UI.STREAM_ANALYSIS_REQUESTED, {
                inputs: streamInputs,
            });
        }
    };

    const handleResumeStaging = () => {
        if (history.length > 0) {
            analysisActions.setStreamInputs(history);
        }
    };

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
              icons.history,
              html`Continue with
                  <span class="text-blue-400 font-mono"
                      >${new URL(latestStream.url).hostname}</span
                  >`,
              handleResumeStaging,
              'h-full',
              'blue',
              resumeAction
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
              'h-full',
              'slate'
          );

    return html`
        <div
            class="flex flex-col items-center w-full min-h-full pt-20 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-y-auto custom-scrollbar"
        >
            <!-- Hero Section -->
            <div
                class="w-full max-w-4xl text-center mb-12 relative z-10 animate-fadeInUp"
            >
                <h1
                    class="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-6 tracking-tight leading-tight"
                >
                    Analyze Streaming Media<br />
                    <span
                        class="text-slate-500 text-3xl sm:text-4xl lg:text-5xl"
                        >With Surgical Precision</span
                    >
                </h1>

                <p
                    class="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
                >
                    Parse manifests, inspect bitstreams, and validate compliance
                    for
                    <strong class="text-slate-200">MPEG-DASH</strong> &
                    <strong class="text-slate-200">HLS</strong>. Entirely local,
                    secure, and fast.
                </p>

                <div
                    class="max-w-2xl mx-auto shadow-2xl shadow-blue-900/10 rounded-2xl"
                >
                    <smart-input-component
                        variant="hero"
                    ></smart-input-component>
                </div>
            </div>

            <!-- Library Grid -->
            <!-- Changed h-48 to h-72 to allow stacked cards to have sufficient height -->
            <div
                class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeInUp"
                style="animation-delay: 100ms;"
            >
                <!-- Resume / Primary Action (Span 8) -->
                <div class="md:col-span-8 h-72">${slot1Content}</div>

                <!-- Quick Stats / Shortcuts (Span 4) -->
                <div class="md:col-span-4 flex flex-col gap-4 h-72">
                    ${bentoCard(
                        'Workspaces',
                        icons.folder,
                        html`${workspaces.length} saved sessions`,
                        openWorkspaces,
                        'flex-1 min-h-0',
                        'emerald'
                    )}
                    ${bentoCard(
                        'Presets',
                        icons.star,
                        html`${presets.length} configurations`,
                        openPresets,
                        'flex-1 min-h-0',
                        'purple'
                    )}
                </div>

                <!-- Recent History (Full Width) -->
                <div class="md:col-span-12">
                    <div
                        class="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm"
                    >
                        <div class="flex justify-between items-center mb-6">
                            <h3
                                class="font-bold text-slate-200 flex items-center gap-2"
                            >
                                ${icons.history} Recent Activity
                            </h3>
                            <button
                                @click=${() => {
                                    uiActions.setStreamLibraryTab('history');
                                    uiActions.setLibraryModalOpen(true);
                                }}
                                class="text-xs font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-1 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg"
                            >
                                View All ${icons.arrowRight}
                            </button>
                        </div>
                        <div
                            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                            ${history.length > 0
                                ? history
                                      .slice(0, 3)
                                      .map((h) =>
                                          quickLibraryCard(h, 'history')
                                      )
                                : html`<div
                                      class="col-span-full py-8 text-center text-slate-600 italic border-2 border-dashed border-slate-800/50 rounded-xl"
                                  >
                                      No recent streams found.
                                  </div>`}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Links -->
            <div class="mt-16 flex gap-6 text-slate-500">
                <button
                    @click=${openExamples}
                    class="hover:text-blue-400 transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                    ${icons.library} Load Example Streams
                </button>
            </div>
        </div>
    `;
};
