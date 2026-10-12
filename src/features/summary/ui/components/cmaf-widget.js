import * as icons from '@/ui/icons';
import { html } from 'lit-html';

export const cmafWidgetTemplate = (cmafData, open, onToggle) => {
    if (!cmafData || cmafData.status === 'idle') return '';

    const statusMeta = {
        pending: { label: 'validating', cls: 'text-slate-400' },
        complete: { label: 'done', cls: 'text-emerald-300' },
        error: { label: 'failed', cls: 'text-red-300' },
    }[cmafData.status] || { label: cmafData.status, cls: 'text-slate-400' };

    const passedChecks = cmafData.results.filter(
        (r) => r.status === 'pass'
    ).length;
    const failedChecks = cmafData.results.filter(
        (r) => r.status === 'fail'
    ).length;
    const warnChecks = cmafData.results.filter(
        (r) => r.status === 'warn'
    ).length;
    const total = cmafData.results.length;

    const summaryLine =
        cmafData.status === 'pending'
            ? 'validating…'
            : total === 0
              ? 'no checks produced output'
              : `${passedChecks} pass · ${warnChecks} warn · ${failedChecks} fail`;

    return html`
        <div class="rounded-md border border-white/5 bg-[#0b111c] p-3">
            <button
                class="w-full flex items-center justify-between gap-2 text-left"
                @click=${onToggle}
                aria-expanded=${open}
            >
                <span class="text-sm font-medium text-slate-100"
                    >CMAF checks</span
                >
                <span
                    class="mono text-[10px] flex items-center gap-1.5 ${statusMeta.cls}"
                >
                    ${cmafData.status === 'pending'
                        ? html`<span class="animate-spin inline-flex"
                              >${icons.refresh}</span
                          >`
                        : ''}
                    ${statusMeta.label}
                </span>
            </button>
            <p class="mono text-[10px] text-slate-600 mt-1">${summaryLine}</p>

            ${open
                ? html`<div
                      class="mt-2 max-h-[160px] overflow-y-auto custom-scrollbar space-y-1"
                  >
                      ${total === 0 && cmafData.status !== 'pending'
                          ? ''
                          : cmafData.results.map(
                                (result) => html`
                                    <div
                                        class="flex items-start gap-2.5 px-2.5 py-2 rounded-md bg-white/[0.02] border border-white/5 text-[13px]"
                                    >
                                        <span class="mt-0.5 shrink-0">
                                            ${result.status === 'pass'
                                                ? html`<span
                                                      class="text-emerald-300"
                                                      >${icons.checkCircle}</span
                                                  >`
                                                : result.status === 'fail'
                                                  ? html`<span
                                                        class="text-red-300"
                                                        >${icons.xCircle}</span
                                                    >`
                                                  : html`<span
                                                        class="text-amber-300"
                                                        >${icons.alertTriangle}</span
                                                    >`}
                                        </span>
                                        <span class="min-w-0">
                                            <span
                                                class="block font-medium text-slate-200 truncate"
                                                title="${result.text}"
                                            >
                                                ${result.text}
                                            </span>
                                            ${result.details
                                                ? html`<span
                                                      class="block text-[11px] text-slate-500 mt-0.5 break-words"
                                                  >
                                                      ${result.details}
                                                  </span>`
                                                : ''}
                                        </span>
                                    </div>
                                `
                            )}
                  </div>`
                : ''}
        </div>
    `;
};
