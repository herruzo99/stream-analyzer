import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const getStatusColor = (status) => {
    switch (status) {
        case 'supported':
            return 'border-green-500/50 bg-green-500/10 text-green-400';
        case 'config-required':
            return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
        case 'partial':
            return 'border-orange-500/50 bg-orange-500/10 text-orange-400';
        case 'unsupported':
            return 'border-red-500/50 bg-red-500/10 text-red-400';
        default:
            return 'border-slate-700 bg-slate-800 text-slate-400';
    }
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'supported':
            return 'Ready to Play';
        case 'config-required':
            return 'Config Required';
        case 'partial':
            return 'Partial Support';
        case 'unsupported':
            return 'Unsupported';
        default:
            return 'Unknown';
    }
};

const getBrowserIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('chrome')) return icons.monitor;
    if (n.includes('safari')) return icons.target;
    if (n.includes('android')) return icons.play;
    if (n.includes('tv')) return icons.display;
    return icons.monitor;
};

const requirementPill = (req) => {
    let icon = icons.checkCircle;
    let color = 'text-green-400 bg-green-400/10 border-green-400/20';

    if (req.ok === false) {
        icon = icons.xCircle;
        color = 'text-red-400 bg-red-400/10 border-red-400/20';
    } else if (req.ok === 'warn') {
        icon = icons.alertTriangle;
        color = 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    }

    return html`
        <div
            class="flex items-center justify-between p-2 rounded border ${color} mb-1"
        >
            <div class="flex items-center gap-2">
                <span
                    class="text-xs font-bold uppercase tracking-wider opacity-80"
                    >${req.label}</span
                >
            </div>
            <div class="flex items-center gap-1 text-xs font-medium">
                <span>${req.msg}</span>
                <span class="shrink-0">${icon}</span>
            </div>
        </div>
    `;
};

const platformCard = (platform) => {
    const statusClass = getStatusColor(platform.status);
    const icon = getBrowserIcon(platform.name);

    return html`
        <div
            class="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col"
        >
            <div
                class="p-3 flex items-center justify-between border-b border-slate-700/50 bg-slate-800/30"
            >
                <div class="flex items-center gap-2 text-slate-200 font-bold">
                    ${icon}
                    <span>${platform.name}</span>
                    <span
                        class="text-xs font-normal text-slate-500 font-mono ml-1"
                        >(${platform.engine})</span
                    >
                </div>
                <span
                    class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusClass}"
                >
                    ${getStatusLabel(platform.status)}
                </span>
            </div>
            <div class="p-3 grow flex flex-col gap-1">
                ${platform.reqs.map(requirementPill)}
            </div>
        </div>
    `;
};

export const compatibilityMatrixTemplate = (compatList) => {
    return html`
        <div
            class="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full shadow-sm"
        >
            <div class="p-4 border-b border-slate-700 bg-slate-900/50">
                <h3 class="font-bold text-slate-200 flex items-center gap-2">
                    ${icons.users} Target Environments
                </h3>
                <p class="text-xs text-slate-400 mt-1">
                    Compatibility analysis based on stream format, codecs, and
                    DRM.
                </p>
            </div>

            <div
                class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto"
            >
                ${compatList.map(platformCard)}
            </div>
        </div>
    `;
};
