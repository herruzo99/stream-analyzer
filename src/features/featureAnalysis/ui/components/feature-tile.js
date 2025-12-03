import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

/**
 * Safely encodes a UTF-8 string to Base64.
 */
const safeBtoa = (str) => {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        )
    );
};

export const featureTileTemplate = (feature) => {
    const isUsed = feature.used;
    const complexityColor =
        feature.complexityScore >= 4
            ? 'bg-pink-500'
            : feature.complexityScore >= 3
              ? 'bg-blue-500'
              : 'bg-slate-600';

    // Base container style
    const containerClass = `
        relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 h-full
        ${
            isUsed
                ? 'bg-slate-800/80 border-blue-500/30 shadow-lg shadow-blue-900/5 hover:border-blue-400/50 hover:shadow-blue-900/20'
                : 'bg-slate-900/40 border-slate-800 opacity-50 hover:opacity-100 hover:bg-slate-800 hover:border-slate-700'
        }
        ${tooltipTriggerClasses}
    `;

    // Construct Rich Tooltip HTML
    const tooltipContent = `
        <div class="text-left min-w-[260px]">
            <div class="font-bold text-white text-sm mb-2 border-b border-slate-600 pb-2 flex items-center gap-2">
                ${feature.name}
                ${isUsed ? '<span class="text-emerald-400 text-[10px] border border-emerald-500/30 bg-emerald-900/20 px-1.5 rounded uppercase tracking-wider">Detected</span>' : ''}
            </div>
            <div class="text-xs text-slate-300 leading-relaxed mb-3">
                ${feature.desc}
            </div>
            ${
                isUsed
                    ? `
                <div class="bg-slate-950/50 p-2 rounded border border-slate-700/50 mb-3">
                    <div class="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Evidence</div>
                    <div class="text-[11px] font-mono text-slate-300 break-all">${feature.details}</div>
                </div>
            `
                    : ''
            }
            <div class="flex justify-between items-center pt-1 border-t border-slate-700/50">
                <span class="text-[10px] text-slate-500 font-mono">${feature.isoRef}</span>
                <span class="text-[10px] text-slate-500 font-bold">Complexity: ${feature.complexityScore}/5</span>
            </div>
        </div>
    `;

    const b64Tooltip = safeBtoa(tooltipContent);

    return html`
        <div class="${containerClass}" data-tooltip-html-b64="${b64Tooltip}">
            <div class="flex justify-between items-start mb-3">
                <div
                    class="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider ${isUsed
                        ? 'text-white'
                        : 'text-slate-500'}"
                >
                    <div
                        class="p-1.5 rounded-lg ${isUsed
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-800 text-slate-600'}"
                    >
                        ${isUsed ? icons.checkCircle : icons.circle}
                    </div>
                    <span class="truncate" title="${feature.name}"
                        >${feature.name}</span
                    >
                </div>
            </div>

            <div class="flex items-end justify-between mt-auto pt-2">
                <div
                    class="text-[9px] font-mono text-slate-500 truncate max-w-[140px] bg-black/20 px-1.5 py-0.5 rounded"
                    title="${feature.isoRef}"
                >
                    ${feature.isoRef}
                </div>
                <div
                    class="flex gap-0.5"
                    title="Complexity Score: ${feature.complexityScore}/5"
                >
                    ${Array(5)
                        .fill(0)
                        .map(
                            (_, i) => html`
                                <div
                                    class="w-1 h-2 rounded-full ${i <
                                    feature.complexityScore
                                        ? complexityColor
                                        : 'bg-slate-800'}"
                                ></div>
                            `
                        )}
                </div>
            </div>
        </div>
    `;
};
