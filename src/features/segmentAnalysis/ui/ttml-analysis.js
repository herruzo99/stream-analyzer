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
            class="p-3 border-b border-slate-700/50 font-mono text-purple-300 whitespace-nowrap"
        >
            ${cue.startTime?.toFixed(3)}
            <span class="text-slate-600">→</span> ${cue.endTime?.toFixed(3)}
        </td>
        <td
            class="p-3 border-b border-slate-700/50 text-slate-200 text-sm leading-relaxed break-all"
        >
            ${cue.payload
                ? unsafeHTML(
                      cue.payload
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                  )
                : ''}
        </td>
        <td class="p-3 border-b border-slate-700/50 font-mono text-xs text-slate-400">
             ${cue.id ? `ID: ${cue.id}` : '-'}
        </td>
    </tr>
`;

export const ttmlAnalysisTemplate = (ttmlData) => {
    const hasErrors = ttmlData.errors && ttmlData.errors.length > 0;

    return html`
        <div class="space-y-6">
            
            ${
                hasErrors
                    ? html`
                          <div
                              class="bg-red-900/10 border border-red-500/30 rounded-lg p-4"
                          >
                              <h4 class="text-xs font-bold text-red-400 mb-2">
                                  Parsing Errors
                              </h4>
                              <ul class="list-disc pl-4 text-xs text-red-200">
                                  ${ttmlData.errors.map(
                                      (e) => html`<li>${e}</li>`
                                  )}
                              </ul>
                          </div>
                      `
                    : ''
            }

            <!-- Cues Section -->
            <div
                class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
            >
                <div class="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3
                        class="font-bold text-slate-200 flex items-center gap-2"
                    >
                        TTML Cues
                        <span class="text-slate-500 text-sm font-normal"
                            >(${ttmlData.cues.length})</span
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
                                <th class="p-3 w-1/2">Content</th>
                                <th class="p-3">Attributes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ttmlData.cues.map(cueRowTemplate)}
                        </tbody>
                    </table>
                    ${
                        ttmlData.cues.length === 0
                            ? html`<div
                                  class="p-8 text-center text-slate-500 italic"
                              >
                                  No cues found.
                              </div>`
                            : ''
                    }
                </div>
            </div>
        </div>
    `;
};