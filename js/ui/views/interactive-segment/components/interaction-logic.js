import { dom } from '../../../../core/state.js';
import { render } from 'lit-html';

let keydownListener = null;
let containerListeners = new Map();

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

export function cleanupSegmentViewInteractivity() {
    const container = dom.tabContents['interactive-segment'];
    if (container) {
        cleanupEventListeners(container);
    }
}

export function initializeSegmentViewInteractivity(
    parsedSegmentData,
    byteMap,
    findDataByOffset,
    createInspectorTemplate
) {
    const container = dom.tabContents['interactive-segment'];
    if (!container || !parsedSegmentData) return;

    cleanupEventListeners(container);

    let selectedDataOffset = null;

    const clearHighlights = (className) => {
        const borderClasses = [
            'border-t',
            'border-b',
            'border-l',
            'border-r',
            'border-yellow-400',
            'border-blue-400',
            '-mt-px',
            '-mb-px',
            '-ml-px',
            '-mr-px',
        ];
        container
            .querySelectorAll(`.${className}`)
            .forEach((el) => el.classList.remove(className, ...borderClasses));
    };

    const applyHighlights = (className, itemToHighlight) => {
        const hexGrid = container.querySelector('#hex-grid-content');
        if (!hexGrid || !itemToHighlight) return;

        const itemStart = itemToHighlight.offset;
        const itemSize = itemToHighlight.size ?? 188; // Default to TS packet size
        const itemEnd = itemStart + itemSize;

        hexGrid.querySelectorAll('[data-byte-offset]').forEach((el) => {
            const byteOffset = parseInt(
                /** @type {HTMLElement} */ (el).dataset.byteOffset,
                10
            );
            if (byteOffset >= itemStart && byteOffset < itemEnd) {
                const mapEntry = byteMap.get(byteOffset);
                if (
                    mapEntry &&
                    (mapEntry.box?.offset === itemStart ||
                        mapEntry.packet?.offset === itemStart)
                ) {
                    el.classList.add(className);
                }
            }
        });

        const treeNode = container.querySelector(
            `[data-box-offset="${itemStart}"], [data-group-start-offset="${itemStart}"]`
        );
        treeNode?.classList.add(className);
    };

    const applyPerimeterHighlight = (
        offsets,
        borderClasses = ['border-yellow-400']
    ) => {
        const hexGrid = container.querySelector('#hex-grid-content');
        if (!hexGrid) return;
        offsets.forEach((i) => {
            const spans = hexGrid.querySelectorAll(`[data-byte-offset="${i}"]`);
            spans?.forEach((span) => {
                span.classList.add('is-field-boundary-highlighted');
                const isTop = !offsets.has(i - 16);
                const isBottom = !offsets.has(i + 16);
                const isLeft = !offsets.has(i - 1) || i % 16 === 0;
                const isRight = !offsets.has(i + 1) || (i + 1) % 16 === 0;

                if (isTop)
                    span.classList.add('border-t', '-mt-px', ...borderClasses);
                if (isBottom)
                    span.classList.add('border-b', '-mb-px', ...borderClasses);
                if (isLeft)
                    span.classList.add('border-l', '-ml-px', ...borderClasses);
                if (isRight)
                    span.classList.add('border-r', '-mr-px', ...borderClasses);
            });
        });
    };

    const handleHexHover = (e) => {
        const target = /** @type {HTMLElement} */ (e.target).closest(
            '[data-byte-offset]'
        );
        if (!target) return;

        const byteOffset = parseInt(
            /** @type {HTMLElement} */ (target).dataset.byteOffset
        );
        const mapEntry = byteMap.get(byteOffset);
        clearHighlights('is-field-highlighted');
        clearHighlights('is-field-boundary-highlighted');

        if (mapEntry) {
            const item = mapEntry.box || mapEntry.packet;
            const fieldName = mapEntry.fieldName;
            applyHighlights('is-field-highlighted', item);
            const field = item.details?.[fieldName];
            if (field && field.offset !== undefined && field.length > 0) {
                const length = Math.ceil(field.length);
                const fieldOffsets = new Set();
                for (let i = field.offset; i < field.offset + length; i++) {
                    fieldOffsets.add(i);
                }
                applyPerimeterHighlight(fieldOffsets);
            }
            if (selectedDataOffset === null) {
                updateInspectorPanel(item, createInspectorTemplate, fieldName);
            }
        }
    };

    const handleInspectorHover = (e) => {
        const fieldRow = /** @type {HTMLElement} */ (e.target).closest(
            '[data-field-name]'
        );
        if (!fieldRow) return;

        const fieldName = /** @type {HTMLElement} */ (fieldRow).dataset
            .fieldName;
        const dataOffset = parseInt(
            /** @type {HTMLElement} */ (fieldRow).dataset.boxOffset ||
                /** @type {HTMLElement} */ (fieldRow).dataset.packetOffset
        );
        if (isNaN(dataOffset)) return;

        clearHighlights('is-inspector-hover-highlighted');
        clearHighlights('is-field-boundary-highlighted');

        const item = findDataByOffset(parsedSegmentData, dataOffset);
        if (!item) return;

        applyHighlights('is-inspector-hover-highlighted', item);
        const field = item.details?.[fieldName];
        if (field && field.offset !== undefined && field.length > 0) {
            const length = Math.ceil(field.length);
            const fieldOffsets = new Set();
            for (let i = field.offset; i < field.offset + length; i++) {
                fieldOffsets.add(i);
            }
            applyPerimeterHighlight(fieldOffsets);
        }
    };

    const handleStructureHover = (e) => {
        clearHighlights('is-field-highlighted');
        const node = /** @type {HTMLElement} */ (e.target).closest(
            '[data-box-offset], [data-group-start-offset]'
        );
        if (!node) return;

        const dataOffset = parseInt(
            /** @type {HTMLElement} */ (node).dataset.boxOffset ||
                /** @type {HTMLElement} */ (node).dataset.groupStartOffset
        );
        if (isNaN(dataOffset)) return;

        const item = findDataByOffset(parsedSegmentData, dataOffset);
        if (item) {
            applyHighlights('is-field-highlighted', item);
            if (selectedDataOffset === null) {
                const defaultField = item.type ? 'Box Header' : 'TS Header';
                updateInspectorPanel(
                    item,
                    createInspectorTemplate,
                    defaultField
                );
            }
        }
    };

    const delegatedMouseOver = (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        if (target.closest('.segment-inspector-panel')) {
            handleInspectorHover(e);
        } else if (target.closest('.box-tree-area, .packet-list-area')) {
            handleStructureHover(e);
        } else if (target.closest('#hex-grid-content')) {
            handleHexHover(e);
        }
    };

    const delegatedMouseOut = (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const relatedTarget = /** @type {HTMLElement} */ (e.relatedTarget);
        if (
            target.closest('#hex-grid-content') &&
            !relatedTarget?.closest('#hex-grid-content')
        ) {
            clearHighlights('is-field-highlighted');
            clearHighlights('is-field-boundary-highlighted');
            if (selectedDataOffset === null)
                updateInspectorPanel(null, createInspectorTemplate);
        }
        if (
            target.closest('.segment-inspector-panel') &&
            !relatedTarget?.closest('.segment-inspector-panel')
        ) {
            clearHighlights('is-inspector-hover-highlighted');
            clearHighlights('is-field-boundary-highlighted');
        }
        if (
            target.closest('.box-tree-area, .packet-list-area') &&
            !relatedTarget?.closest('.box-tree-area, .packet-list-area')
        ) {
            clearHighlights('is-field-highlighted');
        }
    };

    const handleClick = (e) => {
        if (/** @type {HTMLElement} */ (e.target).closest('summary'))
            e.preventDefault();
        const targetNode = /** @type {HTMLElement} */ (e.target).closest(
            '[data-box-offset], [data-packet-offset], [data-group-start-offset]'
        );
        if (targetNode) {
            const offset =
                parseInt(
                    /** @type {HTMLElement} */ (targetNode).dataset.boxOffset
                ) ??
                parseInt(
                    /** @type {HTMLElement} */ (targetNode).dataset.packetOffset
                ) ??
                parseInt(
                    /** @type {HTMLElement} */ (targetNode).dataset
                        .groupStartOffset
                );
            handleSelection(offset);
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
        if (e.key === 'Escape' && selectedDataOffset !== null) {
            handleSelection(selectedDataOffset); // Deselect
        }
    };
    document.addEventListener('keydown', keydownListener);

    const handleSelection = (targetOffset) => {
        if (selectedDataOffset === targetOffset) {
            selectedDataOffset = null;
        } else {
            selectedDataOffset = targetOffset;
        }
        applySelectionHighlight();
        const data = findDataByOffset(parsedSegmentData, selectedDataOffset);
        updateInspectorPanel(data, createInspectorTemplate);
    };

    function applySelectionHighlight() {
        clearHighlights('is-highlighted');
        if (selectedDataOffset === null) return;
        const data = findDataByOffset(parsedSegmentData, selectedDataOffset);
        if (!data) return;
        applyHighlights('is-highlighted', data);
    }

    function updateInspectorPanel(data, templateFn, highlightedField = null) {
        const inspector = /** @type {HTMLElement} */ (
            container.querySelector('.segment-inspector-panel')
        );
        if (!inspector) return;
        render(
            templateFn(data, parsedSegmentData, highlightedField),
            inspector
        );
        inspector.classList.remove('opacity-0');
        inspector
            .querySelectorAll('.bg-purple-900\\/50')
            .forEach((el) => el.classList.remove('bg-purple-900/50'));
        if (data && highlightedField) {
            const fieldRow = inspector.querySelector(
                `[data-field-name="${highlightedField}"]`
            );
            if (fieldRow) {
                fieldRow.classList.add('bg-purple-900/50');
                fieldRow.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    updateInspectorPanel(null, createInspectorTemplate);
}
