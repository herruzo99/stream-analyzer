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
    if (typeof value === 'object' && value !== null && 'sample_depends_on' in value) {
        const parts = [];
        if (value.sample_is_non_sync_sample) parts.push('Non-Sync');
        else parts.push('Sync');
        
        if (value.sample_depends_on === 'Depends on others') parts.push('Dep-On');
        else if (value.sample_depends_on === 'Does not depend on others (I-frame)') parts.push('No-Dep-On');
        
        if (value.sample_is_depended_on === 'No other sample depends on this one (disposable)') parts.push('Disposable');
        
        return parts.join(', ');
    }

    return String(value);
};

export const tableComparisonTemplate = ({ tableData, numSegments, hideSameRows }) => {
    if (!tableData) return '';

    const { headers, entries } = tableData;
    const itemsToRender = hideSameRows ? entries.filter(row => row.status !== 'same') : entries;

    if (itemsToRender.length === 0) {
        return html`<div class="text-sm text-green-400 text-center p-3 bg-gray-900/50 rounded-b-lg">
            All ${entries.length} entries are identical.
        </div>`;
    }

    const gridStyle = `grid-template-columns: 60px repeat(${numSegments}, 1fr);`;

    const rowRenderer = (item, index) => {
        const { values, status } = item;
        return html`
            <div class="grid items-center border-b border-gray-700 text-xs" style="${gridStyle}">
                <div class="p-2 text-gray-500 text-right">${index + 1}</div>
                ${values.map(valueObj => html`
                    <div class="grid items-center p-2 font-mono border-l border-gray-700 ${getCellClass(status)}" style="grid-template-columns: repeat(${headers.length}, 1fr);">
                        ${headers.map(header => html`<span>${renderValue(valueObj ? valueObj[header.key] : null)}</span>`)}
                    </div>
                `)}
            </div>
        `;
    };

    return html`
        <div class="border border-gray-700 rounded-b-lg overflow-hidden text-xs">
            <div class="grid sticky top-0 bg-gray-800 z-10 font-semibold text-gray-400" style="${gridStyle}">
                <div class="p-2 text-right">#</div>
                ${Array(numSegments).fill(0).map((_, i) => html`
                    <div class="grid items-center p-2 border-l border-gray-700" style="grid-template-columns: repeat(${headers.length}, 1fr);">
                        ${headers.map(h => html`<span>${h.label}</span>`)}
                    </div>
                `)}
            </div>
            <virtualized-list
                .items=${itemsToRender}
                .rowTemplate=${(item, index) => rowRenderer(item, index)}
                .rowHeight=${32}
                .itemId=${(item, index) => index}
                style="height: ${Math.min(itemsToRender.length * 32, 320)}px;"
            ></virtualized-list>
        </div>
    `;
};