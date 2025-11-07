import { render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';

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

function closeDropdownByTrigger(triggerElement) {
    const index = activeDropdowns.findIndex(
        (d) => d.trigger === triggerElement
    );
    if (index === -1) return;

    const toClose = activeDropdowns.splice(index);
    toClose.forEach(({ close }) => close());

    if (activeDropdowns.length === 0 && globalClickListener) {
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

    const existingDropdown = activeDropdowns.find(
        (d) => d.trigger === triggerElement
    );
    if (existingDropdown) {
        closeDropdownByTrigger(triggerElement);
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
    render(templateFn(), panelContainer);
    const panelElement = /** @type {HTMLElement} */ (
        panelContainer.firstElementChild
    );
    if (!panelElement) {
        dropdownContainer.removeChild(panelContainer);
        return;
    }

    // --- REACTIVITY ---
    const rerender = () => render(templateFn(), panelContainer);
    const unsubAnalysis = useAnalysisStore.subscribe(rerender);
    const unsubUi = useUiStore.subscribe(rerender);
    const unsubMultiPlayer = useMultiPlayerStore.subscribe(rerender);
    // --- END REACTIVITY ---

    panelElement.style.position = 'absolute';
    panelElement.style.pointerEvents = 'auto';
    panelElement.style.visibility = 'hidden';

    const panelRect = panelElement.getBoundingClientRect();
    const triggerRect = triggerElement.getBoundingClientRect();
    const MARGIN = 10;
    const SPACING = 4;

    let top;
    if (
        triggerRect.bottom + panelRect.height + SPACING <
        window.innerHeight - MARGIN
    ) {
        top = triggerRect.bottom + SPACING;
        panelElement.style.transformOrigin = 'top right';
    } else {
        top = triggerRect.top - panelRect.height - SPACING;
        panelElement.style.transformOrigin = 'bottom right';
    }
    top = Math.max(MARGIN, top);

    let right = 'auto';
    let left = 'auto';
    let rightPos = window.innerWidth - triggerRect.right;
    if (triggerRect.right - panelRect.width < MARGIN) {
        left = `${MARGIN}px`;
    } else {
        right = `${Math.max(MARGIN, rightPos)}px`;
    }

    panelElement.style.top = `${top}px`;
    panelElement.style.left = left;
    panelElement.style.right = right;
    panelElement.style.visibility = 'visible';

    const close = () => {
        unsubAnalysis();
        unsubUi();
        unsubMultiPlayer();
        if (panelContainer.parentNode === dropdownContainer) {
            dropdownContainer.removeChild(panelContainer);
        }
    };

    activeDropdowns.push({
        trigger: triggerElement,
        panel: panelContainer,
        close,
    });

    if (!globalClickListener) {
        globalClickListener = (e) => {
            const target = /** @type {Node} */ (e.target);
            if (!document.body.contains(target)) return;

            const isOutside = activeDropdowns.every(
                (d) => !d.trigger.contains(target) && !d.panel.contains(target)
            );
            if (isOutside) {
                closeAllDropdowns();
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
