/**
 * Coverage stats section for parser coverage.
 *
 * Reconstructed for the port (imported but never committed). Contract,
 * derived from the index call site:
 *   statsSectionTemplate(coveragePercentage, unparsedFindings, driftFindings)
 */
import { html } from 'lit-html';

const stat = (label, value, tone) => html`
    <div
        class="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-center"
    >
        <div class="font-mono font-bold text-lg ${tone}">${value}</div>
        <div
            class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1"
        >
            ${label}
        </div>
    </div>
`;

export const statsSectionTemplate = (
    coveragePercentage,
    unparsedFindings = [],
    driftFindings = []
) => {
    const pct =
        typeof coveragePercentage === 'number' && Number.isFinite(coveragePercentage)
            ? coveragePercentage
            : 100;
    return html`
        <div>
            <div
                class="flex items-center gap-3 mb-3 p-3 rounded-xl border border-slate-800 bg-slate-800/40"
            >
                <div
                    class="grow h-2 rounded-full bg-slate-800 overflow-hidden"
                >
                    <div
                        class="h-full rounded-full ${pct >= 99
                            ? 'bg-emerald-500'
                            : pct >= 90
                              ? 'bg-amber-500'
                              : 'bg-red-500'}"
                        style="width: ${Math.max(0, Math.min(100, pct))}%"
                    ></div>
                </div>
                <span class="font-mono font-bold text-sm text-slate-100"
                    >${pct.toFixed(1)}%</span
                >
            </div>
            <div class="grid grid-cols-2 gap-2">
                ${stat('Unparsed', String(unparsedFindings.length), 'text-amber-300')}
                ${stat('Drift', String(driftFindings.length), 'text-red-400')}
            </div>
        </div>
    `;
};
