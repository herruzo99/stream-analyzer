import { html } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { useUiStore } from '@/state/uiStore';
import { getTooltipData as getAllIsoTooltipData } from '@/infrastructure/parsing/isobmff/index';
import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { entriesTableTemplate } from '@/ui/shared/isobmff-renderer';

const allIsoTooltipData = getAllIsoTooltipData();

/**
 * Recursively finds the first occurrence of a box that satisfies the predicate.
 * @param {import('@/types.js').Box[]} boxes
 * @param {string | ((box: import('@/types.js').Box) => boolean)} predicateOrType
 * @returns {import('@/types.js').Box | null}
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

// --- REIMAGINED INSPECTOR PANEL ---
const renderObjectValue = (obj) => {
    if (!obj) {
        return html`<span class="text-slate-500">N/A</span>`;
    }
    return html`
        <div class="mt-1 ml-2 pl-2 border-l border-slate-600 space-y-1">
            ${Object.entries(obj).map(
                ([key, value]) => html`
                    <div class="flex text-xs">
                        <span class="text-slate-400 mr-2">${key}:</span>
                        <span
                            class="${value ? 'text-green-400' : 'text-red-400'}"
                            >${String(value)}</span
                        >
                    </div>
                `
            )}
        </div>
    `;
};

const inspectorFieldTemplate = (box, key, field) => {
    const fieldInfo = allIsoTooltipData[`${box.type}@${key}`];
    const { interactiveSegmentHighlightedItem } = useUiStore.getState();
    const isFieldHovered =
        interactiveSegmentHighlightedItem?.item?.offset === box.offset &&
        interactiveSegmentHighlightedItem?.field === key;

    const highlightClass = isFieldHovered ? 'highlight-hover-field' : '';

    return html`
        <div
            class="py-2 px-3 border-b border-slate-700/50 ${highlightClass}"
            data-field-name="${key}"
            data-box-offset="${box.offset}"
        >
            <div
                class="text-xs font-semibold text-slate-400 ${fieldInfo?.text
                    ? tooltipTriggerClasses
                    : ''}"
                data-tooltip="${fieldInfo?.text || ''}"
                data-iso="${fieldInfo?.ref || ''}"
            >
                ${key}
            </div>
            <div class="text-sm font-mono text-white mt-1 break-all">
                ${typeof field.value === 'object' && field.value !== null
                    ? renderObjectValue(field.value)
                    : field.value}
            </div>
        </div>
    `;
};

const sampleInspectorTemplate = (sample) => {
    const renderDetailRow = (label, value) => html`
        <div class="py-2 px-3 border-b border-slate-700/50">
            <div class="text-xs font-semibold text-slate-400">${label}</div>
            <div class="text-sm font-mono text-white mt-1 break-all">
                ${value}
            </div>
        </div>
    `;

    return html`
        <div
            class="segment-inspector-panel flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700"
        >
            <div class="p-3 border-b border-slate-700 shrink-0">
                <h4
                    class="font-bold text-lg text-white font-mono flex items-center gap-2"
                >
                    Sample #${sample.index}
                    <span class="text-sm font-normal text-slate-400"
                        >(${sample.size} bytes)</span
                    >
                </h4>
                <p class="text-xs text-slate-300 mt-2">
                    A single unit of media data (e.g., a video frame or chunk of
                    audio).
                </p>
            </div>
            <div class="grow overflow-y-auto">
                ${renderDetailRow('Offset', sample.offset)}
                ${renderDetailRow('Size', `${sample.size} bytes`)}
                ${renderDetailRow(
                    'Duration',
                    `${sample.duration} (timescale units)`
                )}
                ${renderDetailRow(
                    'Composition Time Offset',
                    sample.compositionTimeOffset ?? 'N/A'
                )}
                ${renderDetailRow(
                    'Flags',
                    renderObjectValue(sample.sampleFlags)
                )}
                ${renderDetailRow('Track ID', sample.trackId)}
            </div>
        </div>
    `;
};

export const inspectorPanelTemplate = (parsedData) => {
    const rootData = parsedData.data;
    const {
        interactiveSegmentSelectedItem,
        interactiveSegmentHighlightedItem,
    } = useUiStore.getState();
    const itemForDisplay =
        interactiveSegmentSelectedItem?.item ||
        interactiveSegmentHighlightedItem?.item;

    if (!itemForDisplay) {
        return html`
            <div
                class="flex flex-col h-full items-center justify-center text-center text-slate-500 p-6"
            >
                ${icons.searchCode}
                <p class="mt-2 font-semibold">Select an Item</p>
                <p class="text-sm">
                    Click an item in the structure tree or hover in the hex view
                    to see details.
                </p>
            </div>
        `;
    }

    if (itemForDisplay.isSample) {
        return sampleInspectorTemplate(itemForDisplay);
    }

    const box = itemForDisplay;
    const boxInfo = allIsoTooltipData[box.type] || {};

    const fieldsToRender = Object.entries(box.details).filter(
        ([key, field]) => !field.internal
    );

    let boxForTable = box;
    if (box.type === 'trun') {
        boxForTable = {
            ...box,
            // CRITICAL FIX: The `trun` box's own `samples` array is a raw parse
            // without correct offsets or indices. The canonical, enriched `samples`
            // list lives at the top level of the parsed data structure. We must
            // substitute it here for the table renderer.
            samples: parsedData.samples,
        };
    }

    return html`
        <div
            class="segment-inspector-panel flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700"
        >
            <div class="p-3 border-b border-slate-700 shrink-0">
                <h4
                    class="font-bold text-lg text-white font-mono flex items-center gap-2"
                >
                    ${box.type}
                    <span class="text-sm font-normal text-slate-400"
                        >(${box.size} bytes)</span
                    >
                </h4>
                <p class="text-xs text-emerald-400 font-mono mt-1">
                    ${boxInfo.ref || ''}
                </p>
                <p class="text-xs text-slate-300 mt-2">${boxInfo.text || ''}</p>
            </div>
            <div class="grow overflow-y-auto">
                ${fieldsToRender.map(([key, field]) =>
                    inspectorFieldTemplate(box, key, field)
                )}
                ${entriesTableTemplate(boxForTable)}
            </div>
        </div>
    `;
};

// --- REIMAGINED STRUCTURE TREE ---
const getBoxIcon = (box) => {
    if (box.isChunk) return icons.box;
    const type = box.type.toLowerCase();
    if (['moov', 'trak', 'moof', 'traf', 'stbl', 'minf', 'mdia'].includes(type))
        return icons.folder;
    if (['tkhd', 'mdhd', 'mvhd'].includes(type)) return icons.fileText;
    if (['avc1', 'hvc1', 'mp4a'].includes(type)) return icons.clapperboard;
    if (type.includes('st')) return icons.table;
    if (type === 'pssh') return icons.lockClosed;
    return icons.puzzle;
};

const renderBoxNode = (box) => {
    const {
        interactiveSegmentSelectedItem,
        interactiveSegmentHighlightedItem,
    } = useUiStore.getState();
    const isSelected =
        interactiveSegmentSelectedItem?.item?.offset === box.offset;
    const isHovered =
        interactiveSegmentHighlightedItem?.item?.offset === box.offset;

    const classes = {
        'tree-item': true,
        flex: true,
        'items-center': true,
        'gap-2': true,
        'p-1': true,
        rounded: true,
        'cursor-pointer': true,
        'border-l-4': true,
        [box.color?.border || 'border-slate-700']: true,
        'highlight-select-box': isSelected,
        'highlight-hover-box': isHovered,
    };

    return html`
        <li class="relative">
            <div class=${classMap(classes)} data-box-offset=${box.offset}>
                <span class="text-slate-500 shrink-0 ml-1"
                    >${getBoxIcon(box)}</span
                >
                <span class="font-mono text-sm text-white">${box.type}</span>
                <span class="text-xs text-slate-500 ml-auto"
                    >(${box.size} bytes)</span
                >
            </div>
            ${box.children && box.children.length > 0
                ? html`
                      <ul class="pl-4 border-l border-slate-700 ml-2.5">
                          ${box.children.map(renderBoxNode)}
                      </ul>
                  `
                : ''}
        </li>
    `;
};

export const structureContentTemplate = (isobmffData) => {
    if (!isobmffData) return html``;
    const { boxes } = isobmffData;
    return html`
        <style>
            .tree-item::before {
                content: '';
                position: absolute;
                left: -0.625rem; /* -(pl-4 / 2) - (border / 2) = -1rem/2 - 1px/2 */
                top: 1rem;
                height: 1px;
                width: 0.625rem;
                background-color: #475569; /* slate-600 */
            }
        </style>
        <div
            class="structure-tree-panel rounded-md bg-slate-900 h-full flex flex-col border border-slate-700"
        >
            <h3 class="font-bold p-3 border-b border-slate-700 shrink-0">
                Box Structure
            </h3>
            <div class="p-2 overflow-y-auto grow">
                <ul class="list-none p-0">
                    ${boxes.map(renderBoxNode)}
                </ul>
            </div>
        </div>
    `;
};
