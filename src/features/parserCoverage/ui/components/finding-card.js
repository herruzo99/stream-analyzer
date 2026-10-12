/**
 * Finding card for parser-coverage findings.
 *
 * Reconstructed for the port (imported but never committed). Findings
 * carry `{ pathOrLine, status, type, name, details }` (see the coverage
 * analyzer); used as an array-map callback.
 */
import { html } from 'lit-html';

const STATUS_TONE = {
    unparsed: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    drift: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export const findingCardTemplate = (finding) => {
    if (!finding) return html``;
    const tone = STATUS_TONE[finding.status] || STATUS_TONE.unparsed;
    return html`
        <div
            class="rounded-md border border-white/10 bg-white/5 p-3 space-y-1.5"
        >
            <div class="flex items-center gap-2 flex-wrap">
                <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold r border ${tone}"
                    >${finding.status || 'unknown'}</span
                >
                <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold r bg-white/5 text-slate-300"
                    >${finding.type || 'item'}</span
                >
                <span class="font-mono text-xs font-bold text-slate-200"
                    >${finding.name || ''}</span
                >
            </div>
            ${finding.pathOrLine
                ? html`<div
                      class="font-mono text-[11px] text-slate-400 break-all"
                      title="Location in manifest"
                  >
                      ${finding.pathOrLine}
                  </div>`
                : ''}
            ${finding.details
                ? html`<p class="text-xs text-slate-300 leading-relaxed">
                      ${finding.details}
                  </p>`
                : ''}
        </div>
    `;
};
