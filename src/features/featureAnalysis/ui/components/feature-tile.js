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
            ? 'bg-teal-500'
            : feature.complexityScore >= 3
                ? 'bg-blue-500'
                : 'bg-slate-400';

    // Base container style
    const containerClass = `
        relative flex flex-col justify-between p-4 rounded-lg border transition-all duration-200 h-full
        ${isUsed
            ? 'bg-slate-900/50 border-blue-500/30 shadow-lg shadow-blue-500/5 hover:border-[#60a5fa]/50 hover:shadow-blue-500/20'
            : 'bg-slate-900/20 border-slate-700 opacity-60 hover:opacity-100 hover:bg-slate-900/40 hover:border-slate-400/30'
        }
        ${tooltipTriggerClasses}
    `;

    // Construct Rich Tooltip HTML
    const tooltipContent = `
        <div class="text-left min-w-[320px] p-1">
            <!-- Header -->
            <div class="flex items-start justify-between mb-3 pb-3 border-b border-slate-700">
                <div>
                    <div class="font-bold text-slate-100 text-sm flex items-center gap-2 mb-1">
                        ${feature.name}
                    </div>
                    <div class="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 inline-block">
                        ${feature.isoRef}
                    </div>
                </div>
                ${isUsed
            ? `<div class="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_#10b981]/10">
                            <span class="relative flex h-1.5 w-1.5">
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Active
                           </div>`
            : `<div class="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            Inactive
                           </div>`
        }
            </div>

            <!-- Description -->
            <div class="text-xs text-slate-100 leading-relaxed mb-4 font-medium">
                ${feature.desc}
            </div>

            <!-- Evidence Section (if used) -->
            ${isUsed
            ? `
                <div class="bg-slate-900/50 rounded-lg border border-blue-500/20 overflow-hidden mb-4 relative group">
                    <div class="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>
                    <div class="px-3 py-2 border-b border-blue-500/10 bg-blue-500/10 flex items-center gap-2">
                        <span class="text-blue-400"><icon-component name="search-code" class="h-5 w-5"></icon-component></span>
                        <span class="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Detection Evidence</span>
                    </div>
                    <div class="p-3 font-mono text-[10px] text-slate-100 break-all leading-relaxed">
                        ${feature.details}
                    </div>
                </div>
            `
            : ''
        }

            <!-- Footer Stats -->
            <div class="grid grid-cols-2 gap-2">
                <div class="bg-slate-900/30 rounded p-2 border border-slate-700 flex flex-col gap-1">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Complexity</span>
                    <div class="flex items-center gap-1">
                        <span class="text-xs font-bold text-slate-100">${feature.complexityScore}/5</span>
                        <div class="flex gap-0.5 h-1.5">
                            ${Array(5)
            .fill(0)
            .map(
                (_, i) =>
                    `<div class="w-1 rounded-full ${i < feature.complexityScore
                        ? 'bg-teal-500'
                        : 'bg-slate-900'
                    }"></div>`
            )
            .join('')}
                        </div>
                    </div>
                </div>
                <div class="bg-slate-900/30 rounded p-2 border border-slate-700 flex flex-col gap-1">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                    <span class="text-xs font-medium text-slate-100 truncate" title="${feature.category}">${feature.category}</span>
                </div>
            </div>
        </div>
    `;

    const b64Tooltip = safeBtoa(tooltipContent);

    return html`
        <div class="${containerClass}" data-tooltip-html-b64="${b64Tooltip}">
            <div class="flex justify-between items-start mb-3 min-w-0">
                <div
                    class="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider min-w-0 ${isUsed
            ? 'text-slate-100'
            : 'text-slate-400'}"
                >
                    <div
                        class="shrink-0 p-1.5 rounded-lg ${isUsed
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-slate-900 text-slate-400'}"
                    >
                        ${isUsed ? icons.checkCircle : icons.circle}
                    </div>
                    <span class="line-clamp-2 leading-tight break-words" title="${feature.name}"
                        >${feature.name}</span
                    >
                </div>
            </div>

            <div class="flex items-end justify-between mt-auto pt-2">
                <div
                    class="text-[9px] font-mono text-slate-400 truncate max-w-[140px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700"
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
                        : 'bg-slate-900'}"
                                ></div>
                            `
            )}
                </div>
            </div>
        </div>
    `;
};
