import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const getStatusColor = (status) => {
    switch (status) {
        case 'supported':
            return 'bg-emerald-500';
        case 'config-required':
            return 'bg-yellow-500';
        case 'partial':
            return 'bg-orange-500';
        case 'unsupported':
            return 'bg-red-500';
        default:
            return 'bg-slate-600';
    }
};

const reqRow = (req) => {
    let icon = icons.checkCircle;
    let color = 'text-emerald-400';

    if (req.ok === false) {
        icon = icons.xCircle;
        color = 'text-red-400';
    } else if (req.ok === 'warn') {
        icon = icons.alertTriangle;
        color = 'text-yellow-400';
    }

    return html`
        <div
            class="flex items-center justify-between text-xs py-1 border-b border-slate-700/30 last:border-0"
        >
            <span class="text-slate-400">${req.label}</span>
            <div class="flex items-center gap-1.5">
                <span class="${color} text-[10px] text-right">${req.msg}</span>
                <span class="${color} scale-75">${icon}</span>
            </div>
        </div>
    `;
};

const platformCard = (platform) => {
    const statusColor = getStatusColor(platform.status);
    const isSupported =
        platform.status === 'supported' ||
        platform.status === 'config-required';

    return html`
        <div
            class="bg-slate-800/40 rounded-lg border border-slate-700/50 overflow-hidden flex flex-col hover:border-slate-600 transition-colors"
        >
            <div
                class="p-3 flex items-center gap-3 bg-slate-800/80 border-b border-slate-700/50"
            >
                <div
                    class="w-2 h-2 rounded-full ${statusColor} shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                ></div>
                <div class="font-bold text-sm text-slate-200">
                    ${platform.name}
                </div>
                <div
                    class="ml-auto text-[10px] text-slate-500 font-mono bg-black/20 px-1.5 rounded"
                >
                    ${platform.engine}
                </div>
            </div>
            <div class="p-3 space-y-1 bg-slate-900/20 grow">
                ${platform.reqs.map(reqRow)}
            </div>
            ${!isSupported
                ? html`
                      <div
                          class="px-3 py-1.5 bg-red-900/10 border-t border-red-500/10 text-[10px] text-red-300 text-center"
                      >
                          Issues Detected
                      </div>
                  `
                : ''}
        </div>
    `;
};

export const compatibilityMatrixTemplate = (compatList) => {
    return html`
        <div
            class="bg-slate-900 rounded-xl border border-slate-800 shadow-lg h-full flex flex-col"
        >
            <div class="p-4 border-b border-slate-800 bg-slate-950/50">
                <h3
                    class="font-bold text-white text-sm flex items-center gap-2 uppercase tracking-wider"
                >
                    ${icons.users} Environment Check
                </h3>
            </div>
            <div
                class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar"
            >
                ${compatList.map(platformCard)}
            </div>
        </div>
    `;
};
