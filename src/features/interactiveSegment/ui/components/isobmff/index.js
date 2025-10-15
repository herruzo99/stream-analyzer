import { html } from 'lit-html';
import { getInspectorState } from '../interaction-logic.js';
import { inspectorDetailsTemplate } from '@/ui/shared/isobmff-renderer';

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

const placeholderTemplate = () => html`
    <div class="p-3 text-sm text-gray-500">
        Hover over an item in the tree view or hex view to see details.
    </div>
`;

const sampleInspectorTemplate = (sample) => {
    const dependsOnMap = { 2: 'No (I-Frame)', 1: 'Yes', 0: 'Unknown' };
    return html`
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
    `;
};

export const inspectorPanelTemplate = (rootData) => {
    const { itemForDisplay, fieldForDisplay } = getInspectorState();
    const item = itemForDisplay;

    if (!item) return placeholderTemplate();
    if (item.isSample) return sampleInspectorTemplate(item);

    // For a regular box, delegate rendering to the shared component.
    return inspectorDetailsTemplate(item, rootData, fieldForDisplay);
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
    const colorClass = box.color?.border || 'border-slate-700';

    return html`
        <details class="box-node" ?open=${isChunk || box.children.length > 0}>
            <summary
                class="relative p-1 rounded cursor-pointer ${selectionClass} border-l-4 ${colorClass}"
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
    const isInit = !!findBoxRecursive(boxes, (b) => b.type === 'moov');
    const isMedia = !!findBoxRecursive(boxes, (b) => b.type === 'moof');
    let summaryText = 'Unknown Segment Type';
    if (isInit) summaryText = 'Initialization Segment';
    if (isMedia) summaryText = 'Media Segment';

    const ftyp = findBoxRecursive(boxes, (b) => b.type === 'ftyp');
    const brands = ftyp?.details?.compatibleBrands?.value || 'N/A';

    return html`
        <div
            class="structure-content-area rounded-md bg-gray-900/90 border border-gray-700 h-full flex flex-col"
        >
            <h3 class="font-bold text-base p-2 border-b border-gray-700">
                Box Structure
            </h3>
            <div class="p-2 overflow-y-auto grow">
                <ul class="list-none p-0">
                    ${boxes.map((box) => html`<li>${renderBoxNode(box)}</li>`)}
                </ul>
            </div>
            <div
                class="p-2 text-xs space-y-2 border-t border-gray-700 shrink-0"
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
