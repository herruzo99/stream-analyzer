import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

const statusColors = {
    success: 'text-emerald-400 border-emerald-500/30 bg-emerald-900/10',
    warning: 'text-amber-400 border-amber-500/30 bg-amber-900/10',
    error: 'text-red-400 border-red-500/30 bg-red-900/10',
    neutral: 'text-slate-300 border-white/10 bg-white/5',
    info: 'text-emerald-200 border-emerald-400/25 bg-emerald-500/10',
};

/**
 * Safely encodes a UTF-8 string to Base64.
 * Standard btoa() throws on Unicode characters.
 */
const safeBtoa = (str) => {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        )
    );
};

const createTooltipContent = (metric) => {
    const content = `
        <div class="text-left min-w-[220px]">
            <div class="font-bold text-white text-sm mb-1 border-b border-slate-600 pb-1 flex items-center gap-2">
                ${metric.name}
            </div>
            <div class="text-xs text-slate-300 leading-relaxed mb-2">
                ${metric.description || 'No description available.'}
            </div>
            ${
                metric.warning
                    ? `<div class="mb-2 p-2 bg-yellow-900/30 rounded border border-yellow-700/50 flex gap-2 items-start">
                    <span class="text-yellow-400 text-[10px]">⚠️</span>
                    <p class="text-xs text-yellow-200">${metric.warning.text}</p>
                </div>`
                    : ''
            }
            ${
                metric.technical
                    ? `<div class="text-[10px] font-mono text-emerald-200 bg-emerald-500/10 p-1.5 rounded border border-emerald-400/25 break-all">
                    ${metric.technical}
                </div>`
                    : ''
            }
        </div>
    `;
    return safeBtoa(content);
};

const metricItem = (m) => {
    // Tailwind classes don't support dynamic string interpolation for purging unless safelisted.
    // We map the status directly to the pre-defined strings in statusColors.
    const colorClasses = statusColors[m.status] || statusColors.neutral;

    const cardClasses = {
        flex: true,
        'flex-col': true,
        'p-2.5': true,
        'rounded-md': true,
        border: true,
        'transition-all': true,
        'duration-200': true,
        'hover:bg-white/10': true,
        // Add tooltip trigger class to enable global event listener
        [tooltipTriggerClasses]: true,
    };

    // Add the color classes string manually since it contains multiple utility classes
    const className = `${Object.keys(cardClasses).join(' ')} ${colorClasses}`;
    const tooltipB64 = createTooltipContent(m);

    return html`
        <div class="${className}" data-tooltip-html-b64="${tooltipB64}">
            <div class="flex justify-between items-start mb-1">
                <span
                    class="text-[10px] font-bold r opacity-70"
                    >${m.name}</span
                >
                <span class="scale-75 opacity-60">${icons[m.icon]}</span>
            </div>
            <div class="font-mono text-sm font-bold truncate">
                ${m.value}
                <span class="text-[10px] opacity-60 font-sans ml-0.5"
                    >${m.unit}</span
                >
            </div>
        </div>
    `;
};

export const metricPanelTemplate = (groups) => {
    if (!groups || groups.length === 0) return html``;

    return html`
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${groups.map(
                (group) => html`
                    <div
                        class="bg-white/5 rounded-md border border-white/10 p-4"
                    >
                        <h4
                            class="text-xs font-bold text-slate-500 r mb-3 flex items-center gap-2"
                        >
                            ${group.title}
                        </h4>
                        <div class="grid grid-cols-2 gap-2">
                            ${group.metrics.map(metricItem)}
                        </div>
                    </div>
                `
            )}
        </div>
    `;
};
