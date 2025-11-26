import { html } from 'lit-html';
import { uiActions } from '@/state/uiStore';
import { calculateComplianceScore } from '../../../compliance/domain/compliance-scoring.js';
import * as icons from '@/ui/icons';

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

    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (totalScore / 100) * circumference;

    return html`
        <div
            class="bg-slate-800/80 rounded-xl border border-slate-700 p-5 h-full flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
            @click=${() => uiActions.setActiveTab('compliance')}
        >
            <div
                class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50 pointer-events-none"
            ></div>

            <div class="relative z-10 flex flex-col items-center">
                <div
                    class="relative w-28 h-28 mb-3 bg-slate-900 rounded-full shadow-lg"
                >
                    <svg class="w-full h-full transform -rotate-90">
                        <circle
                            cx="56"
                            cy="56"
                            r="${radius}"
                            stroke="currentColor"
                            stroke-width="6"
                            fill="transparent"
                            class="text-slate-800"
                        />
                        <circle
                            cx="56"
                            cy="56"
                            r="${radius}"
                            stroke="currentColor"
                            stroke-width="6"
                            fill="transparent"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${offset}"
                            stroke-linecap="round"
                            class="${ringColorClass} transition-all duration-1000 ease-out"
                        />
                    </svg>

                    <div
                        class="absolute inset-0 flex flex-col items-center justify-center"
                    >
                        <span class="text-3xl font-bold ${scoreColor}"
                            >${totalScore}</span
                        >
                    </div>
                </div>

                <h3 class="text-lg font-bold text-white mb-1">Compliance</h3>
                <span
                    class="text-xs font-bold uppercase tracking-widest ${labelColor} mb-3"
                    >${label}</span
                >

                <div
                    class="flex gap-4 text-xs text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-700/50"
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
                    class="mt-4 text-blue-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 transform translate-y-2 group-hover:translate-y-0 duration-200"
                >
                    View Full Report ${icons.arrowRight}
                </div>
            </div>
        </div>
    `;
};
