import { dom } from '../../../../core/dom.js';
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
    createInspectorTemplate,
    visibleStartOffset,
    visibleEndOffset
) {
    const container = dom.tabContents['interactive-segment'];
    if (!container || !parsedSegmentData) return;

    cleanupEventListeners(container);

    let selectedDataOffset = null;

    const clearHighlights = (classNames) => {
        const borderClasses = [
            'border-t',
            'border-b',
            'border-l',
            'border-r',
            'border-t-2',
            'border-b-2',
            'border-l-2',
            'border-r-2',
            'border-purple-400',
            'border-blue-400',
            '-mt-px',
            '-mb-px',
            '-ml-px',
            '-mr-px',
        ];
        const selector = classNames.map((c) => `.${c}`).join(', ');
        if (!selector) return;

        container
            .querySelectorAll(selector)
            .forEach((el) =>
                el.classList.remove(...classNames, ...borderClasses)
            );
    };

    const applyPerimeterBorder = (offsets, borderClass, width = 1) => {
        const hexGrid = container.querySelector('#hex-grid-content');
        if (!hexGrid) return;
        const widthClass = width === 1 ? 'border' : `border-${width}`;
        const marginClass = width === 1 ? 'px' : 'px'; // Tailwind JIT needs full class names

        offsets.forEach((i) => {
            if (i < visibleStartOffset || i >= visibleEndOffset) return;

            const spans = hexGrid.querySelectorAll(`[data-byte-offset="${i}"]`);
            spans?.forEach((span) => {
                const isTop = !offsets.has(i - 16);
                const isBottom = !offsets.has(i + 16);
                const isLeft = !offsets.has(i - 1) || i % 16 === 0;
                const isRight = !offsets.has(i + 1) || (i + 1) % 16 === 0;

                if (isTop)
                    span.classList.add(
                        `border-t-${widthClass}`,
                        `-mt-${marginClass}`,
                        borderClass
                    );
                if (isBottom)
                    span.classList.add(
                        `border-b-${widthClass}`,
                        `-mb-${marginClass}`,
                        borderClass
                    );
                if (isLeft)
                    span.classList.add(
                        `border-l-${widthClass}`,
                        `-ml-${marginClass}`,
                        borderClass
                    );
                if (isRight)
                    span.classList.add(
                        `border-r-${widthClass}`,
                        `-mr-${marginClass}`,
                        borderClass
                    );
            });
        });
    };

    const applyHighlight = (className, offsets) => {
        const hexGrid = container.querySelector('#hex-grid-content');
        if (!hexGrid) return;
        offsets.forEach((i) => {
            if (i >= visibleStartOffset && i < visibleEndOffset) {
                const spans = hexGrid.querySelectorAll(
                    `[data-byte-offset="${i}"]`
                );
                spans.forEach((el) => el.classList.add(className));
            }
        });
    };

    const applyBoxBackgroundHighlight = (className, itemToHighlight) => {
        const itemStart = itemToHighlight.offset;
        const itemEnd = itemStart + (itemToHighlight.size ?? 188);
        const boxOffsets = new Set();

        const loopStart = Math.max(itemStart, visibleStartOffset);
        const loopEnd = Math.min(itemEnd, visibleEndOffset);

        for (let i = loopStart; i < loopEnd; i++) {
            const mapEntry = byteMap.get(i);
            if (
                mapEntry &&
                mapEntry.box &&
                mapEntry.box.offset === itemToHighlight.offset
            ) {
                boxOffsets.add(i);
            }
        }
        applyHighlight(className, boxOffsets);
        return boxOffsets;
    };

    const applyFieldHighlight = (className, itemToHighlight, fieldName) => {
        const field = itemToHighlight.details?.[fieldName];
        if (!field || field.offset === undefined || field.length <= 0) return;

        const fieldStart = field.offset;
        const fieldEnd = fieldStart + Math.ceil(field.length);
        const fieldOffsets = new Set();

        const loopStart = Math.max(fieldStart, visibleStartOffset);
        const loopEnd = Math.min(fieldEnd, visibleEndOffset);

        for (let i = loopStart; i < loopEnd; i++) {
            fieldOffsets.add(i);
        }
        applyHighlight(className, fieldOffsets);
        applyPerimeterBorder(fieldOffsets, 'border-purple-400');
    };

    const handleHover = (item, fieldName) => {
        clearHighlights([
            'is-box-hover-highlighted',
            'is-field-hover-highlighted',
        ]);
        if (item) {
            applyBoxBackgroundHighlight('is-box-hover-highlighted', item);
            applyFieldHighlight('is-field-hover-highlighted', item, fieldName);
        }
        if (selectedDataOffset === null) {
            updateInspectorPanel(item, createInspectorTemplate, fieldName);
        }
    };

    const handleHexHover = (e) => {
        const target = /** @type {HTMLElement | null} */ (
            e.target.closest('[data-byte-offset]')
        );
        if (!target) return;
        const byteOffset = parseInt(target.dataset.byteOffset);
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
            fieldRow.dataset.boxOffset || fieldRow.dataset.packetOffset
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
            node.dataset.boxOffset || node.dataset.groupStartOffset
        );
        if (isNaN(dataOffset)) return;
        const item = findDataByOffset(parsedSegmentData, dataOffset);
        const fieldName = item?.type ? 'Box Header' : 'TS Header';
        if (item) handleHover(item, fieldName);
    };

    const delegatedMouseOver = (e) => {
        if (e.target.closest('.segment-inspector-panel'))
            handleInspectorHover(e);
        else if (e.target.closest('.box-tree-area, .packet-list-area'))
            handleStructureHover(e);
        else if (e.target.closest('#hex-grid-content')) handleHexHover(e);
    };

    const delegatedMouseOut = () => {
        clearHighlights([
            'is-box-hover-highlighted',
            'is-field-hover-highlighted',
        ]);
        if (selectedDataOffset === null)
            updateInspectorPanel(null, createInspectorTemplate);
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
                parseInt(targetNode.dataset.boxOffset) ??
                parseInt(targetNode.dataset.packetOffset) ??
                parseInt(targetNode.dataset.groupStartOffset);
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
        if (selectedDataOffset === targetOffset) selectedDataOffset = null;
        else selectedDataOffset = targetOffset;

        applySelectionHighlight();
        const data = findDataByOffset(parsedSegmentData, selectedDataOffset);
        updateInspectorPanel(data, createInspectorTemplate);
    };

    function applySelectionHighlight() {
        clearHighlights(['is-highlighted']);
        if (selectedDataOffset === null) return;
        const data = findDataByOffset(parsedSegmentData, selectedDataOffset);
        if (!data) return;
        const boxOffsets = applyBoxBackgroundHighlight('is-highlighted', data);
        applyPerimeterBorder(boxOffsets, 'border-blue-400', 2);
    }

    function updateInspectorPanel(data, templateFn, highlightedField = null) {
        const inspector = /** @type {HTMLElement | null} */ (
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
            const fieldRow = /** @type {HTMLElement | null} */ (
                inspector.querySelector(
                    `[data-field-name="${highlightedField}"]`
                )
            );
            if (fieldRow) {
                fieldRow.classList.add('bg-purple-900/50');
                fieldRow.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    updateInspectorPanel(null, createInspectorTemplate);
}
