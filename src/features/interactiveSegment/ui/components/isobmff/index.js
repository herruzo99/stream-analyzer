import { html } from 'lit-html';
import { getTooltipData as getAllIsoTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { getInspectorState } from '../interaction-logic.js';

const allIsoTooltipData = getAllIsoTooltipData();

const BOX_BG_COLORS = {
    red: 'bg-red-900/20',
    yellow: 'bg-yellow-900/20',
    green: 'bg-green-900/20',
    blue: 'bg-blue-900/20',
    indigo: 'bg-indigo-900/20',
    purple: 'bg-purple-900/20',
    pink: 'bg-pink-900/20',
    teal: 'bg-teal-900/20',
    slate: 'bg-slate-800/20',
};

/**
 * Recursively finds the first occurrence of a box that satisfies the predicate.
 * @param {import('@/infrastructure/parsing/isobmff/parser.js').Box[]} boxes
 * @param {string | ((box: import('@/infrastructure/parsing/isobmff/parser.js').Box) => boolean)} predicateOrType
 * @returns {import('@/infrastructure/parsing/isobmff/parser.js').Box | null}
 */
function findBoxRecursive(boxes, predicateOrType) {
    const predicate =
        typeof predicateOrType === 'function'
            ? predicateOrType
            : (box) => box.type === predicateOrType;

    if (!boxes) return null;
    for (const box of boxes) {
        if (predicate(box)) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, predicate);
            if (found) return found;
        }
    }
    return null;
}

export function findItemByOffset(parsedData, offset) {
    if (!parsedData) return null;

    // First, check for a matching sample
    if (parsedData.samples) {
        const sample = parsedData.samples.find(
            (s) => offset >= s.offset && offset < s.offset + s.size
        );
        if (sample) return sample;
    }

    // Fallback to finding the containing box
    const findInGrouped = (grouped, off) => {
        for (const item of grouped) {
            if (off >= item.offset && off < item.offset + item.size) {
                if (item.children?.length > 0) {
                    const foundChild = findInGrouped(item.children, off);
                    if (foundChild) return foundChild;
                }
                return item;
            }
        }
        return null;
    };
    const grouped = parsedData.data.boxes || [];
    return findInGrouped(grouped, offset);
}

const getTimescaleForBox = (box, rootData) => {
    if (!rootData || !rootData.boxes) return null;
    const mdhd = findBoxRecursive(rootData.boxes, (b) => b.type === 'mdhd');
    if (mdhd) return mdhd.details?.timescale?.value;
    return null;
};

const placeholderTemplate = () => html`
    <div class="p-3 text-sm text-gray-500">
        Hover over an item in the tree view or hex view to see details.
    </div>
`;

const issuesTemplate = (issues) => {
    if (!issues || issues.length === 0) return '';
    return html`
        <div class="p-3 border-b border-gray-700 bg-yellow-900/50">
            <h4 class="font-bold text-yellow-300 text-sm mb-1">
                Parsing Issues
            </h4>
            <ul class="list-disc pl-5 text-xs text-yellow-200">
                ${issues.map(
                    (issue) =>
                        html`<li>
                            <span class="font-semibold"
                                >[${issue.type.toUpperCase()}]</span
                            >
                            ${issue.message}
                        </li>`
                )}
            </ul>
        </div>
    `;
};

const sampleInspectorTemplate = (sample) => {
    const dependsOnMap = { 2: 'No (I-Frame)', 1: 'Yes', 0: 'Unknown' };
    return html` <>
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">Sample ${sample.index}</div>
            <div class="text-xs text-gray-400">${sample.size} bytes</div>
        </div>
        <div class="overflow-y-auto">
            <table class="w-full table-fixed text-xs">
                <tbody>
                    <tr>
                        <td class="p-1 pr-2 text-gray-400">
                            Depends On Others
                        </td>
                        <td class="p-1 font-mono text-white">
                            ${dependsOnMap[sample.dependsOn] || 'N/A'}
                        </td>
                    </tr>
                    <tr>
                        <td class="p-1 pr-2 text-gray-400">Degradation Prio</td>
                        <td class="p-1 font-mono text-white">
                            ${sample.degradationPriority ?? 'N/A'}
                        </td>
                    </tr>
                    <tr>
                        <td class="p-1 pr-2 text-gray-400">Sample Group</td>
                        <td class="p-1 font-mono text-white">
                            ${sample.sampleGroup ?? 'N/A'}
                        </td>
                    </tr>
                    <tr>
                        <td class="p-1 pr-2 text-gray-400">Encrypted</td>
                        <td class="p-1 font-mono text-white">
                            ${sample.encryption ? 'Yes' : 'No'}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </>`;
};

