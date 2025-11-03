import { useUiStore } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';

let mainContainer = null;
let keydownListener = null;
let containerListeners = new Map();
let currentFormat = null;
let rootParsedData = null;
let hoverDebounceTimeout = null;

export function getInspectorState() {
    const {
        interactiveSegmentSelectedItem,
        interactiveSegmentHighlightedItem,
    } = useUiStore.getState();
    return {
        itemForDisplay:
            interactiveSegmentSelectedItem?.item ||
            interactiveSegmentHighlightedItem?.item,
        fieldForDisplay: interactiveSegmentHighlightedItem?.field,
    };
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

    if (hoverDebounceTimeout) {
        clearTimeout(hoverDebounceTimeout);
        hoverDebounceTimeout = null;
    }

    cleanupEventListeners(container);
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
    currentFormat = format;
    rootParsedData = parsedSegmentData;

    const handleHover = (item, field) => {
        if (hoverDebounceTimeout) {
            clearTimeout(hoverDebounceTimeout);
        }
        hoverDebounceTimeout = setTimeout(() => {
            eventBus.dispatch('ui:interactive-segment:item-hovered', {
                item,
                field,
            });
        }, 10);
    };

    const handleSelection = (targetOffset) => {
        const item = findDataByOffset(rootParsedData, targetOffset);
        eventBus.dispatch('ui:interactive-segment:item-clicked', { item });
        if (hoverDebounceTimeout) clearTimeout(hoverDebounceTimeout);
        eventBus.dispatch('ui:interactive-segment:item-unhovered');
    };

    const handleHexHover = (e) => {
        const target = e.target.closest('[data-byte-offset]');
        if (!target) return;
        const byteOffset = parseInt(target.dataset.byteOffset, 10);
        const mapEntry = byteMap.get(byteOffset);

        if (mapEntry) {
            handleHover(
                mapEntry.box || mapEntry.packet || mapEntry.sample,
                mapEntry.fieldName
            );
        }
    };

    const handleInspectorHover = (e) => {
        const fieldRow = e.target.closest('[data-field-name]');
        if (!fieldRow) return;
        const fieldName = fieldRow.dataset.fieldName;
        const dataOffset = parseInt(fieldRow.dataset.boxOffset, 10);
        const item = findDataByOffset(parsedSegmentData, dataOffset);
        if (item) handleHover(item, fieldName);
    };

    const handleStructureHover = (e) => {
        const node = e.target.closest(
            '[data-box-offset], [data-packet-offset]'
        );
        if (!node) return;
        const dataOffset = parseInt(
            node.dataset.boxOffset || node.dataset.packetOffset,
            10
        );
        const item = findDataByOffset(parsedSegmentData, dataOffset);
        if (item) handleHover(item, 'Box Header');
    };

    const delegatedMouseOver = (e) => {
        if (e.target.closest('.segment-inspector-panel'))
            handleInspectorHover(e);
        else if (e.target.closest('.structure-tree-panel'))
            handleStructureHover(e);
        else if (e.target.closest('#hex-grid-content')) handleHexHover(e);
    };

    const delegatedMouseOut = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            if (hoverDebounceTimeout) {
                clearTimeout(hoverDebounceTimeout);
            }
            eventBus.dispatch('ui:interactive-segment:item-unhovered');
        }
    };

    const handleClick = (e) => {
        const treeNode = e.target.closest(
            '[data-box-offset], [data-packet-offset]'
        );
        if (treeNode) {
            const offset = parseInt(
                treeNode.dataset.boxOffset || treeNode.dataset.packetOffset,
                10
            );
            handleSelection(offset);
            return;
        }

        const hexNode = e.target.closest('[data-byte-offset]');
        if (hexNode) {
            const byteOffset = parseInt(hexNode.dataset.byteOffset, 10);
            const mapEntry = byteMap.get(byteOffset);
            if (mapEntry) {
                const itemToSelect =
                    mapEntry.box || mapEntry.packet || mapEntry.sample;
                if (itemToSelect) handleSelection(itemToSelect.offset);
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
        const { interactiveSegmentSelectedItem } = useUiStore.getState();
        if (e.key === 'Escape' && interactiveSegmentSelectedItem) {
            eventBus.dispatch('ui:interactive-segment:item-clicked', {
                item: interactiveSegmentSelectedItem.item,
            });
        }
    };
    document.addEventListener('keydown', keydownListener);
}
