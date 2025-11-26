import { html } from 'lit-html';
import * as icons from '@/ui/icons';

const statItem = (stat) => html`
    <div
        class="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 flex items-center gap-4 hover:bg-slate-800 transition-colors"
    >
        <div
            class="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-700"
        >
            ${icons[stat.icon]}
        </div>
        <div>
            <p
                class="text-slate-400 text-xs uppercase tracking-wider font-bold"
            >
                ${stat.label}
            </p>
            <p class="text-xl text-white font-mono font-semibold">
                ${stat.value}
            </p>
        </div>
    </div>
`;

export const quickStatsTemplate = (vm) => html`
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${vm.stats.map(statItem)}
    </div>
`;
