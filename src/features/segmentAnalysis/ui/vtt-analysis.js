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

export const vttAnalysisTemplate = (vttData) => {
    return html`
        <div
            class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
        >
            <div class="p-4 border-b border-slate-800 bg-slate-950/30">
                <h3 class="font-bold text-slate-200 flex items-center gap-2">
                    WebVTT Cues
                    <span class="text-slate-500 text-sm font-normal"
                        >(${vttData.cues.length})</span
                    >
                </h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead
                        class="bg-slate-800/50 text-xs uppercase font-bold text-slate-500"
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
    `;
};
