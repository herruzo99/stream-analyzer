import { render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useNotificationStore } from '@/state/notificationStore';

let dropdownContainer = null;
let activeDropdowns = [];
let globalClickListener = null;

/**
 * Initializes the dropdown service with the global container element.
 * @param {object} dom - The application's DOM context.
 */
export function initializeDropdownService(dom) {
    dropdownContainer = dom.dropdownContainer;
}

function closeAllDropdowns() {
    activeDropdowns.forEach(({ close }) => close());
    activeDropdowns = [];
    if (globalClickListener) {
        document.removeEventListener('click', globalClickListener);
        globalClickListener = null;
    }
}

/**
 * Toggles a dropdown panel associated with a trigger element.
 * @param {HTMLElement} triggerElement - The element that triggers the dropdown.
 * @param {() => import('lit-html').TemplateResult} templateFn - A function that returns the lit-html template.
 * @param {MouseEvent} event - The original click event that triggered the toggle.
 */
export function toggleDropdown(triggerElement, templateFn, event) {
    if (!dropdownContainer) {
        console.error(
            '[DropdownService] Service not initialized with a container.'
        );
        return;
    }

    const existingDropdownIndex = activeDropdowns.findIndex(
        (d) => d.trigger === triggerElement
    );
    if (existingDropdownIndex !== -1) {
        // Close this dropdown and any nested inside it
        const toClose = activeDropdowns.splice(existingDropdownIndex);
        toClose.forEach(({ close }) => close());
        if (activeDropdowns.length === 0 && globalClickListener) {
            document.removeEventListener('click', globalClickListener);
            globalClickListener = null;
        }
        return;
    }

    const isClickInsideAnotherPanel = activeDropdowns.some((d) =>
        d.panel.contains(/** @type {Node} */ (event?.target))
    );
    if (!isClickInsideAnotherPanel) {
        closeAllDropdowns();
    }

    const panelContainer = document.createElement('div');
    dropdownContainer.appendChild(panelContainer);

    // Initial render
    render(templateFn(), panelContainer);

    const panelElement = /** @type {HTMLElement} */ (
        panelContainer.firstElementChild
    );
    if (!panelElement) {
        dropdownContainer.removeChild(panelContainer);
        return;
    }

    const rerender = () => {
        if (panelContainer.isConnected) {
            render(templateFn(), panelContainer);
        }
    };
    const unsubAnalysis = useAnalysisStore.subscribe(rerender);
    const unsubUi = useUiStore.subscribe(rerender);
    const unsubMultiPlayer = useMultiPlayerStore.subscribe(rerender);
    const unsubNotifications = useNotificationStore.subscribe(rerender);

    panelElement.style.position = 'absolute';
    panelElement.style.pointerEvents = 'auto';
    panelElement.style.visibility = 'hidden';

    // --- ARCHITECTURAL REFACTOR: Viewport-aware positioning with scrolling ---
    const MARGIN = 10;
    const SPACING = 4;

    // 1. Constrain max height to fit within the viewport.
    const maxPanelHeight = window.innerHeight - MARGIN * 2;
    panelElement.style.maxHeight = `${maxPanelHeight}px`;

    // 2. Re-measure dimensions now that max-height is set.
    const panelRect = panelElement.getBoundingClientRect();
    const triggerRect = triggerElement.getBoundingClientRect();

    let top, left, transformOrigin;

    // 3. Vertical positioning: Prefer below, flip to above if not enough space.
    if (
        triggerRect.bottom + panelRect.height + SPACING <
        window.innerHeight - MARGIN
    ) {
        top = triggerRect.bottom + SPACING;
        transformOrigin = 'top';
    } else {
        top = triggerRect.top - panelRect.height - SPACING;
        transformOrigin = 'bottom';
    }
    // Clamp to ensure it doesn't go off-screen at the top.
    top = Math.max(MARGIN, top);

    // 4. Horizontal positioning: Prefer right-aligned, adjust if clipped.
    left = triggerRect.right - panelRect.width;
    transformOrigin += ' right';

    // Adjust if clipping left edge.
    if (left < MARGIN) {
        left = MARGIN;
        transformOrigin = transformOrigin.replace('right', 'left');
    }
    // Adjust if clipping right edge.
    if (left + panelRect.width > window.innerWidth - MARGIN) {
        left = window.innerWidth - panelRect.width - MARGIN;
    }

    panelElement.style.top = `${top}px`;
    panelElement.style.left = `${left}px`;
    panelElement.style.transformOrigin = transformOrigin;
    panelElement.style.right = 'auto';
    panelElement.style.visibility = 'visible';
    // --- END REFACTOR ---

    const close = () => {
        unsubAnalysis();
        unsubUi();
        unsubMultiPlayer();
        unsubNotifications();
        if (panelContainer.parentNode === dropdownContainer) {
            dropdownContainer.removeChild(panelContainer);
        }
    };

    activeDropdowns.push({
        trigger: triggerElement,
        panel: panelContainer, // The wrapper div
        close,
    });

    if (!globalClickListener) {
        globalClickListener = (e) => {
            const path = e.composedPath();

            // Find the topmost dropdown panel that the click originated from.
            let clickedInsideIndex = -1;
            for (let i = activeDropdowns.length - 1; i >= 0; i--) {
                const d = activeDropdowns[i];
                if (path.includes(d.trigger) || path.includes(d.panel)) {
                    clickedInsideIndex = i;
                    break;
                }
            }

            if (clickedInsideIndex === -1) {
                // Click was outside all known triggers and panels.
                closeAllDropdowns();
            } else {
                // Click was inside a panel/trigger. Close any dropdowns nested deeper than it.
                const toClose = activeDropdowns.splice(clickedInsideIndex + 1);
                if (toClose.length > 0) {
                    toClose.forEach(({ close }) => close());
                }
            }
        };
        setTimeout(
            () => document.addEventListener('click', globalClickListener),
            0
        );
    }
}

export function closeDropdown() {
    if (activeDropdowns.length > 0) {
        const lastDropdown = activeDropdowns.pop();
        if (lastDropdown) {
            lastDropdown.close();
        }
        if (activeDropdowns.length === 0 && globalClickListener) {
            document.removeEventListener('click', globalClickListener);
            globalClickListener = null;
        }
    }
}
