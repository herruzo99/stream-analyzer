import { eventBus } from '@/application/event-bus';

let mainContainer = null;
let keydownListener = null;
let containerListeners = new Map();
let hoverDebounceTimeout = null;
let offsetToBoxMap = new Map();
let activeBoxLayout = null; // Reference to the Float64Array

const HOVER_DEBOUNCE_MS = 20;

// Builds a reverse lookup map: Box Offset -> Box Object
function buildOffsetMap(boxes) {
    if (!boxes) return;
    for (const box of boxes) {
        offsetToBoxMap.set(box.offset, box);
        if (box.children) buildOffsetMap(box.children);
    }
}

/**
 * Finds the most specific (deepest) box at a given byte offset using the layout array.
 */
function findBoxIdAtOffset(byteOffset, layout) {
    if (!layout) return -1;

    const STRIDE = 6; // [start, end, color, id, depth, parent]
    const count = layout.length / STRIDE;

    // Binary Search
    let low = 0;
    let high = count;
    while (low < high) {
        const mid = (low + high) >>> 1;
        if (layout[mid * STRIDE] <= byteOffset) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    // Scan backwards to find the deepest child that contains the offset
    for (let i = low - 1; i >= 0; i--) {
        const base = i * STRIDE;
        const start = layout[base];
        const end = layout[base + 1];

        if (byteOffset >= start && byteOffset < end) {
            return layout[base + 3]; // Return ID (offset)
        }
    }

    return -1;
}

export function cleanupSegmentViewInteractivity(dom) {
    const container = dom.mainContent;

    // 1. Remove Listeners (Fast)
    if (hoverDebounceTimeout) {
        clearTimeout(hoverDebounceTimeout);
        hoverDebounceTimeout = null;
    }
    if (keydownListener) {
        document.removeEventListener('keydown', keydownListener);
        keydownListener = null;
    }
    if (container && containerListeners.has(container)) {
        const l = containerListeners.get(container);
        container.removeEventListener('mouseover', l.delegatedMouseOver);
        container.removeEventListener('mouseout', l.delegatedMouseOut);
        container.removeEventListener('click', l.handleClick);
        containerListeners.delete(container);
    }

    // 2. Dereference Data (O(1))
    // Avoid .clear() on massive maps, just let GC handle it
    offsetToBoxMap = new Map();

    activeBoxLayout = null;
    mainContainer = null;
}

export function initializeSegmentViewInteractivity(
    dom,
    parsedSegmentData,
    byteMapData,
    findDataByOffset,
    format
) {
    mainContainer = dom.mainContent;
    const container = mainContainer;
    if (!container || !parsedSegmentData) return;

    cleanupSegmentViewInteractivity(dom);

    activeBoxLayout = byteMapData?.boxLayout;

    if (parsedSegmentData.data.boxes) {
        buildOffsetMap(parsedSegmentData.data.boxes);
    }

    const handleHover = (item, field) => {
        if (hoverDebounceTimeout) clearTimeout(hoverDebounceTimeout);
        hoverDebounceTimeout = setTimeout(() => {
            eventBus.dispatch('ui:interactive-segment:item-hovered', {
                item,
                field,
            });
        }, HOVER_DEBOUNCE_MS);
    };

    const handleSelection = (item) => {
        if (item) {
            eventBus.dispatch('ui:interactive-segment:item-clicked', { item });
        }
        if (hoverDebounceTimeout) clearTimeout(hoverDebounceTimeout);
    };

    // Hex Hover
    const handleHexHover = (e) => {
        const target = e.target.closest('[data-byte-offset]');
        if (!target) return;
        const byteOffset = parseInt(target.dataset.byteOffset, 10);

        // TS Mode
        if (byteMapData?.packetMap) {
            const TS_SIZE = 188;
            const packetIdx = Math.floor(byteOffset / TS_SIZE);
            const packet = parsedSegmentData.data.packets[packetIdx];
            if (packet) handleHover(packet, null);
            return;
        }

        // ISOBMFF Mode
        if (activeBoxLayout) {
            const boxOffset = findBoxIdAtOffset(byteOffset, activeBoxLayout);
            if (boxOffset !== -1) {
                const box = offsetToBoxMap.get(boxOffset);
                if (box) handleHover(box, null);
            }
        }
    };

    const handleStructureHover = (e) => {
        const node = e.target.closest('[data-box-offset]');
        if (!node) return;
        const offset = parseInt(node.dataset.boxOffset, 10);
        const box = offsetToBoxMap.get(offset);
        if (box) handleHover(box, 'Box Header');
    };

    const delegatedMouseOver = (e) => {
        if (e.target.closest('.structure-tree-panel')) handleStructureHover(e);
        else if (e.target.closest('#hex-grid-content')) handleHexHover(e);
    };

    const delegatedMouseOut = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            eventBus.dispatch('ui:interactive-segment:item-unhovered');
        }
    };

    const handleClick = (e) => {
        // Hex Click
        const hexNode = e.target.closest('[data-byte-offset]');
        if (hexNode) {
            const byteOffset = parseInt(hexNode.dataset.byteOffset, 10);

            if (byteMapData?.packetMap) {
                const TS_SIZE = 188;
                const packetIdx = Math.floor(byteOffset / TS_SIZE);
                const packet = parsedSegmentData.data.packets[packetIdx];
                if (packet) handleSelection(packet);
                return;
            }

            if (activeBoxLayout) {
                const boxOffset = findBoxIdAtOffset(
                    byteOffset,
                    activeBoxLayout
                );
                if (boxOffset !== -1) {
                    const box = offsetToBoxMap.get(boxOffset);
                    if (box) handleSelection(box);
                }
            }
            return;
        }

        // Tree Click
        const treeNode = e.target.closest('[data-box-offset]');
        if (treeNode) {
            const offset = parseInt(treeNode.dataset.boxOffset, 10);
            const box = offsetToBoxMap.get(offset);
            if (box) handleSelection(box);
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
        if (e.key === 'Escape') {
            eventBus.dispatch('ui:interactive-segment:item-clicked', {
                item: null,
            });
        }
    };
    document.addEventListener('keydown', keydownListener);
}
