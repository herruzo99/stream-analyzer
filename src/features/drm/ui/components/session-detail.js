import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';
import { parseLicensePayload } from '../../domain/license-parser';

// Semantic Layout Styles for "Cards" 
const layoutCardStyles = {
    
    borderRadius: '0.75rem',
    boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
    backdropFilter: 'blur(12px)',
};

const keyRow = (key) => {
    const statusColors = {
        usable: 'text-emerald-400',
        expired: 'text-amber-400',
        'output-restricted': 'text-amber-400',
        'internal-error': 'text-red-400',
    };
    const color =
        statusColors[key.status] || 'text-slate-400';

    return html`
        <div
            class="flex items-center text-xs border-b border-white/10 py-3 last:border-0 hover:bg-white/10 px-3 rounded-md transition-colors group"
        >
            <div class="w-8 text-slate-400 group-hover:text-emerald-200 transition-colors">
                ${icons.key}
            </div>
            <div
                class="font-mono text-slate-100 grow select-all"
            >
                ${key.kid}
            </div>
            <div class="font-bold text-[10px] ${color}">
                ${key.status}
            </div>
        </div>
    `;
};

const payloadPreview = (data) => {
    if (!data) return '';
    const { format, content } = parseLicensePayload(data);
    return html`
        <div
            class="mt-2 bg-white/5 rounded-md p-3 border border-white/10 relative overflow-hidden group/code"
        >
             <div
                class="text-[9px] text-slate-400 font-bold mb-1 flex justify-between"
            >
                <span>${format}</span>
            </div>
            <pre
                class="text-[10px] font-mono text-slate-400 overflow-x-auto custom-scrollbar max-h-32"
            >
${content}</pre
            >
        </div>
    `;
};

const timelineItem = (item) => {
    const isNet = item.source === 'NETWORK';
    const icon = isNet
        ? icons.network
        : item.isError
            ? icons.alertTriangle
            : icons.activity;

    // Flat row style for items
    const cardClass = item.isError
        ? 'border-red-500/30 bg-red-500/5'
        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-400/50';

    const textClass = item.isError
        ? 'text-red-400'
        : 'text-slate-100';

    const iconBg = item.isError ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-slate-400';

    return html`
        <div class="flex gap-4 relative pb-6 last:pb-0 group">
            <!-- Timeline Line -->
            <div
                class="absolute left-[19px] top-8 bottom-0 w-px bg-white/5 group-last:hidden"
            ></div>

            <div
                class="relative z-10 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center shrink-0 transition-colors ${iconBg}"
            >
                ${icon}
            </div>

            <div class="grow min-w-0">
                <div class="rounded-md border p-4 transition-all duration-200 ${cardClass}">
                    <div class="flex justify-between items-start mb-1">
                        <span
                            class="text-xs font-bold ${textClass} r flex items-center gap-2"
                            >
                            ${item.source} 
                            <span class="w-1 h-1 rounded-full bg-slate-400 opacity-50"></span>
                            ${item.title}
                        </span>
                    </div>

                    ${isNet
            ? html`
                              <div
                                  class="flex gap-3 text-[10px] text-slate-400 font-mono mb-2"
                              >
                                  <span
                                      class="px-1.5 rounded-sm bg-white/5 border border-white/10 ${item.data.status >= 400 ? 'text-red-400 border-red-500/20' : 'text-emerald-400 border-emerald-500/20'}"
                                      >HTTP ${item.data.status}</span
                                  >
                                  <span class="opacity-70"
                                      >${Math.round(item.data.duration)}ms</span
                                  >
                              </div>
                              ${item.data.requestBody
                    ? payloadPreview(item.data.requestBody)
                    : ''}
                              ${item.data.responseBody
                    ? payloadPreview(item.data.responseBody)
                    : ''}
                          `
            : html`
                              <div
                                  class="text-xs text-slate-400 font-mono break-all"
                              >
                                  ${JSON.stringify(item.data, null, 2)}
                              </div>
                              ${item.data.message
                    ? html`
                                        <div
                                            class="mt-2 text-[10px] font-bold text-slate-400"
                                        >
                                            Message Buffer
                                        </div>
                                        ${payloadPreview(item.data.message)}
                                    `
                    : ''}
                          `}
                </div>
            </div>
        </div>
    `;
};

export const sessionDetailTemplate = (session, timeline) => {
    if (!session)
        return html`
            <div
                class="flex flex-col items-center justify-center h-full text-slate-400"
            >
                <div 
                    class="scale-150 opacity-50 mb-6 p-8 rounded-full bg-white/5 border border-white/10"
                >
                    ${icons.shield}
                </div>
                <p class="text-lg font-medium text-slate-200">No Session Selected</p>
                <p class="text-sm opacity-70">Select a session from the sidebar to inspect.</p>
            </div>
        `;

    return html`
        <div
            class="flex flex-col h-full w-full overflow-hidden relative transition-all duration-300"
             style=${styleMap({
        ...layoutCardStyles,
        background: '#1e293b',
        padding: '0'
    })}
        >
            <!-- Header -->
            <div
                class="p-6 border-b border-white/10 bg-white/5 shrink-0"
            >
                <div class="flex items-center gap-3 mb-2">
                    <h2
                        class="text-xl font-bold text-slate-100"
                    >
                        Session Inspector
                    </h2>
                    <span
                        class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-400/25 text-xs font-mono"
                    >
                        ${session.sessionId}
                    </span>
                </div>
                <div
                    class="flex gap-4 text-xs text-slate-400"
                >
                    <span class="flex items-center gap-1"
                        >System:
                        <span class="text-slate-100 font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10"
                            >${session.keySystem}</span
                        ></span
                    >
                    <span class="flex items-center gap-1"
                        >Keys:
                        <span class="text-slate-100 font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10"
                            >${session.keyStatuses.length}</span
                        ></span
                    >
                </div>
            </div>

            <div class="grow overflow-y-auto custom-scrollbar p-6 space-y-8">
                <!-- Key Table -->
                <section>
                    <h3
                        class="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2"
                    >
                        ${icons.key} Decryption Keys
                    </h3>
                    <div
                        class="bg-white/5 rounded-md border border-white/10 overflow-hidden"
                    >
                        ${session.keyStatuses.length > 0
            ? session.keyStatuses.map(keyRow)
            : html`<div
                                  class="p-8 text-center text-slate-400 text-sm italic"
                              >
                                  No keys loaded yet.
                              </div>`}
                    </div>
                </section>

                <!-- Unified Timeline -->
                <section>
                    <h3
                        class="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2"
                    >
                        ${icons.activity} Transaction History
                    </h3>
                    <div class="pl-2">${timeline.map(timelineItem)}</div>
                </section>
            </div>
        </div>
    `;
};
