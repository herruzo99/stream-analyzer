import { html } from 'lit-html';
import '@/ui/components/virtualized-list';

const getCellClass = (status) => {
    if (status === 'different') return 'bg-red-900/40';
    if (status === 'missing') return 'bg-gray-800/50 text-gray-500 italic';
    return '';
};

const renderValue = (value) => {
    if (value === null || value === undefined) return '---';

    // Specifically handle the trun sample flags object.
    if (
        typeof value === 'object' &&
        value !== null &&
        'sample_depends_on' in value
    ) {
        const isSync = !value.sample_is_non_sync_sample;
        const syncClass = isSync ? 'text-green-400' : 'text-yellow-400';

        return html`
            <div class="grid grid-cols-2 gap-x-2 text-left">
                <div class="${syncClass}" title="Sync Sample">
                    ${isSync ? 'Sync' : 'Non-Sync'}
                </div>
                <div title="Degradation Priority">
                    Prio: ${value.sample_degradation_priority}
                </div>
                <div class="col-span-2 text-gray-400" title="Sample Depends On">
                    ${value.sample_depends_on}
                </div>
                <div class="col-span-2 text-gray-400" title="Is Depended On">
                    ${value.sample_is_depended_on}
                </div>
                <div class="col-span-2 text-gray-400" title="Is Leading">
                    ${value.is_leading}
                </div>
            </div>
        `;
    }

    return String(value);
};

export const tableComparisonTemplate = ({
    tableData,
    numSegments,
    hideSameRows,
}) => {
    if (!tableData) return '';

    const { headers, entries } = tableData;
    const itemsToRender = hideSameRows
        ? entries.filter((row) => row.status !== 'same')
        : entries;

    if (itemsToRender.length === 0) {
        return html`<div
            class="text-sm text-green-400 text-center p-3 bg-gray-900/50 rounded-b-lg"
        >
            All ${entries.length} entries are identical.
        </div>`;
    }

    const gridStyle = `grid-template-columns: 60px repeat(${numSegments}, 1fr);`;

    const rowRenderer = (item, index) => {
        const { values, status } = item;
        return html`
            <div
                class="grid items-center border-b border-gray-700 text-xs"
                style="${gridStyle}"
            >
                <div class="p-2 text-gray-500 text-right">${index + 1}</div>
                ${values.map(
                    (valueObj) => html`
                        <div
                            class="grid items-center p-2 font-mono border-l border-gray-700 ${getCellClass(
                                status
                            )}"
                            style="grid-template-columns: repeat(${headers.length}, 1fr);"
                        >
                            ${headers.map(
                                (header) =>
                                    html`<span
                                        >${renderValue(
                                            valueObj
                                                ? valueObj[header.key]
                                                : null
                                        )}</span
                                    >`
                            )}
                        </div>
                    `
                )}
            </div>
        `;
    };

    return html`
        <div
            class="border border-gray-700 rounded-b-lg overflow-hidden text-xs"
        >
            <div
                class="grid sticky top-0 bg-gray-800 z-10 font-semibold text-gray-400"
                style="${gridStyle}"
            >
                <div class="p-2 text-right">#</div>
                ${Array(numSegments)
                    .fill(0)
                    .map(
                        (_, i) => html`
                            <div
                                class="grid items-center p-2 border-l border-gray-700"
                                style="grid-template-columns: repeat(${headers.length}, 1fr);"
                            >
                                ${headers.map(
                                    (h) => html`<span>${h.label}</span>`
                                )}
                            </div>
                        `
                    )}
            </div>
            <virtualized-list
                .items=${itemsToRender}
                .rowTemplate=${(item, index) => rowRenderer(item, index)}
                .rowHeight=${96}
                .itemId=${(item, index) => index}
                style="height: ${Math.min(itemsToRender.length * 96, 480)}px;"
            ></virtualized-list>
        </div>
    `;
};
