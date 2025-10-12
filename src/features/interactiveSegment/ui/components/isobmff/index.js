import { html } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { getTooltipData as getAllIsoTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { hexViewTemplate } from '@/ui/components/hex-view';
import { getInspectorState } from '../interaction-logic.js';

const allIsoTooltipData = getAllIsoTooltipData();

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

const summaryTemplate = (parsedSegmentData) => {
    if (!parsedSegmentData) return '';
    const isInit = !!findBoxRecursive(parsedSegmentData.boxes, 'moov');
    const isMedia = !!findBoxRecursive(parsedSegmentData.boxes, 'moof');
    let summaryText = 'Unknown Segment Type';
    if (isInit) summaryText = 'Initialization Segment';
    if (isMedia) summaryText = 'Media Segment';

    const ftyp = findBoxRecursive(parsedSegmentData.boxes, 'ftyp');
    const brands = ftyp?.details?.compatibleBrands?.value || 'N/A';

    return html`
        <div
            class="rounded-md bg-gray-900/90 border border-gray-700"
            data-testid="isobmff-summary-panel"
        >
            <h3 class="font-bold text-base p-2 border-b border-gray-700">
                ISOBMFF Summary
            </h3>
            <div class="p-2 text-xs space-y-2">
                <div>Type: ${summaryText}</div>
                <div>
                    Compatible Brands: <span class="font-mono">${brands}</span>
                </div>
                ${parsedSegmentData.issues.length > 0
                    ? html`<div class="text-red-400">
                          Parsing Issues: ${parsedSegmentData.issues.length}
                      </div>`
                    : ''}
            </div>
        </div>
    `;
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
    const colorClass = box.color?.border || 'border-transparent';

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

const treeViewTemplate = (boxes) => {
    if (!boxes || boxes.length === 0) return '';
    return html`
        <div
            class="box-tree-area rounded-md bg-gray-900/90 border border-gray-700"
        >
            <h3 class="font-bold text-base p-2 border-b border-gray-700">
                Box Structure
            </h3>
            <div class="p-2 overflow-y-auto max-h-96">
                <ul class="list-none p-0">
                    ${boxes.map((box) => html`<li>${renderBoxNode(box)}</li>`)}
                </ul>
            </div>
        </div>
    `;
};

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

    if (item.isSample) {
        return sampleInspectorTemplate(item);
    }

    const box = item;
    const boxInfo = allIsoTooltipData[box.type] || {};

    const fields = Object.entries(box.details).map(([key, field]) => {
        const fieldInfo = allIsoTooltipData[`${box.type}@${key}`];
        const highlightClass =
            fieldForDisplay === key ? 'is-inspector-field-highlighted' : '';
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

    return html`
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
    `;
};

export function getInteractiveIsobmffTemplate(renderHexView = false) {
    const { activeSegmentUrl } = useAnalysisStore.getState();
    const { get: getFromCache } = useSegmentCacheStore.getState();
    const { interactiveSegmentCurrentPage, pagedByteMap } = useUiStore.getState();
    const cachedSegment = getFromCache(activeSegmentUrl);
    const parsedSegmentData =
        cachedSegment?.parsedData &&
        cachedSegment.parsedData.format === 'isobmff'
            ? cachedSegment.parsedData
            : null;

    if (!parsedSegmentData) {
        return html`<div class="text-yellow-400 p-4">
            Could not parse ISOBMFF data for this segment.
        </div>`;
    }

    if (renderHexView) {
        const onPageChange = (offset) => {
            const totalPages = Math.ceil(
                cachedSegment.data.byteLength / 1024
            );
            const newPage = interactiveSegmentCurrentPage + offset;
            if (newPage >= 1 && newPage <= totalPages) {
                uiActions.setInteractiveSegmentPage(newPage);
            }
        };
        return hexViewTemplate(
            cachedSegment.data,
            pagedByteMap,
            interactiveSegmentCurrentPage,
            1024,
            onPageChange,
            allIsoTooltipData
        );
    }
    
    const groupedBoxes = parsedSegmentData.data.boxes || [];

    return html`
        <div class="flex flex-col gap-4">
            <div
                class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-96 lg:h-[24rem] flex flex-col overflow-y-auto"
            ></div>
            ${summaryTemplate(parsedSegmentData.data)}
            ${issuesTemplate(parsedSegmentData.data.issues)}
            ${treeViewTemplate(groupedBoxes)}
        </div>
    `;
}