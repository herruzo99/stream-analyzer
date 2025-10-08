import { renderApp } from '@/ui/shell/mainRenderer.js';

let keydownListener = null;
let containerListeners = new Map();

// --- LOCAL MODULE STATE for the inspector panel ---
let selectedItem = null;
let highlightedItem = null;
let highlightedField = null;

export function getInspectorState() {
    return {
        // Return the selected item for stable display, but fall back to hovered item if nothing is selected
        itemForDisplay: selectedItem || highlightedItem,
        fieldForDisplay: highlightedField,
    };
}
// --------------------------------------------------

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
    // Reset local state when view is cleaned up
    selectedItem = null;
    highlightedItem = null;
    highlightedField = null;
}

export function initializeSegmentViewInteractivity(
    dom,
    parsedSegmentData,
    byteMap,
    findDataByOffset
) {
    const container = dom.tabContents['interactive-segment'];
    if (!container || !parsedSegmentData) return;

    cleanupEventListeners(container);

    const handleHover = (item, field) => {
        highlightedItem = item;
        highlightedField = field;
        renderApp();
    };

    const handleSelection = (targetOffset) => {
        if (selectedItem && selectedItem.offset === targetOffset) {
            selectedItem = null; // Deselect
        } else {
            selectedItem = findDataByOffset(parsedSegmentData, targetOffset);
        }
        // Sync highlight with selection
        highlightedItem = selectedItem;
        highlightedField = null; // Clear field highlight on selection change
        renderApp();
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
            return; // Don't fire on mouseout to a child element
        }
        highlightedItem = null;
        highlightedField = null;
        renderApp();
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
