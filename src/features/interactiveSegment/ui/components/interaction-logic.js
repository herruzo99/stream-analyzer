import { inspectorPanelTemplate as isobmffInspector } from './isobmff/index.js';
import { inspectorPanelTemplate as tsInspector } from './ts/index.js';
import { html } from 'lit-html';
import { uiActions } from '@/state/uiStore';
import { renderApp } from '@/ui/shell/mainRenderer';

let mainContainer = null;
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
            'is-inspector-field-highlighted'
        );
    });
    currentlyHighlightedElements = [];
}

function applyHighlights(item, fieldName) {
    if (!item || !mainContainer) return;
    const container = mainContainer;

    // --- Highlight structure tree node ---
    if (!item.isSample) {
        const highlightSelector = `[data-box-offset="${item.offset}"], [data-packet-offset="${item.offset}"], [data-group-start-offset="${item.offset}"]`;
        const structureNode = container.querySelector(highlightSelector);
        if (structureNode) {
            structureNode.classList.add('is-box-hover-highlighted');
            currentlyHighlightedElements.push(structureNode);
            const treeContainer = container.querySelector(
                '.structure-content-area'
            );
            if (treeContainer) {
                scrollIntoViewIfNeeded(structureNode, treeContainer);
            }
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
    const hexContentGrid = mainContainer.querySelector('#hex-grid-content');
    if (!hexContentGrid) return;

    const visibleByteElements =
        hexContentGrid.querySelectorAll('[data-byte-offset]');

    visibleByteElements.forEach((el) => {
        const byteOffset = parseInt(
            /** @type {HTMLElement} */ (el).dataset.byteOffset,
            10
        );

        // Apply box highlight first.
        if (byteOffset >= boxStart && byteOffset < boxEnd) {
            el.classList.add('is-box-hover-highlighted');
            currentlyHighlightedElements.push(el);
        }

        // Apply field highlight on top if applicable. CSS will ensure it's visually dominant.
        if (
            fieldStart !== -1 &&
            byteOffset >= fieldStart &&
            byteOffset < fieldEnd
        ) {
            el.classList.add('is-field-hover-highlighted');
            currentlyHighlightedElements.push(el);
        }
    });
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
    const container = dom.mainContent;
    if (!container) return;

    cleanupEventListeners(container);
    selectedItem = null;
    highlightedItem = null;
    highlightedField = null;
    inspectorContainer = null;
    currentFormat = null;
    rootParsedData = null;
    mainContainer = null;
}

export function initializeSegmentViewInteractivity(
    dom,
    parsedSegmentData,
    byteMap,
    findDataByOffset,
    format
) {
    mainContainer = dom.mainContent;
    const container = mainContainer;
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

        // Trigger a full re-render instead of an imperative one.
        renderApp();

        setTimeout(() => {
            if (inspectorContainer && field && item) {
                const fieldRow = inspectorContainer.querySelector(
                    `[data-inspector-offset="${item.offset}"][data-field-name="${field}"]`
                );
                if (fieldRow) {
                    scrollIntoViewIfNeeded(fieldRow, inspectorContainer);
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

        // Trigger a full re-render instead of an imperative one.
        renderApp();

        if (window.innerWidth < 1024 && selectedItem) {
            uiActions.setInteractiveSegmentActiveTab('hex');
        }
    };

    const handleHexHover = (e) => {
        const target = /** @type {HTMLElement | null} */ (
            e.target.closest('[data-byte-offset]')
        );
        if (!target) return;
        const byteOffset = parseInt(target.dataset.byteOffset, 10);
        const mapEntry = byteMap.get(byteOffset);

        if (mapEntry) {
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
        if (!fieldRow) return;

        const fieldName = fieldRow.dataset.fieldName;
        const dataOffset = parseInt(fieldRow.dataset.inspectorOffset, 10);
        if (isNaN(dataOffset)) return;

        const item = findDataByOffset(parsedSegmentData, dataOffset);
        if (item) {
            handleHover(item, fieldName);
        }
    };

    const handleStructureHover = (e) => {
        const node = /** @type {HTMLElement | null} */ (
            e.target.closest(
                '[data-box-offset], [data-group-start-offset], [data-packet-offset]'
            )
        );
        if (!node) return;
        const dataOffset = parseInt(
            node.dataset.boxOffset ||
                node.dataset.groupStartOffset ||
                node.dataset.packetOffset,
            10
        );
        if (isNaN(dataOffset)) return;
        const item = findDataByOffset(parsedSegmentData, dataOffset);
        const fieldName = 'Box Header'; // Generic for structure hover
        if (item) handleHover(item, fieldName);
    };

    const delegatedMouseOver = (e) => {
        if (e.target.closest('.segment-inspector-panel'))
            handleInspectorHover(e);
        else if (e.target.closest('.structure-content-area'))
            handleStructureHover(e);
        else if (e.target.closest('#hex-grid-content')) handleHexHover(e);
    };

    const delegatedMouseOut = (e) => {
        const relatedTarget = /** @type {Node | null} */ (e.relatedTarget);
        const currentTarget = /** @type {Node} */ (e.currentTarget);
        if (relatedTarget && currentTarget.contains(relatedTarget)) {
            const isStillOnInteractive = /** @type {HTMLElement} */ (
                relatedTarget
            ).closest(
                '.segment-inspector-panel, .structure-content-area, #hex-grid-content'
            );
            if (isStillOnInteractive) {
                return;
            }
        }
        handleHover(null, null);
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
                parseInt(treeNode.dataset.boxOffset, 10) ||
                parseInt(treeNode.dataset.packetOffset, 10) ||
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
