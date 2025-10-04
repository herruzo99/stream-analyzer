import { html, render } from 'lit-html';
import { useStore } from '../../../../../core/store.js';
import { dom } from '../../../../../core/dom.js';
import { getTooltipData as getAllIsoTooltipData } from '../../../../../protocols/segment/isobmff/index.js';
import { hexViewTemplate } from '../../../../components/hex-view.js';
import { buildByteMap } from './view-model.js';

// --- STATE & CONFIG ---
const allIsoTooltipData = getAllIsoTooltipData(); // Fetch the data once
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

// --- HELPERS ---
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
    // Find the deepest child first for the most specific match
    const found = findBox(parsedData.boxes, (box) => {
        return (
            box.offset === offset &&
            (!box.children || box.children.length === 0)
        );
    });
    return (
        found ||
        findBox(parsedData.boxes, (box) => box.offset === offset) ||
        null
    );
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
    <div
        class="p-4 text-center text-sm text-gray-500 h-full flex flex-col justify-center items-center"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
        </svg>
        <p class="font-semibold">Inspector Panel</p>
        <p>
            Select a box from the structure tree or hover over the hex view to
            see details here.
        </p>
    </div>
`;

export const inspectorPanelTemplate = (box, rootData, highlightedField) => {
    if (!box) return placeholderTemplate();
    const boxInfo = allIsoTooltipData[box.type] || {};

    const issuesTemplate =
        box.issues && box.issues.length > 0
            ? html`
                  <div class="p-2 bg-red-900/50 text-red-300 text-xs">
                      <div class="font-bold mb-1">Parsing Issues:</div>
                      <ul class="list-disc pl-5">
                          ${box.issues.map(
                              (issue) =>
                                  html`<li>
                                      [${issue.type}] ${issue.message}
                                  </li>`
                          )}
                      </ul>
                  </div>
              `
            : '';

    const fields = Object.entries(box.details).map(([key, field]) => {
        const highlightClass =
            key === highlightedField ? 'bg-purple-900/50' : '';
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
        ${issuesTemplate}
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

// --- TEMPLATES ---
const renderBoxNode = (box) => {
    if (box.isChunk) {
        return html`
            <details class="text-sm" open>
                <summary
                    class="cursor-pointer p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 border-l-4 ${box
                        .color?.border}"
                    data-group-start-offset="${box.offset}"
                >
                    <strong class="font-mono text-gray-300">${box.type}</strong>
                    <span class="text-xs text-gray-500"
                        >@${box.offset}, ${box.size}b</span
                    >
                </summary>
                <div class="pl-4 border-l border-gray-700 ml-[7px]">
                    ${box.children.map(renderBoxNode)}
                </div>
            </details>
        `;
    }
    return html`
        <details class="text-sm" open>
            <summary
                class="cursor-pointer p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 border-l-4 ${box
                    .color?.border || 'border-transparent'}"
                data-box-offset="${box.offset}"
            >
                ${box.issues && box.issues.length > 0
                    ? html`<span
                          class="text-yellow-400"
                          title="${box.issues
                              .map((i) => `[${i.type}] ${i.message}`)
                              .join('\n')}"
                          >⚠️</span
                      >`
                    : ''}
                <strong class="font-mono">${box.type}</strong>
                <span class="text-xs text-gray-500"
                    >@${box.offset}, ${box.size}b</span
                >
            </summary>
            ${box.children && box.children.length > 0
                ? html`
                      <div class="pl-4 border-l border-gray-700 ml-[7px]">
                          ${box.children.map(renderBoxNode)}
                      </div>
                  `
                : ''}
        </details>
    `;
};

const treeViewTemplate = (boxes) => {
    const groupedBoxes = groupboxesIntoChunks(boxes || []);
    return html`
        <div>
            <h4 class="text-base font-bold text-gray-300 mb-2">
                Box Structure
            </h4>
            <div
                class="box-tree-area bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto"
            >
                ${groupedBoxes.map(renderBoxNode)}
            </div>
        </div>
    `;
};

const issuesTemplate = (issues) => {
    if (!issues || issues.length === 0) return html``;
    return html`
        <div class="mb-4">
            <h4 class="text-base font-bold text-yellow-400 mb-2">
                Parsing Issues
            </h4>
            <div
                class="bg-yellow-900/50 border border-yellow-700 rounded p-3 text-xs space-y-2"
            >
                ${issues.map(
                    (issue) =>
                        html`<div>
                            <strong class="text-yellow-300"
                                >[${issue.type.toUpperCase()}]</strong
                            >
                            <span class="text-yellow-200"
                                >${issue.message}</span
                            >
                        </div>`
                )}
            </div>
        </div>
    `;
};

export function getInteractiveIsobmffTemplate(
    currentPage,
    bytesPerPage,
    onPageChange,
    allTooltips // New parameter
) {
    const { activeSegmentUrl, segmentCache } = useStore.getState();
    const cachedSegment = segmentCache.get(activeSegmentUrl);
    const parsedSegmentData =
        cachedSegment?.parsedData &&
        cachedSegment.parsedData.format === 'isobmff'
            ? cachedSegment.parsedData.data
            : null;

    if (!parsedSegmentData) {
        return html`<div class="text-yellow-400 p-4">
            Could not parse ISOBMFF data for this segment.
        </div>`;
    }

    const groupedBoxes = groupboxesIntoChunks(parsedSegmentData.boxes || []);
    assignBoxColors(groupedBoxes);
    const byteMap = buildByteMap(groupedBoxes);
    useStore.setState({ activeByteMap: byteMap }); // Store for interaction logic

    return html`
        <div
            class="grid grid-cols-1 lg:grid-cols-[minmax(300px,25%)_1fr] gap-4"
        >
            <div class="sticky top-4 h-max">
                <div class="flex flex-col gap-4">
                    <div
                        class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-[24rem] overflow-hidden flex flex-col"
                    >
                        <!-- Inspector content is rendered here by interaction-logic.js -->
                    </div>
                    ${issuesTemplate(parsedSegmentData.issues)}
                    ${treeViewTemplate(parsedSegmentData.boxes)}
                </div>
            </div>

            <div>
                ${hexViewTemplate(
                    cachedSegment.data,
                    byteMap,
                    currentPage,
                    bytesPerPage,
                    onPageChange,
                    allTooltips // Pass new parameter
                )}
            </div>
        </div>
    `;
}
