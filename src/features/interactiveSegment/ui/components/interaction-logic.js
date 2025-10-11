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

// --- UTILITY ---
function scrollIntoViewIfNeeded(element, container) {
    if (!element || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    if (elementRect.top < containerRect.top) {
        container.scrollTop += elementRect.top - containerRect.top;
    } else if (elementRect.bottom > containerRect.bottom) {
        container.scrollTop += elementRect.bottom - containerRect.bottom;
    }
}

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
            'is-field-hover-highlighted',
            'bg-purple-500/20'
        );
    });
    currentlyHighlightedElements = [];
}

function applyHighlights(item, fieldName) {
    if (!item) return;
    const container = document.getElementById('tab-interactive-segment');
    if (!container) return;

    // --- Highlight structure tree node ---
    if (!item.isSample) {
        const highlightSelector = `[data-box-offset="${item.offset}"], [data-packet-offset="${item.offset}"], [data-group-start-offset="${item.offset}"]`;
        const structureNode = container.querySelector(highlightSelector);
        if (structureNode) {
            structureNode.classList.add('is-box-hover-highlighted');
            currentlyHighlightedElements.push(structureNode);
            const treeContainer = container.querySelector(
                '.box-tree-area .overflow-y-auto'
            );
            scrollIntoViewIfNeeded(structureNode, treeContainer);
        }
    }

    // --- Determine byte ranges for hex view ---
    let boxStart, boxEnd, fieldStart, fieldEnd;
    boxStart = item.offset;
    boxEnd = item.offset + item.size;

    if (fieldName && item.details?.[fieldName]) {
        const fieldMeta = item.details[fieldName];
        fieldStart = fieldMeta.offset;
        fieldEnd = fieldStart + Math.ceil(fieldMeta.length);
    } else {
        fieldStart = -1;
        fieldEnd = -1;
    }

    // --- Apply highlights to hex view ---
    const visibleByteElements =
        container.querySelectorAll('[data-byte-offset]');
    visibleByteElements.forEach((el) => {
        const byteOffset = parseInt(
            /** @type {HTMLElement} */ (el).dataset.byteOffset,
            10
        );

        if (byteOffset >= boxStart && byteOffset < boxEnd) {
            el.classList.add('is-box-hover-highlighted');
            currentlyHighlightedElements.push(el);
        }

        if (
            fieldStart !== -1 &&
            byteOffset >= fieldStart &&
            byteOffset < fieldEnd
        ) {
            el.classList.add('is-field-hover-highlighted');
            if (!currentlyHighlightedElements.includes(el)) {
                currentlyHighlightedElements.push(el);
            }
        }
    });
}

export function renderInspectorPanel() {
    if (!inspectorContainer) return;
    let template;
    if (currentFormat === 'isobmff') {
        template = isobmffInspector(rootParsedData.data);
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

        setTimeout(() => {
            const inspector = document.querySelector(
                '.segment-inspector-panel'
            );
            if (inspector && field) {
                const fieldRow = inspector.querySelector(
                    `[data-field-name="${field}"]`
                );
                if (fieldRow) {
                    scrollIntoViewIfNeeded(fieldRow, inspector);
                }
            }
        }, 0);
    };

    const handleSelection = (targetOffset) => {
        if (selectedItem && selectedItem.offset === targetOffset) {
            selectedItem = null; // Deselect
        } else {
            selectedItem = findDataByOffset(parsedSegmentData, targetOffset);
        }
        highlightedItem = selectedItem;
        highlightedField = null; // Clear field highlight on selection
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
            // **BUG FIX**: Prioritize the most specific item (sample).
            if (mapEntry.sample) {
                handleHover(mapEntry.sample, 'Sample Data');
            } else if (mapEntry.box || mapEntry.packet) {
                handleHover(
                    mapEntry.box || mapEntry.packet,
                    mapEntry.fieldName
                );
            }
        }
    };

    const handleInspectorHover = (e) => {
        const fieldRow = /** @type {HTMLElement | null} */ (
            e.target.closest('[data-field-name]')
        );
        clearHighlights(); // Clear all previous highlights first

        if (!fieldRow) {
            highlightedField = null;
            renderInspectorPanel();
            return;
        }

        const fieldName = fieldRow.dataset.fieldName;
        highlightedField = fieldName;

        fieldRow.classList.add('bg-purple-500/20');
        currentlyHighlightedElements.push(fieldRow);

        const dataOffset = parseInt(fieldRow.dataset.inspectorOffset, 10);
        if (isNaN(dataOffset)) return;

        const item = findDataByOffset(parsedSegmentData, dataOffset);
        if (item && item.details && item.details[fieldName]) {
            applyHighlights(item, fieldName);
        }
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
        const fieldName = 'Box Header'; // Always highlight header on tree hover
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

        const treeNode = /** @type {HTMLElement | null} */ (
            target.closest(
                '[data-box-offset], [data-packet-offset], [data-group-start-offset]'
            )
        );
        if (treeNode) {
            const offset =
                parseInt(treeNode.dataset.boxOffset, 10) ??
                parseInt(treeNode.dataset.packetOffset, 10) ??
                parseInt(treeNode.dataset.groupStartOffset, 10);
            if (!isNaN(offset)) {
                handleSelection(offset);
            }
            return;
        }

        const hexNode = /** @type {HTMLElement | null} */ (
            target.closest('[data-byte-offset]')
        );
        if (hexNode) {
            const byteOffset = parseInt(hexNode.dataset.byteOffset, 10);
            const mapEntry = byteMap.get(byteOffset);
            if (mapEntry) {
                const itemToSelect =
                    mapEntry.sample || mapEntry.box || mapEntry.packet;
                if (itemToSelect) {
                    handleSelection(itemToSelect.offset);
                }
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