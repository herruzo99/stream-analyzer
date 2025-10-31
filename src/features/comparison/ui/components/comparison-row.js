import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

const getCellClass = (status, value) => {
    if (value === 'N/A' || value === null || value === undefined) {
        return 'bg-gray-800/50 text-gray-500 italic';
    }
    switch (status) {
        case 'different':
            return 'bg-yellow-900/40';
        case 'missing':
            return 'bg-red-900/40';
        default:
            return '';
    }
};

export const comparisonRowTemplate = (comparisonPoint, numColumns) => {
    const { label, tooltip, isoRef, values, status } = comparisonPoint;

    const gridStyle = `grid-template-columns: 250px repeat(${numColumns}, minmax(200px, 1fr));`;

    return html`
        <div class="grid" style="${gridStyle}">
            <div
                class="font-medium text-gray-400 p-2 border-r border-gray-700 ${tooltipTriggerClasses}"
                data-tooltip="${tooltip}"
                data-iso="${isoRef}"
            >
                ${label}
            </div>
            ${values.map(
                (value) => html`
                    <div class="p-2 font-mono text-xs border-r border-gray-700 wrap-break-word ${getCellClass(status, value)}">
                        ${unsafeHTML(value ?? '')}
                    </div>
                `
            )}
        </div>
    `;
};