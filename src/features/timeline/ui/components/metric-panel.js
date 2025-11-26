import { html } from 'lit-html';
import * as icons from '@/ui/icons';
import { classMap } from 'lit-html/directives/class-map.js';

const statusColors = {
    success: 'text-emerald-400 border-emerald-500/30 bg-emerald-900/10',
    warning: 'text-amber-400 border-amber-500/30 bg-amber-900/10',
    error: 'text-red-400 border-red-500/30 bg-red-900/10',
    neutral: 'text-slate-300 border-slate-700 bg-slate-800/50',
    info: 'text-blue-400 border-blue-500/30 bg-blue-900/10',
};

const metricItem = (m) => {
    const styleClass = statusColors[m.status] || statusColors.neutral;

    return html`
        <div
            class="flex flex-col p-2.5 rounded-lg border transition-all hover:bg-slate-800 ${styleClass}"
            title="${m.tooltip || ''}"
        >
            <div class="flex justify-between items-start mb-1">
                <span
                    class="text-[10px] font-bold uppercase tracking-wider opacity-70"
                    >${m.name}</span
                >
                <span class="scale-75 opacity-60">${icons[m.icon]}</span>
            </div>
            <div class="font-mono text-sm font-bold truncate">
                ${m.value}
                <span class="text-[10px] opacity-60 font-sans ml-0.5"
                    >${m.unit}</span
                >
            </div>
        </div>
    `;
};

export const metricPanelTemplate = (groups) => {
    if (!groups || groups.length === 0) return html``;

    return html`
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${groups.map(
                (group) => html`
                    <div
                        class="bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-sm"
                    >
                        <h4
                            class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"
                        >
                            ${group.title}
                        </h4>
                        <div class="grid grid-cols-2 gap-2">
                            ${group.metrics.map(metricItem)}
                        </div>
                    </div>
                `
            )}
        </div>
    `;
};
