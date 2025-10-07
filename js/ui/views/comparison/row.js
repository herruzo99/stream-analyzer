import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { tooltipTriggerClasses } from '../../../shared/constants.js';

/**
 * Renders a single row in the comparison view.
 * @param {object} comparisonPoint - The data for the row.
 * @param {string} comparisonPoint.label - The title of the row.
 * @param {string} comparisonPoint.tooltip - The tooltip description.
 * @param {string} comparisonPoint.isoRef - The specification reference.
 * @param {Array<string|object>} comparisonPoint.values - The values for each stream.
 * @param {number} numStreams - The total number of streams being compared.
 * @returns {import('lit-html').TemplateResult}
 */
export const comparisonRowTemplate = (comparisonPoint, numStreams) => {
    const { label, tooltip, isoRef, values } = comparisonPoint;

    // The grid is now inside a scrolling container, so it can have a minimum width.
    const gridStyle = `grid-template-columns: 200px repeat(${numStreams}, minmax(200px, 1fr));`;

    return html`
        <div
            class="grid border-t border-l border-gray-700"
            style="${gridStyle}"
        >
            <div
                class="font-medium text-gray-400 p-2 border-r border-gray-700 ${tooltipTriggerClasses}"
                data-tooltip="${tooltip}"
                data-iso="${isoRef}"
            >
                ${label}
            </div>
            ${values.map(
                (value) => html`
                    <div
                        class="p-2 font-mono text-xs border-r border-gray-700 break-words"
                    >
                        ${unsafeHTML(value ?? '')}
                    </div>
                `
            )}
        </div>
    `;
};
