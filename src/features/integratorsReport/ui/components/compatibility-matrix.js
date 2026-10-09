import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';



const getStatusColor = (status) => {
    switch (status) {
        case 'supported':
            return 'bg-emerald-500 shadow-[0_0_10px_#10b981]/50';
        case 'config-required':
            return 'bg-amber-500 shadow-[0_0_10px_#f59e0b]/50';
        case 'partial':
            return 'bg-amber-500 shadow-[0_0_10px_#f59e0b]/50';
        case 'unsupported':
            return 'bg-red-500 shadow-[0_0_10px_#ef4444]/50';
        default:
            return 'bg-slate-800';
    }
};

const reqRow = (req) => {
    let icon = icons.checkCircle;
    let color = 'text-emerald-400';
    let glow = 'drop-shadow-[0_0_5px_#10b981]/30';

    if (req.ok === false) {
        icon = icons.xCircle;
        color = 'text-red-400';
        glow = 'drop-shadow-[0_0_5px_#ef4444]/30';
    } else if (req.ok === 'warn') {
        icon = icons.alertTriangle;
        color = 'text-amber-400';
        glow = 'drop-shadow-[0_0_5px_#f59e0b]/30';
    }

    return html`
        <div
            class="flex items-center justify-between text-xs py-2 border-b border-slate-700 last:border-0 group/req hover:bg-slate-900/50 px-2 rounded transition-colors"
        >
            <span
                class="text-slate-400 font-medium group-hover/req:text-slate-100 transition-colors"
                >${req.label}</span
            >
            <div class="flex items-center gap-2">
                <span
                    class="${color} text-[10px] text-right font-bold uppercase tracking-wider opacity-80"
                    >${req.msg}</span
                >
                <span class="${color} scale-90 ${glow}">${icon}</span>
            </div>
        </div>
    `;
};

const platformCard = (platform, isGlass) => {
    const statusColor = getStatusColor(platform.status);
    const isSupported =
        platform.status === 'supported' ||
        platform.status === 'config-required';
    const cardRadius = isGlass ? 'rounded-xl' : 'rounded-sm';

    return html`
        <div
            class="bg-slate-900/30 backdrop-blur-md ${cardRadius} border border-slate-700 overflow-hidden flex flex-col hover:border-slate-700 transition-all hover:-translate-y-1 hover:shadow-xl group"
        >
            <div
                class="p-4 flex items-center gap-3 bg-slate-900/50 border-b border-slate-700"
            >
                <div
                    class="w-2.5 h-2.5 rounded-full ${statusColor} animate-pulse-slow"
                ></div>
                <div
                    class="font-bold text-sm text-slate-100 group-hover:text-slate-100 transition-colors tracking-tight"
                >
                    ${platform.name}
                </div>
                <div
                    class="ml-auto text-[10px] text-slate-400 font-mono bg-slate-900/50 px-2 py-1 rounded border border-slate-700 shadow-inner"
                >
                    ${platform.engine}
                </div>
            </div>
            <div class="p-4 space-y-1 bg-slate-900/10 grow">
                ${platform.reqs.map(reqRow)}
            </div>
            ${!isSupported
            ? html`
                      <div
                          class="px-3 py-2 bg-red-500/10 border-t border-red-500/20 text-[10px] font-bold text-red-400 text-center uppercase tracking-widest"
                      >
                          Issues Detected
                      </div>
                  `
            : ''}
        </div>
    `;
};

export const compatibilityMatrixTemplate = (compatList, isGlass) => {
    const glassStyles = {
        borderRadius: '0.75rem',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
        background: '#1e293b',
    };

    const containerClass = isGlass
        ? "group h-full flex flex-col relative overflow-hidden"
        : "group h-full flex flex-col relative overflow-hidden bg-slate-800 border border-slate-800 rounded-sm";

    return html`
        <div
            class="${containerClass}"
            style=${styleMap(isGlass ? glassStyles : {})}
        >
            <!-- Top Accent -->
            <div
                class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 via-[#60a5fa]/50 to-blue-500/50 opacity-50"
            ></div>

            <div
                class="shrink-0 p-6 border-b border-slate-800 bg-slate-800/50"
            >
                <h3
                    class="font-black text-slate-400 text-xs flex items-center gap-2 uppercase tracking-[0.2em]"
                >
                    ${icons.users} Environment Check
                </h3>
            </div>
            <div
                class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar grow"
            >
                ${compatList.map((p) => platformCard(p, isGlass))}
            </div>
        </div>
    `;
};
