import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

const cueRowTemplate = (cue, index) => html`
    <tr class="hover:bg-gray-700/50">
        <td class="p-2 border-t border-gray-700 font-mono text-gray-400">
            ${index + 1}
        </td>
        <td class="p-2 border-t border-gray-700 font-mono text-white">
            ${cue.id || 'N/A'}
        </td>
        <td class="p-2 border-t border-gray-700 font-mono text-cyan-400">
            ${cue.startTime?.toFixed(3)}s &rarr; ${cue.endTime?.toFixed(3)}s
        </td>
        <td class="p-2 border-t border-gray-700 font-mono text-yellow-300">
            ${Object.entries(cue.settings)
                .map(([key, value]) => `${key}:${value}`)
                .join(' ')}
        </td>
        <td class="p-2 border-t border-gray-700 text-gray-200">
            ${unsafeHTML(cue.payload.join('<br>'))}
        </td>
    </tr>
`;

export const vttAnalysisTemplate = (vttData) => {
    return html`
        <div class="space-y-6 text-xs">
            ${vttData.errors.length > 0
                ? html`
                      <div
                          class="bg-red-900/50 p-3 rounded-lg border border-red-700"
                      >
                          <h4 class="font-bold text-red-300 mb-2">
                              Parsing Errors
                          </h4>
                          <ul class="list-disc pl-5 text-red-200">
                              ${vttData.errors.map(
                                  (err) => html`<li>${err}</li>`
                              )}
                          </ul>
                      </div>
                  `
                : ''}
            ${vttData.styles.length > 0
                ? html`
                      <div>
                          <h4 class="font-semibold text-gray-300 mb-2">
                              Embedded Styles
                          </h4>
                          <pre
                              class="bg-gray-900/50 p-3 rounded-md border border-gray-700 text-cyan-400 overflow-x-auto"
                          ><code>${vttData.styles.join('\n\n')}</code></pre>
                      </div>
                  `
                : ''}

            <div>
                <h4 class="font-semibold text-gray-300 mb-2">Cues</h4>
                <div
                    class="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden"
                >
                    <table class="w-full text-left table-auto">
                        <thead class="bg-gray-800/50">
                            <tr>
                                <th class="p-2 font-semibold text-gray-400">
                                    #
                                </th>
                                <th class="p-2 font-semibold text-gray-400">
                                    ID
                                </th>
                                <th class="p-2 font-semibold text-gray-400">
                                    Timings
                                </th>
                                <th class="p-2 font-semibold text-gray-400">
                                    Settings
                                </th>
                                <th class="p-2 font-semibold text-gray-400">
                                    Payload
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vttData.cues.map(cueRowTemplate)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
};
