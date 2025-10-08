import { render } from 'lit-html';
import { inspectorPanelTemplate as isobmffInspector } from './isobmff/index.js';
import { inspectorPanelTemplate as tsInspector } from './ts/index.js';
import { html } from 'lit-html';

let keydownListener = null;
let containerListeners = new Map();
let currentlyHighlightedElements = [];
let inspectorContainer = null;
let currentFormat = null;
let rootParsedData = null;

// --- LOCAL MODULE STATE for the inspector panel ---
let selectedItem = null;
let highlightedItem = null;
let highlightedField = null;

export function getInspectorState() {
    return {
        itemForDisplay: selectedItem || highlightedItem,
        fieldForDisplay: highlightedField,
    };
}
// --------------------------------------------------

function clearHighlights() {
    currentlyHighlightedElements.forEach((el) => {
        el.classList.remove(
            'is-box-hover-highlighted',
            'is-field-hover-highlighted'
        );
    });
    currentlyHighlightedElements = [];
}

function applyHighlights(item, fieldName) {
    if (!item) return;
    const container = document.getElementById('tab-interactive-segment');
    if (!container) return;

    // Highlight structure tree node
    const structureNode = container.querySelector(
        `[data-box-offset="${item.offset}"], [data-packet-offset="${item.offset}"], [data-group-start-offset="${item.offset}"]`
    );
    if (structureNode) {
        structureNode.classList.add('is-box-hover-highlighted');
        currentlyHighlightedElements.push(structureNode);
    }

    // --- OPTIMIZED HIGHLIGHTING LOGIC ---
    const boxStart = item.offset;
    const boxEnd = boxStart + item.size;

    let fieldStart = -1;
    let fieldEnd = -1;

    if (fieldName && item.details?.[fieldName]) {
        const fieldMeta = item.details[fieldName];
        fieldStart = fieldMeta.offset;
        fieldEnd = fieldStart + Math.ceil(fieldMeta.length);
    }

    // Perform a single query for all visible byte elements.
    const visibleByteElements = container.querySelectorAll(
        '[data-byte-offset]'
    );

    // Iterate over the small, fixed-size list of visible elements.
    visibleByteElements.forEach((el) => {
        const byteOffset = parseInt(
            (/** @type {HTMLElement} */ (el)).dataset.byteOffset,
            10
        );

        // Check if the byte is within the box's range.
        if (byteOffset >= boxStart && byteOffset < boxEnd) {
            el.classList.add('is-box-hover-highlighted');
            currentlyHighlightedElements.push(el);

            // If a specific field is being highlighted, apply the field highlight.
            if (
                fieldStart !== -1 &&
                byteOffset >= fieldStart &&
                byteOffset < fieldEnd
            ) {
                el.classList.add('is-field-hover-highlighted');
                // The field highlight might not have been added to the list yet if it's the same as the box highlight.
                if (!currentlyHighlightedElements.includes(el)) {
                    currentlyHighlightedElements.push(el);
                }
            }
        }
    });
}

export function renderInspectorPanel() {
    if (!inspectorContainer) return;
    let template;
    if (currentFormat === 'isobmff') {
        template = isobmffInspector(rootParsedData);
    } else if (currentFormat === 'ts') {
        template = tsInspector();
    } else {
        template = html``;
    }
    render(template, inspectorContainer);
}

function cleanupEventListeners(container) {
    if (keydownListener) {
        document.removeEventListener('keydown', keydownListener);
        keydownListener = null;
    }
    const listeners = containerListeners.get(container);
    if (listeners) {
        container.removeEventListener(
            'mouseover',
            listeners.delegatedMouseOver
        );
        container.removeEventListener('mouseout', listeners.delegatedMouseOut);
        container.removeEventListener('click', listeners.handleClick);
        containerListeners.delete(container);
    }
}

export function cleanupSegmentViewInteractivity(dom) {
    const container = dom.tabContents['interactive-segment'];
    if (container) {
        cleanupEventListeners(container);
    }
    selectedItem = null;
    highlightedItem = null;
    highlightedField = null;
    inspectorContainer = null;
    currentFormat = null;
    rootParsedData = null;
}

