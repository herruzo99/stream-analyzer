import * as icons from '@/ui/icons';
import { html } from 'lit-html';

export const cmafWidgetTemplate = (cmafData) => {
    if (!cmafData || cmafData.status === 'idle') return '';

    const statusColors = {
        pending: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        complete: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        error: 'text-red-400 border-red-500/30 bg-red-500/10',
    };

    const statusIcons = {
        pending: icons.refresh,
        complete: icons.checkCircle,
        error: icons.alertTriangle,
    };

    const statusLabel = {
        pending: 'Validating...',
        complete: 'Analysis Complete',
        error: 'Validation Failed',
    };

    const statusClass = statusColors[cmafData.status] || statusColors.pending;
    const Icon = statusIcons[cmafData.status] || icons.info;

    // Calculate pass/fail counts
    const passedChecks = cmafData.results.filter(
        (r) => r.status === 'pass'
    ).length;
    const failedChecks = cmafData.results.filter(
        (r) => r.status === 'fail'
    ).length;
    const warnChecks = cmafData.results.filter(
        (r) => r.status === 'warn'
    ).length;

    return html`
        <div
            class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 shadow-sm hover:border-slate-600 transition-colors h-full flex flex-col"
        >
            <div class="flex items-center justify-between mb-4">
                <h3
                    class="text-lg font-bold text-white flex items-center gap-2"
                >
                    ${icons.shieldCheck} CMAF Compliance
                </h3>
                <div
                    class="flex items-center gap-2 px-2 py-1 rounded text-xs font-bold border ${statusClass}"
                >
                    ${cmafData.status === 'pending'
                        ? html`<span class="animate-spin">${Icon}</span>`
                        : Icon}
                    ${statusLabel[cmafData.status]}
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2 mb-4">
                <div
                    class="bg-slate-900/50 rounded p-2 text-center border border-slate-800"
                >
                    <div class="text-emerald-400 font-bold text-lg">
                        ${passedChecks}
                    </div>
                    <div class="text-[10px] text-slate-500 uppercase font-bold">
                        Pass
                    </div>
                </div>
                <div
                    class="bg-slate-900/50 rounded p-2 text-center border border-slate-800"
                >
                    <div class="text-yellow-400 font-bold text-lg">
                        ${warnChecks}
                    </div>
                    <div class="text-[10px] text-slate-500 uppercase font-bold">
                        Warn
                    </div>
                </div>
                <div
                    class="bg-slate-900/50 rounded p-2 text-center border border-slate-800"
                >
                    <div class="text-red-400 font-bold text-lg">
                        ${failedChecks}
                    </div>
                    <div class="text-[10px] text-slate-500 uppercase font-bold">
                        Fail
                    </div>
                </div>
            </div>

            <div
                class="grow overflow-y-auto custom-scrollbar space-y-2 pr-1 max-h-[200px]"
            >
                ${cmafData.results.length === 0 && cmafData.status !== 'pending'
                    ? html`<div
                          class="text-center text-slate-500 text-sm py-4 italic"
                      >
                          No checks run.
                      </div>`
                    : ''}
                ${cmafData.results.map(
                    (result) => html`
                        <div
                            class="flex items-start gap-3 p-2 rounded bg-slate-900/30 border border-slate-800/50 text-sm"
                        >
                            <div class="mt-0.5 shrink-0">
                                ${result.status === 'pass'
                                    ? html`<span class="text-emerald-500"
                                          >${icons.checkCircle}</span
                                      >`
                                    : result.status === 'fail'
                                      ? html`<span class="text-red-500"
                                            >${icons.xCircle}</span
                                        >`
                                      : html`<span class="text-yellow-500"
                                            >${icons.alertTriangle}</span
                                        >`}
                            </div>
                            <div class="min-w-0">
                                <div
                                    class="font-medium text-slate-300 truncate"
                                    title="${result.text}"
                                >
                                    ${result.text}
                                </div>
                                ${result.details
                                    ? html`<div
                                          class="text-xs text-slate-500 mt-0.5 break-words"
                                      >
                                          ${result.details}
                                      </div>`
                                    : ''}
                            </div>
                        </div>
                    `
                )}
            </div>
        </div>
    `;
};
