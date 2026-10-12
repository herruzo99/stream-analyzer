import { uiActions } from '@/state/uiStore';
import { html } from 'lit-html';
import { calculateComplianceScore } from '../../../compliance/domain/compliance-scoring.js';

export const complianceWidgetTemplate = (stream) => {
    const updates = stream.manifestUpdates || [];
    const latest = updates[0];
    const results = latest?.complianceResults || [];
    const hasRun = results.length > 0;

    const { totalScore, label, summary } = calculateComplianceScore(results);
    const { errors, warnings } = summary;
    // Empty results score 100/PASS by construction — render the ring as
    // empty/grey so "not run" never looks like a perfect score.

    const scoreClass =
        label === 'FAIL'
            ? 'text-red-300'
            : label === 'WARNING'
              ? 'text-amber-300'
              : 'text-emerald-300';

    return html`
        <button
            @click=${() => uiActions.setActiveTab('compliance')}
            class="w-full h-full p-4 rounded-md border border-white/5 bg-[#0b111c] hover:border-white/15 transition-colors flex items-center gap-4 text-left"
            aria-label="Open full compliance report"
        >
            <span class="relative w-20 h-20 shrink-0" aria-hidden="true">
                <svg class="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle
                        cx="40"
                        cy="40"
                        r="34"
                        stroke-width="6"
                        fill="transparent"
                        class="stroke-white/5"
                    />
                    <circle
                        cx="40"
                        cy="40"
                        r="34"
                        stroke-width="6"
                        fill="transparent"
                        stroke-dasharray="${2 * Math.PI * 34}"
                        stroke-dashoffset="${hasRun ? 2 * Math.PI * 34 - (totalScore / 100) * (2 * Math.PI * 34) : 2 * Math.PI * 34}"
                        stroke-linecap="round"
                        class="stroke-current ${hasRun ? scoreClass : 'text-slate-700'}"
                    />
                </svg>
                <span
                    class="absolute inset-0 flex flex-col items-center justify-center"
                >
                    <span
                        class="text-xl tabular-nums ${hasRun ? scoreClass : 'text-slate-500'}"
                        >${hasRun ? totalScore : '–'}</span
                    >
                    <span class="mono text-[9px] text-slate-600">score</span>
                </span>
            </span>

            <span class="min-w-0 grow">
                <span class="flex items-center justify-between gap-2 mb-1.5">
                    <span class="text-sm font-medium text-slate-100"
                        >Compliance</span
                    >
                    <span
                        class="mono text-[10px] px-1.5 py-px rounded border ${hasRun ? (label === 'FAIL' ? 'text-red-300 bg-red-500/10 border-red-400/25' : label === 'WARNING' ? 'text-amber-300 bg-amber-500/10 border-amber-400/25' : 'text-emerald-200 bg-emerald-500/10 border-emerald-400/25') : 'text-slate-500 bg-white/5 border-white/10'}"
                        >${hasRun ? label.toLowerCase() : 'not run'}</span
                    >
                </span>
                <span class="mono block text-[10px] text-slate-500">
                    ${hasRun
                        ? `${errors} error${errors === 1 ? '' : 's'} · ${warnings} warning${warnings === 1 ? '' : 's'}`
                        : 'no checks ran for this stream'}
                </span>
                <span
                    class="mono block text-[10px] text-emerald-300/90 mt-1.5"
                    >open report →</span
                >
            </span>
        </button>
    `;
};
