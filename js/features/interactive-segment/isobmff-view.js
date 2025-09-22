import { html, render } from 'lit-html';
import { analysisState, dom } from '../../core/state.js';
import { getTooltipData } from '../segment-analysis/isobmff-parser.js';
import { hexViewTemplate } from './hex-view.js';

// --- STATE & CONFIG ---
let hexCurrentPage = 1;
const BYTES_PER_PAGE = 1024; // 1KB per page
let parsedSegmentData = null; // Cache parsed data for the view
const boxTooltipData = getTooltipData(); // Get all box/field tooltips
let selectedBoxOffset = null;
let keydownListener = null;

// --- INTERACTIVITY & HELPERS ---

function findBoxByOffset(boxes, offset) {
    for (const box of boxes) {
        if (box.offset === offset) {
            return box;
        }
        if (box.children && box.children.length > 0) {
            const foundInChild = findBoxByOffset(box.children, offset);
            if (foundInChild) return foundInChild;
        }
    }
    return null;
}

function updateInspectorPanel(box, highlightedField = null) {
    const inspector = dom.tabContents['interactive-segment'].querySelector(
        '.segment-inspector-panel'
    );
    if (!inspector) return;

    if (box) {
        render(
            createInspectorTemplate(box, highlightedField),
            /** @type {HTMLElement} */ (inspector)
        );
        inspector.classList.remove('opacity-0');

        if (highlightedField) {
            const fieldRow = inspector.querySelector(
                `[data-field-name="${highlightedField}"]`
            );
            fieldRow?.scrollIntoView({ block: 'nearest' });
        }
    } else {
        render(html``, /** @type {HTMLElement} */ (inspector)); // Clear the inspector
        inspector.classList.add('opacity-0');
    }
}

function applySelectionHighlight() {
    const container = dom.tabContents['interactive-segment'];
    container
        .querySelectorAll('.is-highlighted')
        .forEach((el) => el.classList.remove('is-highlighted'));
    if (selectedBoxOffset !== null) {
        container
            .querySelectorAll(`[data-box-offset="${selectedBoxOffset}"]`)
            .forEach((el) => {
                el.classList.add('is-highlighted');
            });
    }
}

