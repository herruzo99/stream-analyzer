import { html } from 'lit-html';
import { useStore } from '../../../../../core/store.js';
import { getTooltipData as getAllIsoTooltipData } from '../../../../../protocols/segment/isobmff/index.js';
import { hexViewTemplate } from '../../../../components/hex-view.js';
import { buildByteMap } from './view-model.js';
import { getInspectorState } from '../interaction-logic.js';

const allIsoTooltipData = getAllIsoTooltipData();
const boxColors = [
    { bg: 'bg-red-800', border: 'border-red-700' },
    { bg: 'bg-yellow-800', border: 'border-yellow-700' },
    { bg: 'bg-green-800', border: 'border-green-700' },
    { bg: 'bg-blue-800', border: 'border-blue-700' },
    { bg: 'bg-indigo-800', border: 'border-indigo-700' },
    { bg: 'bg-purple-800', border: 'border-purple-700' },
    { bg: 'bg-pink-800', border: 'border-pink-700' },
    { bg: 'bg-teal-800', border: 'border-teal-700' },
];
const chunkColor = { bg: 'bg-slate-700', border: 'border-slate-600' };

function findBox(boxes, predicate) {
    for (const box of boxes) {
        if (predicate(box)) return box;
        if (box.children?.length > 0) {
            const found = findBox(box.children, predicate);
            if (found) return found;
        }
    }
    return null;
}

export function findBoxByOffset(parsedData, offset) {
    if (!parsedData || !parsedData.boxes) return null;
    const findInGrouped = (grouped, off) => {
        for (const item of grouped) {
            if (item.offset === off) return item;
            if (item.children?.length > 0) {
                const found = findInGrouped(item.children, off);
                if (found) return found;
            }
        }
        return null;
    };
    const grouped = groupboxesIntoChunks(parsedData.boxes);
    return findInGrouped(grouped, offset);
}

function assignBoxColors(boxes) {
    const colorState = { index: 0 };
    const traverse = (boxList, state) => {
        for (const box of boxList) {
            if (box.isChunk) {
                box.color = chunkColor;
                if (box.children?.length > 0) {
                    traverse(box.children, state);
                }
            } else {
                box.color = boxColors[state.index % boxColors.length];
                state.index++;
                if (box.children?.length > 0) {
                    traverse(box.children, state);
                }
            }
        }
    };
    if (boxes) {
        traverse(boxes, colorState);
    }
}

const getTimescaleForBox = (box, rootData) => {
    if (!rootData || !rootData.boxes) return null;
    const mdhd = findBox(rootData.boxes, (b) => b.type === 'mdhd');
    if (mdhd) return mdhd.details?.timescale?.value;
    return null;
};

function groupboxesIntoChunks(boxes) {
    const grouped = [];
    let i = 0;
    while (i < boxes.length) {
        const box = boxes[i];
        if (box.type === 'moof' && boxes[i + 1]?.type === 'mdat') {
            const mdat = boxes[i + 1];
            grouped.push({
                isChunk: true,
                type: 'CMAF Chunk',
                offset: box.offset,
                size: box.size + mdat.size,
                children: [box, mdat],
                details: {
                    info: {
                        value: 'A logical grouping of a moof and mdat box, representing a single CMAF chunk.',
                        offset: box.offset,
                        length: 0,
                    },
                    size: {
                        value: `${box.size + mdat.size} bytes`,
                        offset: box.offset,
                        length: 0,
                    },
                },
                issues: [],
            });
            i += 2;
        } else {
            grouped.push(box);
            i += 1;
        }
    }
    return grouped;
}

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
    const isSelected = itemForDisplay?.offset === box.offset;
    const isChunk = box.isChunk;
    const selectionClass = isSelected
        ? 'bg-blue-900/50 ring-1 ring-blue-500'
        : 'hover:bg-gray-800/50';
    const colorClass = box.color?.border || 'border-transparent';

    return html`
        <details class="box-node" ?open=${isChunk || box.children.length > 0}>
            <summary
                class="p-1 rounded cursor-pointer ${selectionClass} border-l-4 ${colorClass}"
                data-box-offset=${box.offset}
            >
                <span class="font-mono text-sm text-white ml-2">${box.type}</span>
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

const inspectorPanelTemplate = (rootData) => {
    const { itemForDisplay, fieldForDisplay } = getInspectorState();
    const box = itemForDisplay;

    if (!box) return placeholderTemplate();
    const boxInfo = allIsoTooltipData[box.type] || {};

    const fields = Object.entries(box.details).map(([key, field]) => {
        const highlightClass =
            key === fieldForDisplay ? 'bg-purple-900/50' : '';
        const fieldInfo = allIsoTooltipData[`${box.type}@${key}`];
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
                class="${highlightClass}"
                data-field-name="${key}"
                data-box-offset="${box.offset}"
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

export function getInteractiveIsobmffTemplate(
    currentPage,
    bytesPerPage,
    onPageChange,
    allTooltips,
    inspectorState
) {
    const { activeSegmentUrl, segmentCache } = useStore.getState();
    const cachedSegment = segmentCache.get(activeSegmentUrl);
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

    const groupedBoxes = groupboxesIntoChunks(
        parsedSegmentData.data.boxes || []
    );
    assignBoxColors(groupedBoxes);
    parsedSegmentData.byteMap = buildByteMap(groupedBoxes);

    return html`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(300px,25%)_1fr] gap-4"
        >
            <div class="sticky top-4 h-max">
                <div class="flex flex-col gap-4">
                    <div
                        class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-96 lg:h-[24rem] overflow-hidden flex flex-col"
                    >
                        ${inspectorPanelTemplate(parsedSegmentData.data)}
                    </div>
                    ${issuesTemplate(parsedSegmentData.data.issues)}
                    ${treeViewTemplate(groupedBoxes)}
                </div>
            </div>
            <div>
                ${hexViewTemplate(
                    cachedSegment.data,
                    parsedSegmentData.byteMap,
                    currentPage,
                    bytesPerPage,
                    onPageChange,
                    allTooltips,
                    inspectorState
                )}
            </div>
        </div>
    `;
}