import {
    findChildren,
    getAttr,
} from '@/infrastructure/parsing/utils/recursive-parser.js';
import { html } from 'lit-html';

const kv = (k, v) => html`
    <div
        class="flex justify-between text-[10px] border-b border-slate-800 py-1 last:border-0"
    >
        <span class="text-slate-500 font-semibold">${k}</span>
        <span
            class="font-mono text-slate-300 truncate max-w-[120px]"
            title="${v}"
            >${v}</span
        >
    </div>
`;

const timelineTable = (el) => {
    const s = findChildren(el, 'S');
    if (!s.length)
        return html`<div class="text-[10px] text-slate-500 italic">
            Empty Timeline
        </div>`;

    return html`
        <div class="mt-2 overflow-hidden rounded border border-slate-700">
            <table class="w-full text-[10px] text-left">
                <thead class="bg-slate-800 text-slate-400 font-semibold">
                    <tr>
                        <th class="px-2 py-1">Start (t)</th>
                        <th class="px-2 py-1">Dur (d)</th>
                        <th class="px-2 py-1 text-right">Rpt (r)</th>
                    </tr>
                </thead>
                <tbody
                    class="bg-slate-900/50 divide-y divide-slate-800 font-mono"
                >
                    ${s.slice(0, 10).map(
                        (entry) => html`
                            <tr>
                                <td class="px-2 py-1 text-cyan-400">
                                    ${getAttr(entry, 't') || '-'}
                                </td>
                                <td class="px-2 py-1 text-emerald-400">
                                    ${getAttr(entry, 'd')}
                                </td>
                                <td class="px-2 py-1 text-right text-amber-400">
                                    ${getAttr(entry, 'r') || 0}
                                </td>
                            </tr>
                        `
                    )}
                    ${s.length > 10
                        ? html`
                              <tr>
                                  <td
                                      colspan="3"
                                      class="px-2 py-1 text-center text-slate-500 italic"
                                  >
                                      ... ${s.length - 10} more entries
                                  </td>
                              </tr>
                          `
                        : ''}
                </tbody>
            </table>
        </div>
    `;
};

export const timingInfoTemplate = (data, stream) => {
    const { element } = data;
    if (!element) return html``;

    const commonProps = html`
        ${kv('Timescale', getAttr(element, 'timescale'))}
        ${kv(
            'Presentation Time Offset',
            getAttr(element, 'presentationTimeOffset')
        )}
        ${kv('Start Number', getAttr(element, 'startNumber'))}
    `;

    const timelineEl = findChildren(element, 'SegmentTimeline')[0];

    return html`
        <div class="grid grid-cols-1 gap-3">
            <div>
                <h4 class="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Attributes
                </h4>
                <div class="bg-slate-800/50 rounded p-2">
                    ${commonProps}
                    ${getAttr(element, 'media')
                        ? html`
                              <div class="mt-1 pt-1 border-t border-slate-700">
                                  <span
                                      class="text-[10px] text-slate-500 block mb-0.5"
                                      >Template</span
                                  >
                                  <code
                                      class="text-[9px] text-blue-300 break-all bg-slate-900 px-1 py-0.5 rounded block"
                                      >${getAttr(element, 'media')}</code
                                  >
                              </div>
                          `
                        : ''}
                </div>
            </div>
            ${timelineEl
                ? html`
                      <div>
                          <h4
                              class="text-[10px] font-bold text-slate-400 uppercase mb-1"
                          >
                              Timeline
                          </h4>
                          ${timelineTable(timelineEl)}
                      </div>
                  `
                : ''}
        </div>
    `;
};
