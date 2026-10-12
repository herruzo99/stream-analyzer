import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const statusDot = (status) => {
    switch (status) {
        case 'supported':
            return 'bg-emerald-400';
        case 'partial':
            return 'bg-amber-400';
        case 'unsupported':
            return 'bg-red-400';
        default:
            return 'bg-slate-700';
    }
};

const reqRow = (req) => {
    const ok = req.ok === true;
    const warn = req.ok === 'warn';
    const icon = ok ? icons.checkCircle : warn ? icons.alertTriangle : icons.xCircle;
    const color = ok ? 'text-emerald-300' : warn ? 'text-amber-300' : 'text-red-300';

    return html`
        <div class="flex items-center justify-between gap-3 py-2 px-2 border-b border-white/5 last:border-0">
            <span class="text-[13px] text-slate-400">${req.label}</span>
            <span class="flex items-center gap-2 min-w-0">
                <span
                    class="mono text-[10px] text-slate-500 text-right truncate"
                    title="${req.msg}"
                    >${req.msg}</span
                >
                <span class="${color} shrink-0">${icon}</span>
            </span>
        </div>
    `;
};

const platformCard = (platform) => {
    const reqs = Array.isArray(platform.reqs) ? platform.reqs : [];
    const failing = reqs.filter((r) => r.ok !== true).length;
    return html`
        <div class="rounded-md border border-white/5 bg-[#06090f] overflow-hidden flex flex-col">
            <div class="px-4 py-3 flex items-center gap-2.5 border-b border-white/5">
                <span class="w-2 h-2 rounded-full ${statusDot(platform.status)} shrink-0"></span>
                <span class="text-[13px] font-medium text-slate-100 truncate">${platform.name}</span>
                <span class="ml-auto mono text-[10px] text-slate-600 shrink-0">${platform.engine}</span>
            </div>
            <div class="p-2 grow">
                ${reqs.length === 0
                    ? html`<p class="mono text-[11px] text-slate-600 p-3 text-center">no checks recorded</p>`
                    : reqs.map(reqRow)}
            </div>
            ${failing > 0
                ? html`
                      <div class="px-3 py-1.5 border-t border-red-400/20 mono text-[10px] text-red-300 text-center">
                          ${failing} issue${failing === 1 ? '' : 's'} detected
                      </div>
                  `
                : ''}
        </div>
    `;
};

export const compatibilityMatrixTemplate = (compatList) => {
    const list = Array.isArray(compatList) ? compatList : [];
    const blocked = list.filter((p) => p.status === 'unsupported').length;

    return html`
        <div class="h-full flex flex-col rounded-md border border-white/5 bg-[#0b111c] overflow-hidden">
            <div class="shrink-0 px-4 py-3 border-b border-white/5 flex items-center gap-3">
                <p class="mono text-[10px] text-slate-500">environment check</p>
                <span class="grow"></span>
                <p class="mono text-[10px] text-slate-600">
                    ${list.length - blocked}/${list.length} ready
                </p>
            </div>
            <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto custom-scrollbar grow">
                ${list.map((p) => platformCard(p))}
            </div>
        </div>
    `;
};
