import { render, html } from 'lit-html';

let dropdownContainer = null;
let currentCloseHandler = null;
let activeTrigger = null;

/**
 * Initializes the dropdown service with the global container element.
 * @param {object} dom - The application's DOM context.
 */
export function initializeDropdownService(dom) {
    dropdownContainer = dom.dropdownContainer;
}

/**
 * Closes any currently open dropdown.
 */
function closeCurrentDropdown() {
    if (currentCloseHandler) {
        currentCloseHandler();
    }
}

/**
 * Toggles a dropdown panel associated with a trigger element.
 * @param {HTMLElement} triggerElement - The element that triggers the dropdown.
 * @param {import('lit-html').TemplateResult} contentTemplate - The lit-html template to render inside the panel.
 */
export function toggleDropdown(triggerElement, contentTemplate) {
    if (triggerElement === activeTrigger) {
        closeCurrentDropdown();
        return;
    }

    closeCurrentDropdown();
    activeTrigger = triggerElement;

    if (!dropdownContainer) {
        console.error(
            '[DropdownService] Service not initialized with a container.'
        );
        return;
    }

    const content = html`
        <div @click=${(e) => e.stopPropagation()}>${contentTemplate}</div>
    `;

    render(content, dropdownContainer);
    const panel = /** @type {HTMLElement} */ (
        dropdownContainer.firstElementChild
    );
    if (!panel) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    panel.style.position = 'absolute';
    panel.style.pointerEvents = 'auto';
    panel.style.top = `${triggerRect.bottom + 4}px`;
    panel.style.right = `${window.innerWidth - triggerRect.right}px`;

    const panelRect = panel.getBoundingClientRect();
    if (panelRect.left < 10) {
        panel.style.left = '10px';
        panel.style.right = 'auto';
    }

    const handleOutsideClick = (e) => {
        if (!triggerElement.contains(/** @type {Node} */ (e.target))) {
            closeCurrentDropdown();
        }
    };

    currentCloseHandler = () => {
        if (!dropdownContainer) return;
        render(html``, dropdownContainer);
        document.removeEventListener('click', handleOutsideClick);
        currentCloseHandler = null;
        activeTrigger = null;
    };

    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick, { once: true });
    }, 0);
}

/**
 * Public method to explicitly close the dropdown.
 */
export function closeDropdown() {
    closeCurrentDropdown();
}
