import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const statItem = (stat) => html`
    <div
        class="group relative overflow-hidden p-5 flex items-center gap-5 hover:border-blue-500/30 hover:shadow-[0_0_20px_-5px_#3b82f6] transition-all duration-300 hover:-translate-y-1"
        style="border-radius: 0.75rem; box-shadow: 0 8px 30px rgb(0 0 0 / 0.35); backdrop-filter: blur(12px); background: #1e293b; border: 1px solid #1e293b;"
    >
        <div
            class="absolute inset-0 bg-gradient-to-br from-slate-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        ></div>

        <div
            class="relative z-10 w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-800 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors shadow-inner"
        >
            ${icons[stat.icon]}
        </div>
        <div class="relative z-10">
            <p
                class="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1 group-hover:text-slate-100 transition-colors"
            >
                ${stat.label}
            </p>
            <p
                class="text-2xl text-slate-100 font-black tracking-tight group-hover:scale-105 transition-transform origin-left"
            >
                ${stat.value}
            </p>
        </div>
    </div>
`;

export const quickStatsTemplate = (vm) => html`
    <div class="grid grid-cols-2 lg:grid-cols-4 w-full" style="gap: 0.75rem">
        ${vm.stats.map(statItem)}
    </div>
`;
