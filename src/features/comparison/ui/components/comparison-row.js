import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import * as icons from '@/ui/icons';

const getCellClassAndIcon = (status, value) => {
    if (value === 'N/A' || value === null || value === undefined) {
        return {
            className: 'bg-slate-800/50 text-slate-500 italic',
            icon: html``,
        };
    }
    switch (status) {
        case 'different':
            return {
                className: 'bg-amber-900/30',
                icon: html`<span
                    class="text-amber-400 shrink-0"
                    title="Different"
                    >${icons.updates}</span
                >`,
            };
        case 'missing':
            return {
                className: 'bg-red-900/40',
                icon: html`<span class="text-red-400 shrink-0" title="Missing"
                    >${icons.xCircle}</span
                >`,
            };
        default:
            return {
                className: '',
                icon: html`<span
                    class="text-green-500/50 shrink-0"
                    title="Same"
                    >${icons.checkCircle}</span
                >`,
            };
    }
};

export const comparisonRowTemplate = (comparisonPoint, numColumns) => {
    const { label, tooltip, isoRef, values, status } = comparisonPoint;

    // Determine the icon for the entire row based on its status.
    const { icon } = getCellClassAndIcon(status, values[0]);

    return html`
        <!-- The parent .grid container controls the column layout -->
        <div
            class="font-medium text-slate-300 p-3 border-r border-slate-700 flex items-start gap-2 ${tooltipTriggerClasses}"
            data-tooltip="${tooltip}"
            data-iso="${isoRef}"
        >
            ${icon}
            <span class="grow">${label}</span>
        </div>
        ${values.map(
            (value) => html`
                <div
                    class="p-3 font-mono text-xs border-r border-slate-700 wrap-break-word ${getCellClassAndIcon(
                        status,
                        value
                    ).className}"
                >
                    ${unsafeHTML(value ?? 'N/A')}
                </div>
            `
        )}
    `;
};