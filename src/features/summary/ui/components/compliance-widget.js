import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { calculateComplianceScore } from '../../../compliance/domain/compliance-scoring.js';

export const complianceWidgetTemplate = (stream) => {
    const updates = stream.manifestUpdates || [];
    const latest = updates[0];
    const results = latest?.complianceResults || [];

    const { totalScore, label, summary } = calculateComplianceScore(results);
    const { errors, warnings } = summary;

    let scoreColor = 'text-green-400';
    let ringColorClass = 'text-green-500';
    let labelColor = 'text-green-300';

    // Strict Color Mapping
    if (label === 'FAIL') {
        scoreColor = 'text-red-400';
        ringColorClass = 'text-red-500';
        labelColor = 'text-red-300';
    } else if (label === 'WARNING') {
        scoreColor = 'text-yellow-400';
        ringColorClass = 'text-yellow-500';
        labelColor = 'text-yellow-300';
    }

    return html`
        <div
            class="bg-slate-800/80 rounded-xl border border-slate-700 p-4 h-full flex flex-row items-center gap-4 relative overflow-hidden group cursor-pointer"
            @click=${() => uiActions.setActiveTab('compliance')}
        >
            <div
                class="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/50 pointer-events-none"
            ></div>

            <!-- Chart Section (Left) -->
            <div class="relative z-10 shrink-0">
                <div
                    class="relative w-20 h-20 bg-slate-900 rounded-full shadow-lg"
                >
                    <svg class="w-full h-full transform -rotate-90">
                        <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            stroke-width="5"
                            fill="transparent"
                            class="text-slate-800"
                        />
                        <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            stroke-width="5"
                            fill="transparent"
                            stroke-dasharray="${2 * Math.PI * 36}"
                            stroke-dashoffset="${2 * Math.PI * 36 -
                            (totalScore / 100) * (2 * Math.PI * 36)}"
                            stroke-linecap="round"
                            class="${ringColorClass} transition-all duration-1000 ease-out"
                        />
                    </svg>

                    <div
                        class="absolute inset-0 flex flex-col items-center justify-center"
                    >
                        <span class="text-xl font-bold ${scoreColor}"
                            >${totalScore}</span
                        >
                    </div>
                </div>
            </div>

            <!-- Info Section (Right) -->
            <div class="relative z-10 flex flex-col grow min-w-0">
                <div class="flex items-center justify-between mb-1">
                    <h3 class="text-base font-bold text-white">Compliance</h3>
                    <span
                        class="text-[10px] font-bold uppercase tracking-widest ${labelColor}"
                        >${label}</span
                    >
                </div>

                <div
                    class="flex gap-3 text-xs text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700/50 w-fit"
                >
                    <span
                        class="flex items-center gap-1 font-medium ${errors > 0
                            ? 'text-red-400'
                            : ''}"
                    >
                        ${icons.xCircle} ${errors}
                    </span>
                    <div class="w-px h-3 bg-slate-700"></div>
                    <span
                        class="flex items-center gap-1 font-medium ${warnings >
                        0
                            ? 'text-yellow-400'
                            : ''}"
                    >
                        ${icons.alertTriangle} ${warnings}
                    </span>
                </div>

                <div
                    class="mt-2 text-blue-400 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 transform translate-x-[-10px] group-hover:translate-x-0 duration-200"
                >
                    View Report ${icons.arrowRight}
                </div>
            </div>
        </div>
    `;
};
