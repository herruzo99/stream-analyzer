import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';
import { calculateComplianceScore } from '../../../compliance/domain/compliance-scoring.js';

export const complianceWidgetTemplate = (stream) => {
    const updates = stream.manifestUpdates || [];
    const latest = updates[0];
    const results = latest?.complianceResults || [];

    const { totalScore, label, summary } = calculateComplianceScore(results);
    const { errors, warnings } = summary;

    let scoreColor = 'text-emerald-400';
    let ringColorClass = 'text-emerald-400';
    let labelColor = 'text-emerald-400';

    // Strict Color Mapping
    if (label === 'FAIL') {
        scoreColor = 'text-red-400';
        ringColorClass = 'text-red-400';
        labelColor = 'text-red-400';
    } else if (label === 'WARNING') {
        scoreColor = 'text-amber-400';
        ringColorClass = 'text-amber-400';
        labelColor = 'text-amber-400';
    }

    const layoutCardStyles = {
        borderRadius: '0.75rem',
        boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #1e293b',
    };

    return html`
        <div
            class="relative overflow-hidden p-6 h-full flex flex-row items-center gap-6 group cursor-pointer transition-all duration-300 hover:bg-slate-800"
            style=${styleMap({ ...layoutCardStyles, background: '#1e293b' })}
            @click=${() => uiActions.setActiveTab('compliance')}
        >
             <!-- Decorative subtle gradient bg -->
            <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <!-- Chart Section (Left) -->
            <div class="relative z-10 shrink-0">
                <div
                    class="relative w-24 h-24 bg-slate-800 rounded-full shadow-lg border border-slate-800 flex items-center justify-center p-1"
                >
                    <!-- Ring Container -->
                    <svg class="w-full h-full transform -rotate-90">
                        <circle
                            cx="50%"
                            cy="50%"
                            r="40%"
                            stroke="currentColor"
                            stroke-width="6"
                            fill="transparent"
                            class="text-[#0f172a] opacity-30"
                        />
                        <circle
                            cx="50%"
                            cy="50%"
                            r="40%"
                            stroke="currentColor"
                            stroke-width="6"
                            fill="transparent"
                            stroke-dasharray="${2 * Math.PI * 35}"
                            stroke-dashoffset="${2 * Math.PI * 35 - (totalScore / 100) * (2 * Math.PI * 35)}"
                            stroke-linecap="round"
                            class="${ringColorClass} transition-all duration-1000 ease-out drop-shadow-[0_0_8px_currentColor]"
                        />
                    </svg>

                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-2xl font-black ${scoreColor} drop-shadow-sm leading-none">${totalScore}</span>
                        <span class="text-[8px] font-bold uppercase tracking-wider opacity-60 mt-0.5" style="color: #94a3b8">Score</span>
                    </div>
                </div>
            </div>

            <!-- Info Section (Right) -->
            <div class="relative z-10 flex flex-col grow min-w-0 justify-center">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-lg font-bold text-slate-100 tracking-tight">
                        Compliance
                    </h3>
                    <span
                        class="text-[9px] font-black uppercase tracking-widest ${labelColor} bg-slate-900/50 px-2 py-1 rounded border border-current/20 backdrop-blur-md"
                    >
                        ${label}
                    </span>
                </div>

                <div class="flex items-center gap-3 text-xs mb-3">
                     <span class="flex items-center gap-1.5 font-bold text-slate-400 ${errors > 0 ? 'text-red-400' : ''}">
                        ${icons.xCircle} ${errors} Errors
                    </span>
                    <span class="w-px h-3 bg-slate-800 opacity-50"></span>
                    <span class="flex items-center gap-1.5 font-bold text-slate-400 ${warnings > 0 ? 'text-amber-400' : ''}">
                        ${icons.alertTriangle} ${warnings} Warnings
                    </span>
                </div>

                <div class="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400">View Full Report</span>
                    <span class="text-blue-400 text-xs">${icons.arrowRight}</span>
                </div>
            </div>
        </div>
    `;
};
