import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { parseLicensePayload } from '../../domain/license-parser';

const keyRow = (key) => {
    const statusColors = {
        usable: 'text-green-400',
        expired: 'text-yellow-400',
        'output-restricted': 'text-orange-400',
        'internal-error': 'text-red-400',
    };
    const color = statusColors[key.status] || 'text-slate-400';

    return html`
        <div
            class="flex items-center text-xs border-b border-slate-800/50 py-2 last:border-0 hover:bg-slate-800/30 px-2 rounded"
        >
            <div class="w-8 text-slate-500">${icons.key}</div>
            <div class="font-mono text-slate-300 grow select-all">
                ${key.kid}
            </div>
            <div class="font-bold uppercase text-[10px] ${color}">
                ${key.status}
            </div>
        </div>
    `;
};

const payloadPreview = (data) => {
    if (!data) return '';
    const { format, content } = parseLicensePayload(data);
    return html`
        <div class="mt-2 bg-black/20 rounded p-2 border border-slate-800/50">
            <div class="text-[9px] text-slate-500 font-bold uppercase mb-1">
                ${format}
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
    const borderClass = item.isError
        ? 'border-red-500/30 bg-red-900/5'
        : 'border-slate-700/50 bg-slate-800/20';
    const textClass = item.isError ? 'text-red-300' : 'text-slate-300';

    return html`
        <div class="flex gap-4 relative pb-6 last:pb-0 group">
            <!-- Timeline Line -->
            <div
                class="absolute left-[19px] top-8 bottom-0 w-px bg-slate-800 group-last:hidden"
            ></div>

            <div
                class="relative z-10 w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0 shadow-sm"
            >
                ${icon}
            </div>

            <div class="grow min-w-0">
                <div class="rounded-lg border p-3 ${borderClass}">
                    <div class="flex justify-between items-start mb-1">
                        <span
                            class="text-xs font-bold ${textClass} uppercase tracking-wider"
                            >${item.source} • ${item.title}</span
                        >
                    </div>

                    ${isNet
                        ? html`
                              <div
                                  class="flex gap-3 text-[10px] text-slate-500 font-mono mb-2"
                              >
                                  <span
                                      class="${item.data.status >= 400
                                          ? 'text-red-400'
                                          : 'text-emerald-400'}"
                                      >HTTP ${item.data.status}</span
                                  >
                                  <span
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
                                            class="mt-2 text-[10px] font-bold text-slate-500 uppercase"
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
                class="flex flex-col items-center justify-center h-full text-slate-500"
            >
                <div class="scale-150 opacity-50 mb-4">${icons.shield}</div>
                <p>Select a session to inspect.</p>
            </div>
        `;

    return html`
        <div class="flex flex-col h-full bg-slate-950 overflow-hidden">
            <!-- Header -->
            <div class="p-6 border-b border-slate-800 bg-slate-900/30 shrink-0">
                <div class="flex items-center gap-3 mb-2">
                    <h2 class="text-xl font-bold text-white">
                        Session Inspector
                    </h2>
                    <span
                        class="px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300 border border-purple-500/30 text-xs font-mono"
                    >
                        ${session.sessionId}
                    </span>
                </div>
                <div class="flex gap-4 text-xs text-slate-400">
                    <span
                        >System:
                        <span class="text-white font-bold"
                            >${session.keySystem}</span
                        ></span
                    >
                    <span
                        >Keys:
                        <span class="text-white font-bold"
                            >${session.keyStatuses.length}</span
                        ></span
                    >
                </div>
            </div>

            <div class="grow overflow-y-auto custom-scrollbar p-6 space-y-8">
                <!-- Key Table -->
                <section>
                    <h3
                        class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3"
                    >
                        Decryption Keys
                    </h3>
                    <div
                        class="bg-slate-900 rounded-xl border border-slate-800 p-2"
                    >
                        ${session.keyStatuses.length > 0
                            ? session.keyStatuses.map(keyRow)
                            : html`<div
                                  class="p-4 text-center text-slate-600 text-xs italic"
                              >
                                  No keys loaded yet.
                              </div>`}
                    </div>
                </section>

                <!-- Unified Timeline -->
                <section>
                    <h3
                        class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4"
                    >
                        Transaction History
                    </h3>
                    <div class="pl-2">${timeline.map(timelineItem)}</div>
                </section>
            </div>
        </div>
    `;
};
