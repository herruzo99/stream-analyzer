import {
    getLastUsedStreams,
    getPresets,
    getWorkspaces,
} from '@/infrastructure/persistence/streamStorage';
import { analysisActions } from '@/state/analysisStore';
import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import './smart-input.js';

const bentoCard = (
    title,
    icon,
    content,
    onClick,
    size = 'sm',
    color = 'slate'
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
                ${size === 'md'
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

export const landingViewTemplate = () => {
    const history = getLastUsedStreams();
    const presets = getPresets();
    const workspaces = getWorkspaces();
    const latestStream = history[0];

    // Correctly handle Workspace button click: Set tab THEN open modal
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

    // Slot 1: Dynamic content but stable size/position
    const slot1Content = latestStream
        ? bentoCard(
              'Resume Session',
              icons.play,
              html`Continue with
                  <span class="text-blue-400 font-mono"
                      >${new URL(latestStream.url).hostname}</span
                  >`,
              () => analysisActions.setStreamInputs(history),
              'sm',
              'blue'
          )
        : bentoCard(
              'New Analysis',
              icons.plusCircle,
              'Start fresh. Paste a manifest or drop a file above.',
              () => {}, // No-op, guides user to input
              'sm',
              'slate'
          );

    return html`
        <div
            class="flex flex-col items-center min-h-full w-full p-8 pb-20 overflow-y-auto custom-scrollbar"
        >
            <!-- Hero Section -->
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

            <!-- Stable Grid Layout -->
            <div class="w-full max-w-5xl space-y-4">
                <!-- Top Row: Quick Access -->
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

                <!-- Bottom Row: Recent History -->
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
                        ${history.slice(0, 4).map(
                            (h) => html`
                                <button
                                    @click=${() =>
                                        analysisActions.addStreamInputFromPreset(
                                            h
                                        )}
                                    class="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all group text-left"
                                >
                                    <div class="min-w-0 pr-4">
                                        <div
                                            class="font-bold text-slate-200 text-xs truncate group-hover:text-blue-300 transition-colors"
                                        >
                                            ${h.name}
                                        </div>
                                        <div
                                            class="text-[10px] text-slate-500 font-mono truncate opacity-60"
                                        >
                                            ${h.url}
                                        </div>
                                    </div>
                                    <div
                                        class="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded bg-black/20 border border-white/5"
                                    >
                                        ${h.protocol || 'UNK'}
                                    </div>
                                </button>
                            `
                        )}
                        ${history.length === 0
                            ? html`<div
                                  class="col-span-2 text-center text-slate-600 text-xs italic py-4"
                              >
                                  No recent history found.
                              </div>`
                            : ''}
                    </div>
                </div>

                <!-- Footer Links -->
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