const entriesTableTemplate = (box) => {
    const entries = box.samples || box.entries;
    if (!entries || entries.length === 0) {
        return '';
    }

    const headers = Object.keys(entries[0] || {});
    if (headers.length === 0) return '';

    return html`
        <div class="p-3 border-t border-gray-700">
            <h4 class="font-bold text-sm mb-2 text-gray-300">
                Entries / Samples (${entries.length})
            </h4>
            <div class="max-h-60 overflow-y-auto">
                <table class="w-full text-left text-xs">
                    <thead class="sticky top-0 bg-gray-800">
                        <tr>
                            ${headers.map(
                                (h) =>
                                    html`<th class="p-1 font-semibold">
                                        ${h}
                                    </th>`
                            )}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${entries.slice(0, 100).map(
                            (entry) => html`
                                <tr>
                                    ${headers.map(
                                        (h) =>
                                            html`<td
                                                class="p-1 font-mono truncate"
                                            >
                                                ${entry[h]}
                                            </td>`
                                    )}
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
                ${entries.length > 100
                    ? html`<div class="text-center text-xs text-gray-500 pt-2">
                          ... and ${entries.length - 100} more entries.
                      </div>`
                    : ''}
            </div>
        </div>
    `;
};

export const inspectorPanelTemplate = (rootData) => {
    const { itemForDisplay, fieldForDisplay } = getInspectorState();
    const item = itemForDisplay;

    if (!item) return placeholderTemplate();
    if (item.isSample) return sampleInspectorTemplate(item);

    const box = item;
    const boxInfo = allIsoTooltipData[box.type] || {};

    const fields = Object.entries(box.details).map(([key, field]) => {
        const fieldInfo = allIsoTooltipData[`${box.type}@${key}`];
        const highlightClass =
            fieldForDisplay === key && itemForDisplay.offset === box.offset
                ? 'is-inspector-field-highlighted'
                : '';
        let interpretedValue = html``;

        if (key === 'baseMediaDecodeTime' && box.type === 'tfdt') {
            const timescale = getTimescaleForBox(box, rootData);
            if (timescale) {
                interpretedValue = html`<span
                    class="text-xs text-cyan-400 block mt-1"
                    >(${(field.value / timescale).toFixed(3)} seconds)</span
                >`;
            }
        }

        return html`
            <tr
                class=${highlightClass}
                data-field-name="${key}"
                data-inspector-offset="${box.offset}"
            >
                <td
                    class="p-1 pr-2 text-xs text-gray-400 align-top"
                    title="${fieldInfo?.text || ''}"
                >
                    ${key}
                </td>
                <td class="p-1 text-xs font-mono text-white break-all">
                    ${field.value !== undefined ? String(field.value) : 'N/A'}
                    ${interpretedValue}
                </td>
            </tr>
        `;
    });

    return html` <>
        <div class="p-3 border-b border-gray-700">
            <div class="font-bold text-base mb-1">
                ${box.type}
                <span class="text-sm text-gray-400">(${box.size} bytes)</span>
            </div>
            <div class="text-xs text-emerald-400 mb-2 font-mono">
                ${boxInfo.ref || ''}
            </div>
            <p class="text-xs text-gray-300">
                ${boxInfo.text || 'No description available.'}
            </p>
        </div>
        ${issuesTemplate(box.issues)}
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-2/5" />
                    <col class="w-3/5" />
                </colgroup>
                <tbody>
                    ${fields}
                </tbody>
            </table>
        </div>
        ${entriesTableTemplate(box)}
    </>`;
};

const renderBoxNode = (box) => {
    const { itemForDisplay } = getInspectorState();
    const isSelected =
        itemForDisplay &&
        itemForDisplay.offset === box.offset &&
        !itemForDisplay.isSample;
    const isChunk = box.isChunk;
    const selectionClass = isSelected
        ? 'bg-blue-900/50 ring-1 ring-blue-500'
        : '';
    const borderColorClass = box.color?.border || 'border-transparent';
    const bgColorClass = box.color?.name ? BOX_BG_COLORS[box.color.name] : '';

    return html`
        <details class="box-node" ?open=${isChunk || box.children.length > 0}>
            <summary
                class="relative p-1 rounded cursor-pointer ${selectionClass} ${bgColorClass} border-l-4 ${borderColorClass}"
                data-box-offset=${box.offset}
                data-group-start-offset=${isChunk ? box.offset : null}
            >
                <span class="font-mono text-sm text-white ml-2"
                    >${box.type}</span
                >
                <span class="text-xs text-gray-500 ml-2"
                    >(${box.size} bytes)</span
                >
            </summary>
            ${box.children.length > 0
                ? html`<ul class="pl-4 border-l border-gray-700 list-none ml-2">
                      ${box.children.map(
                          (child) => html`<li>${renderBoxNode(child)}</li>`
                      )}
                  </ul>`
                : ''}
        </details>
    `;
};

export const structureContentTemplate = (parsedSegmentData) => {
    if (!parsedSegmentData) return html``;

    const { boxes, issues } = parsedSegmentData;
    const isInit = !!findBoxRecursive(boxes, 'moov');
    const isMedia = !!findBoxRecursive(boxes, 'moof');
    let summaryText = 'Unknown Segment Type';
    if (isInit) summaryText = 'Initialization Segment';
    if (isMedia) summaryText = 'Media Segment';

    const ftyp = findBoxRecursive(boxes, 'ftyp');
    const brands = ftyp?.details?.compatibleBrands?.value || 'N/A';

    return html`
        <div
            class="structure-content-area rounded-md bg-gray-900/90 border border-gray-700 h-full flex flex-col"
        >
            <h3 class="font-bold text-base p-2 border-b border-gray-700">
                Box Structure
            </h3>
            <div class="p-2 overflow-y-auto flex-grow">
                <ul class="list-none p-0">
                    ${boxes.map((box) => html`<li>${renderBoxNode(box)}</li>`)}
                </ul>
            </div>
            <div
                class="p-2 text-xs space-y-2 border-t border-gray-700 flex-shrink-0"
            >
                <div>Type: ${summaryText}</div>
                <div>
                    Compatible Brands: <span class="font-mono">${brands}</span>
                </div>
                ${issues.length > 0
                    ? html`<div class="text-red-400">
                          Parsing Issues: ${issues.length}
                      </div>`
                    : ''}
            </div>
        </div>
    `;
};