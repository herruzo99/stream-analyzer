import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const statItem = (stat) => html`
    <div
        class="p-4 flex items-center gap-4 rounded-md border border-white/5 bg-[#0b111c]"
    >
        <span class="shrink-0 text-slate-500">${icons[stat.icon]}</span>
        <span class="min-w-0">
            <span class="mono block text-[10px] text-slate-600"
                >${String(stat.label).toLowerCase()}</span
            >
            <span
                class="block text-xl text-slate-100 tabular-nums leading-tight truncate"
                >${stat.value}</span
            >
        </span>
    </div>
`;

export const quickStatsTemplate = (vm) => html`
    <div class="grid grid-cols-2 lg:grid-cols-4 w-full gap-2">
        ${vm.stats.map(statItem)}
    </div>
`;
