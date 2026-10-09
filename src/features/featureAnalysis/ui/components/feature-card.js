import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';

export const featureCardTemplate = (feature, onDetailsClick) => {
    const isUsed = feature.used;

    const containerClasses = classMap({
        relative: true,
        flex: true,
        'flex-col': true,
        'h-full': true,
        'p-4': true,
        'rounded-xl': true,
        border: true,
        'transition-all': true,
        'duration-200': true,
        'bg-slate-800': !isUsed,
        'border-slate-800': !isUsed,
        'bg-blue-500/10': isUsed,
        'border-blue-500/30': isUsed,
        'shadow-lg': isUsed,
        'hover:border-blue-500/50': isUsed,
        group: true,
    });

    const iconColor = isUsed
        ? 'text-blue-400'
        : 'text-slate-400';
    const iconBg = isUsed
        ? 'bg-blue-500/10'
        : 'bg-slate-900/20';
    const titleColor = isUsed
        ? 'text-slate-200'
        : 'text-slate-400';
    const descColor = isUsed
        ? 'text-slate-400'
        : 'text-slate-400/70';

    return html`
        <div class="${containerClasses}">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg ${iconBg} ${iconColor}">
                        ${icons.cpu}
                    </div>
                    <div>
                        <h4
                            class="text-sm font-bold ${titleColor} leading-tight"
                        >
                            ${feature.name}
                        </h4>
                        <span
                            class="text-[10px] font-mono text-slate-400"
                            >${feature.isoRef}</span
                        >
                    </div>
                </div>
                ${isUsed
                    ? html`<span
                          class="flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                      ></span>`
                    : ''}
            </div>

            <p class="text-xs ${descColor} mb-4 grow">${feature.desc}</p>

            <div
                class="pt-3 mt-auto border-t border-slate-800 flex items-center justify-between"
            >
                <span
                    class="text-[10px] font-semibold uppercase tracking-wider ${isUsed
                        ? 'text-emerald-400'
                        : 'text-slate-400'}"
                >
                    ${isUsed ? 'Detected' : 'Not Detected'}
                </span>

                ${isUsed
                    ? html`
                          <button
                              @click=${() => onDetailsClick(feature)}
                              class="text-xs text-blue-400 hover:text-[#60a5fa] font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                              Details ${icons.arrowRight}
                          </button>
                      `
                    : ''}
            </div>
        </div>
    `;
};