export function initializeSegmentViewInteractivity(
    dom,
    parsedSegmentData,
    byteMap,
    findDataByOffset,
    format
) {
    const container = dom.tabContents['interactive-segment'];
    if (!container || !parsedSegmentData) return;

    cleanupEventListeners(container);
    inspectorContainer = container.querySelector('.segment-inspector-panel');
    currentFormat = format;
    rootParsedData = parsedSegmentData;

    const handleHover = (item, field) => {
        highlightedItem = item;
        highlightedField = field;
        clearHighlights();
        applyHighlights(item, field);
        renderInspectorPanel();
    };

    const handleSelection = (targetOffset) => {
        if (selectedItem && selectedItem.offset === targetOffset) {
            selectedItem = null; // Deselect
        } else {
            selectedItem = findDataByOffset(parsedSegmentData, targetOffset);
        }
        highlightedItem = selectedItem;
        highlightedField = null;
        clearHighlights();
        if (selectedItem) {
            applyHighlights(selectedItem, null);
        }
        renderInspectorPanel();
    };

    const handleHexHover = (e) => {
        const target = /** @type {HTMLElement | null} */ (
            e.target.closest('[data-byte-offset]')
        );
        if (!target) return;
        const byteOffset = parseInt(target.dataset.byteOffset, 10);
        const mapEntry = byteMap.get(byteOffset);
        if (mapEntry) {
            handleHover(mapEntry.box || mapEntry.packet, mapEntry.fieldName);
        }
    };

    const handleInspectorHover = (e) => {
        const fieldRow = /** @type {HTMLElement | null} */ (
            e.target.closest('[data-field-name]')
        );
        if (!fieldRow) return;
        const fieldName = fieldRow.dataset.fieldName;
        const dataOffset = parseInt(
            fieldRow.dataset.boxOffset || fieldRow.dataset.packetOffset,
            10
        );
        if (isNaN(dataOffset)) return;
        const item = findDataByOffset(parsedSegmentData, dataOffset);
        if (item) handleHover(item, fieldName);
    };

    const handleStructureHover = (e) => {
        const node = /** @type {HTMLElement | null} */ (
            e.target.closest('[data-box-offset], [data-group-start-offset]')
        );
        if (!node) return;
        const dataOffset = parseInt(
            node.dataset.boxOffset || node.dataset.groupStartOffset,
            10
        );
        if (isNaN(dataOffset)) return;
        const item = findDataByOffset(parsedSegmentData, dataOffset);
        const fieldName =
            item?.type === 'CMAF Chunk'
                ? 'Chunk'
                : item?.type
                  ? 'Box Header'
                  : 'TS Header';
        if (item) handleHover(item, fieldName);
    };

    const delegatedMouseOver = (e) => {
        if (e.target.closest('.segment-inspector-panel'))
            handleInspectorHover(e);
        else if (e.target.closest('.box-tree-area, .packet-list-area'))
            handleStructureHover(e);
        else if (e.target.closest('#hex-grid-content')) handleHexHover(e);
    };

    const delegatedMouseOut = (e) => {
        const relatedTarget = /** @type {Node | null} */ (e.relatedTarget);
        const currentTarget = /** @type {Node} */ (e.currentTarget);
        if (relatedTarget && currentTarget.contains(relatedTarget)) {
            return;
        }
        highlightedItem = null;
        highlightedField = null;
        clearHighlights();
        renderInspectorPanel();
    };

    const handleClick = (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        if (target.closest('summary')) e.preventDefault();
        const targetNode = /** @type {HTMLElement | null} */ (
            target.closest(
                '[data-box-offset], [data-packet-offset], [data-group-start-offset]'
            )
        );
        if (targetNode) {
            const offset =
                parseInt(targetNode.dataset.boxOffset, 10) ??
                parseInt(targetNode.dataset.packetOffset, 10) ??
                parseInt(targetNode.dataset.groupStartOffset, 10);
            if (!isNaN(offset)) {
                handleSelection(offset);
            }
        }
    };

    container.addEventListener('mouseover', delegatedMouseOver);
    container.addEventListener('mouseout', delegatedMouseOut);
    container.addEventListener('click', handleClick);
    containerListeners.set(container, {
        delegatedMouseOver,
        delegatedMouseOut,
        handleClick,
    });

    keydownListener = (e) => {
        if (e.key === 'Escape' && selectedItem !== null) {
            handleSelection(selectedItem.offset); // Deselect
        }
    };
    document.addEventListener('keydown', keydownListener);
}