import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';

/**
 * Renders a single row in the comparison view.
 * @param {object} rowData - The data for the row.
 * @param {number} numColumns - The total number of segment columns.
 * @returns {import('lit-html').TemplateResult}
 */
export const comparisonRowTemplate = (rowData, numColumns) => {
    const { name, values, status } = rowData;

    const gridStyle = `grid-template-columns: 250px repeat(${numColumns}, minmax(300px, 1fr));`;

    const getCellClass = (value, index) => {
        if (value === '---') return 'bg-gray-800/50 text-gray-500 italic';
        if (status === 'different') return 'bg-red-900/40';
        return '';
    };

    return html`
        <div class="grid border-t border-gray-700" style="${gridStyle}">
            <div class="font-medium text-gray-300 p-3 border-r border-gray-700">
                ${name}
            </div>
            ${values.map(
                (value, index) => html`
                    <div
                        class="p-3 font-mono text-xs border-r border-gray-700 break-words ${getCellClass(
                            value,
                            index
                        )}"
                    >
                        ${unsafeHTML(String(value))}
                    </div>
                `
            )}
        </div>
    `;
};
