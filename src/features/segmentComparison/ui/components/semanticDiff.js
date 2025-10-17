import { html } from 'lit-html';

/**
 * Renders a table of modified fields within a box.
 * @param {import('@/types').Box | null} boxA
 * @param {import('@/types').Box | null} boxB
 * @returns {import('lit-html').TemplateResult | string}
 */
const renderModifiedDetails = (boxA, boxB) => {
    if (!boxA || !boxB) return '';

    const allKeys = new Set([
        ...Object.keys(boxA.details),
        ...Object.keys(boxB.details),
    ]);
    const diffRows = [];

    for (const key of allKeys) {
        const fieldA = boxA.details[key];
        const fieldB = boxB.details[key];
        const valA = fieldA?.value;
        const valB = fieldB?.value;

        // Deep compare for objects (like decoded flags)
        const isDifferent = JSON.stringify(valA) !== JSON.stringify(valB);

        if (isDifferent) {
            const renderVal = (val) => {
                if (typeof val === 'object' && val !== null) {
                    return html`
                        <div class="space-y-0.5">
                            ${Object.entries(val).map(
                                ([k, v]) => html`
                                    <div class="flex justify-between">
                                        <span class="text-gray-500 mr-2"
                                            >${k}:</span
                                        >
                                        <span>${String(v)}</span>
                                    </div>
                                `
                            )}
                        </div>
                    `;
                }
                return val ?? '---';
            };

            diffRows.push(html`
                <tr>
                    <td class="pr-2 py-0.5 text-gray-400 font-normal">
                        ${key}
                    </td>
                    <td class="pr-2 py-0.5 text-red-400">${renderVal(valA)}</td>
                    <td class="py-0.5 text-green-400">${renderVal(valB)}</td>
                </tr>
            `);
        }
    }

    if (diffRows.length === 0) return '';

    return html`
        <div class="mt-1 ml-4 pl-2 border-l border-dashed border-gray-500">
            <table class="text-xs font-mono">
                <thead>
                    <tr>
                        <th class="text-left font-semibold text-gray-500 pr-2">
                            Field
                        </th>
                        <th class="text-left font-semibold text-gray-500 pr-2">
                            From
                        </th>
                        <th class="text-left font-semibold text-gray-500">
                            To
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${diffRows}
                </tbody>
            </table>
        </div>
    `;
};

/**
 * Recursively renders a node in the semantic diff tree.
 * @param {object} node - A node from the diff tree model.
 * @returns {import('lit-html').TemplateResult}
 */
const renderDiffNode = (node) => {
    const statusClasses = {
        same: 'border-gray-700',
        modified: 'border-yellow-600 bg-yellow-900/20',
        added: 'border-green-600 bg-green-900/30',
        removed: 'border-red-600 bg-red-900/30',
    };

    const valueA = node.values[0];
    const valueB = node.values[1];

    const sizeA = valueA ? `${valueA.size} B` : '---';
    const sizeB = valueB ? `${valueB.size} B` : '---';

    let sizeDisplay;
    if (sizeA !== sizeB && valueA && valueB) {
        sizeDisplay = html`<span class="text-red-400">${sizeA}</span> &rarr;
            <span class="text-green-400">${sizeB}</span>`;
    } else {
        sizeDisplay = sizeA !== '---' ? sizeA : sizeB;
    }

    const hasChildrenWithDiffs =
        node.children && node.children.some((c) => c.status !== 'same');
    const detailsOpen = node.status !== 'same' || hasChildrenWithDiffs;

    return html`
        <details class="diff-node" ?open=${detailsOpen}>
            <summary
                class="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-gray-700/50 ${statusClasses[
                    node.status
                ]} border-l-4"
            >
                <span class="font-mono text-sm font-bold text-white"
                    >${node.type}</span
                >
                <span class="text-xs text-gray-400">(${sizeDisplay})</span>
            </summary>
            ${node.status === 'modified'
                ? renderModifiedDetails(valueA, valueB)
                : ''}
            ${node.children && node.children.length > 0
                ? html`
                      <div class="pl-6 border-l border-gray-600 ml-2">
                          ${node.children.map(renderDiffNode)}
                      </div>
                  `
                : ''}
        </details>
    `;
};

/**
 * Renders the semantic diff view for ISOBMFF structures.
 * @param {object[]} diffTree - The structural diff model from the comparator.
 * @returns {import('lit-html').TemplateResult}
 */
export const semanticDiffTemplate = (diffTree) => {
    if (!diffTree || diffTree.every((node) => node.status === 'same')) {
        return html`
            <div class="p-4 bg-gray-800 rounded-lg text-center text-green-400">
                <p class="font-semibold">✓ Structures are Identical</p>
            </div>
        `;
    }

    return html`
        <div class="bg-gray-800 p-3 rounded-lg border border-gray-700">
            ${diffTree.map(renderDiffNode)}
        </div>
    `;
};
