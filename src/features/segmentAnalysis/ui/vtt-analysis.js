import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

const cueRowTemplate = (cue, index) => html`
    <tr class="hover:bg-slate-800/50 transition-colors">
        <td
            class="p-3 border-b border-slate-700/50 font-mono text-slate-500 text-right w-12"
        >
            ${index + 1}
        </td>
        <td
            class="p-3 border-b border-slate-700/50 font-mono text-cyan-300 whitespace-nowrap"
        >
            ${cue.startTime?.toFixed(3)}
            <span class="text-slate-600">→</span> ${cue.endTime?.toFixed(3)}
        </td>
        <td
            class="p-3 border-b border-slate-700/50 text-slate-200 text-sm leading-relaxed"
        >
            ${unsafeHTML(cue.payload.join('<br>'))}
        </td>
        <td
            class="p-3 border-b border-slate-700/50 font-mono text-xs text-yellow-500/80 break-all"
        >
            ${Object.keys(cue.settings).length
                ? Object.entries(cue.settings)
                      .map(([k, v]) => `${k}:${v}`)
                      .join(' ')
                : '-'}
        </td>
    </tr>
`;

const styleBlockTemplate = (style, index) => html`
    <div
        class="mb-4 last:mb-0 p-3 bg-slate-800/50 rounded border border-slate-700"
    >
        <div class="text-xs font-bold text-slate-500 mb-2 uppercase">
            Style Block #${index + 1}
        </div>
        <pre
            class="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap"
        >
${style}</pre
        >
    </div>
`;

const regionBlockTemplate = (region, index) => html`
    <div
        class="mb-4 last:mb-0 p-3 bg-slate-800/50 rounded border border-slate-700"
    >
        <div class="text-xs font-bold text-slate-500 mb-2 uppercase">
            Region #${index + 1}
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
            ${Object.entries(region).map(
                ([k, v]) => html`
                    <div
                        class="flex justify-between border-b border-slate-700/50 py-1"
                    >
                        <span class="text-slate-400">${k}</span>
                        <span class="text-slate-200">${v}</span>
                    </div>
                `
            )}
        </div>
    </div>
`;

export const vttAnalysisTemplate = (vttData) => {
    const hasRegions = vttData.regions && vttData.regions.length > 0;
    const hasStyles = vttData.styles && vttData.styles.length > 0;

    return html`
        <div class="space-y-6">
            <!-- Cues Section -->
            <div
                class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
            >
                <div class="p-4 border-b border-slate-800 bg-slate-950/30">
                    <h3
                        class="font-bold text-slate-200 flex items-center gap-2"
                    >
                        WebVTT Cues
                        <span class="text-slate-500 text-sm font-normal"
                            >(${vttData.cues.length})</span
                        >
                    </h3>
                </div>
                <div class="overflow-x-auto max-h-[500px] custom-scrollbar">
                    <table class="w-full text-left">
                        <thead
                            class="bg-slate-800/50 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10"
                        >
                            <tr>
                                <th class="p-3 text-right">#</th>
                                <th class="p-3">Timing</th>
                                <th class="p-3 w-1/2">Payload</th>
                                <th class="p-3">Settings</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vttData.cues.map(cueRowTemplate)}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Styles & Regions Grid -->
            ${hasRegions || hasStyles
                ? html`
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                          ${hasStyles
                              ? html`
                                    <div
                                        class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden h-full"
                                    >
                                        <div
                                            class="p-4 border-b border-slate-800 bg-slate-950/30"
                                        >
                                            <h3
                                                class="font-bold text-slate-200"
                                            >
                                                Styles
                                            </h3>
                                        </div>
                                        <div
                                            class="p-4 max-h-[300px] overflow-y-auto custom-scrollbar"
                                        >
                                            ${vttData.styles.map(
                                                styleBlockTemplate
                                            )}
                                        </div>
                                    </div>
                                `
                              : ''}
                          ${hasRegions
                              ? html`
                                    <div
                                        class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden h-full"
                                    >
                                        <div
                                            class="p-4 border-b border-slate-800 bg-slate-950/30"
                                        >
                                            <h3
                                                class="font-bold text-slate-200"
                                            >
                                                Regions
                                            </h3>
                                        </div>
                                        <div
                                            class="p-4 max-h-[300px] overflow-y-auto custom-scrollbar"
                                        >
                                            ${vttData.regions.map(
                                                regionBlockTemplate
                                            )}
                                        </div>
                                    </div>
                                `
                              : ''}
                      </div>
                  `
                : ''}
        </div>
    `;
};
