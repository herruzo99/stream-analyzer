import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const renderCmcdRow = (item) => {
    // We calculate statusColor but it was previously unused.
    // Now we use it to color the key/label when there is an error.
    const statusColor = item.isValid ? 'text-blue-300' : 'text-red-400';
    const borderClass = item.isValid
        ? 'border-slate-800'
        : 'border-red-900/50 bg-red-900/10';

    return html`
        <div
            class="flex flex-col p-2 rounded border ${borderClass} mb-1 hover:bg-slate-800/50 transition-colors"
        >
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-xs ${statusColor}"
                        >${item.key}</span
                    >
                    <span
                        class="text-[10px] text-slate-500 uppercase tracking-wider"
                        >${item.label}</span
                    >
                </div>
                <span class="font-mono text-xs text-slate-200"
                    >${item.raw}</span
                >
            </div>
            ${!item.isValid
                ? html`
                      <div
                          class="text-[10px] text-red-400 mt-1 flex items-center gap-1"
                      >
                          ${icons.alertTriangle} ${item.error}
                      </div>
                  `
                : ''}
        </div>
    `;
};

export const cmcdPanelTemplate = (cmcdData) => {
    if (!cmcdData) return html``;

    const { values, sources } = cmcdData;
    const hasErrors = values.some((v) => !v.isValid);

    return html`
        <section class="mt-6">
            <div
                class="flex items-center justify-between mb-2 pb-2 border-b border-slate-800"
            >
                <h5
                    class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"
                >
                    ${icons.activity} CMCD Data
                    ${hasErrors
                        ? html`<span class="text-red-500 scale-75"
                              >${icons.alertTriangle}</span
                          >`
                        : ''}
                </h5>
                <div class="flex gap-1">
                    ${sources.map(
                        (s) => html`
                            <span
                                class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
                            >
                                ${s}
                            </span>
                        `
                    )}
                </div>
            </div>

            <div class="bg-slate-950/30 rounded-lg border border-slate-800 p-2">
                ${values.map(renderCmcdRow)}
            </div>

            <p class="text-[9px] text-slate-600 mt-2 text-right">
                ISO/IEC 23009-8 Common Media Client Data
            </p>
        </section>
    `;
};