function initializeSegmentViewInteractivity() {
    const container = dom.tabContents['interactive-segment'];
    if (!container || !parsedSegmentData) return;

    selectedBoxOffset = null;
    if (keydownListener) {
        document.removeEventListener('keydown', keydownListener);
    }
    keydownListener = (e) => {
        if (e.key === 'Escape' && selectedBoxOffset !== null) {
            selectedBoxOffset = null;
            applySelectionHighlight();
            updateInspectorPanel(null); // Clear panel on deselect
        }
    };
    document.addEventListener('keydown', keydownListener);

    const handleHover = (e) => {
        const target = /** @type {HTMLElement} */ (e.target).closest(
            '[data-byte-offset]'
        );
        if (!target) return;

        const byteOffset = parseInt(target.dataset.byteOffset);
        const fieldEl = /** @type {HTMLElement} */ (target.closest('[data-field-name]'));
        if (!fieldEl) return;

        const boxOffset = parseInt(fieldEl.dataset.boxOffset);
        const fieldName = fieldEl.dataset.fieldName;

        container
            .querySelectorAll('.is-field-highlighted, .is-char-highlighted')
            .forEach((el) =>
                el.classList.remove(
                    'is-field-highlighted',
                    'is-char-highlighted'
                )
            );

        const charEl = container.querySelector(
            `[data-byte-offset="${byteOffset}"].${CSS.escape(
                baseAsciiClass.split(' ').join('.')
            )}`
        );
        if (charEl) charEl.classList.add('is-char-highlighted');

        if (boxOffset >= 0 && fieldName) {
            container
                .querySelectorAll(
                    `[data-box-offset="${boxOffset}"][data-field-name="${fieldName}"]`
                )
                .forEach((el) => {
                    el.classList.add('is-field-highlighted');
                });
            container
                .querySelectorAll(
                    `[data-box-offset="${boxOffset}"][data-field-name="tree-view"]`
                )
                .forEach((el) => {
                    el.classList.add('is-field-highlighted');
                });
        }

        if (selectedBoxOffset === null) {
            const box = findBoxByOffset(parsedSegmentData, boxOffset);
            const isReserved =
                fieldName &&
                (fieldName.includes('reserved') ||
                    fieldName.includes('Padding'));
            updateInspectorPanel(box, isReserved ? null : fieldName);
        }
    };

    const handleMouseOut = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            container
                .querySelectorAll(
                    '.is-field-highlighted, .is-char-highlighted'
                )
                .forEach((el) =>
                    el.classList.remove(
                        'is-field-highlighted',
                        'is-char-highlighted'
                    )
                );
        }
    };

    container.addEventListener('mouseover', handleHover);
    container.addEventListener('mouseout', handleMouseOut);

    container.addEventListener('click', (e) => {
        const summary = (/** @type {HTMLElement} */ (e.target)).closest(
            'summary'
        );
        if (summary) {
            e.preventDefault(); // Prevent details toggling
        }

        const targetNode = /** @type {HTMLElement} */ ((e.target)).closest(
            '[data-box-offset]'
        );
        if (!targetNode) return;

        const targetOffset = parseInt(targetNode.dataset.boxOffset);

        if (selectedBoxOffset === targetOffset) {
            selectedBoxOffset = null; // Toggle off
            updateInspectorPanel(null); // Clear panel
        } else {
            selectedBoxOffset = targetOffset; // Select new
            const box = findBoxByOffset(parsedSegmentData, selectedBoxOffset);
            updateInspectorPanel(box); // Lock panel to selected box
        }
        applySelectionHighlight();

        if (targetNode.closest('.box-tree-area')) {
            const hexView = container.querySelector('.hex-viewer-area');
            const targetRowOffset = Math.floor(targetOffset / 16) * 16;
            const rowEl = hexView?.querySelector(
                `[data-row-offset="${targetRowOffset}"]`
            );
            rowEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    if (parsedSegmentData.length > 0) {
        updateInspectorPanel(parsedSegmentData[0]);
    }
}

const createInspectorTemplate = (box, highlightedField) => {
    const boxInfo = boxTooltipData[box.type] || {};

    const fields = Object.entries(box.details).map(([key, field]) => {
        const highlightClass = key === highlightedField ? 'bg-blue-900/50' : '';
        const fieldInfo = boxTooltipData[`${box.type}@${key}`];
        return html`
            <tr class="${highlightClass}" data-field-name="${key}">
                <td
                    class="p-1 pr-2 text-xs text-gray-400 align-top"
                    title="${fieldInfo?.text || ''}"
                >
                    ${key}
                </td>
                <td class="p-1 text-xs font-mono text-white break-all">
                    ${field.value !== undefined
                        ? String(field.value)
                        : 'N/A'}
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
        <div class="overflow-y-auto">
            <table class="w-full table-fixed">
                <colgroup>
                    <col class="w-1/3" />
                    <col class="w-2/3" />
                </colgroup>
                <tbody>
                    ${fields}
                </tbody>
            </table>
        </div>
    `;
};

// --- TEMPLATES ---
const baseAsciiClass =
    'inline-block h-6 leading-6 w-4 text-center align-middle transition-colors duration-150 tracking-tight cursor-pointer';

const renderBoxNode = (box) => html`
    <details class="text-sm" open>
        <summary
            class="cursor-pointer p-1 rounded hover:bg-gray-700/50 flex items-center gap-2 border-l-4 ${box.color
                ?.border || 'border-transparent'}"
            data-box-offset="${box.offset}"
            data-field-name="tree-view"
        >
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

const treeViewTemplate = (parsedData) => html`
    <div>
        <h4 class="text-base font-bold text-gray-300 mb-2">Box Structure</h4>
        <div
            class="box-tree-area bg-gray-900/50 p-2 rounded max-h-[calc(100vh-30rem)] overflow-y-auto"
        >
            ${parsedData.map(renderBoxNode)}
        </div>
    </div>
`;

export function getInteractiveIsobmffTemplate() {
    const { activeSegmentUrl, segmentCache } = analysisState;
    const cachedSegment = segmentCache.get(activeSegmentUrl);

    parsedSegmentData =
        cachedSegment.parsedData && !cachedSegment.parsedData.error
            ? cachedSegment.parsedData
            : null;

    setTimeout(() => initializeSegmentViewInteractivity(), 0);

    const onPageChange = (offset) => {
        const totalPages = Math.ceil(cachedSegment.data.byteLength / BYTES_PER_PAGE);
        const newPage = hexCurrentPage + offset;
        if (newPage >= 1 && newPage <= totalPages) {
            hexCurrentPage = newPage;
            const newContent = getInteractiveIsobmffTemplate();
            render(newContent, dom.tabContents['interactive-segment']);
        }
    };

    return html`
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(300px,25%)_1fr] gap-4">
            <div class="sticky top-4 h-max">
                <div class="flex flex-col gap-4">
                    <div
                        class="segment-inspector-panel rounded-md bg-gray-900/90 border border-gray-700 transition-opacity duration-200 h-96 overflow-hidden flex flex-col"
                    >
                        <!-- Inspector content is rendered here by JS -->
                    </div>
                    ${parsedSegmentData
                        ? treeViewTemplate(parsedSegmentData)
                        : ''}
                </div>
            </div>

            <div class="overflow-auto">
                ${hexViewTemplate(cachedSegment.data, parsedSegmentData, hexCurrentPage, BYTES_PER_PAGE, onPageChange)}
            </div>
        </div>
    `;
}