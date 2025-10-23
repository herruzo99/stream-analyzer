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

    // --- ENHANCED VIEWPORT-AWARE POSITIONING LOGIC ---

    // To measure the panel, we must make it visible but can position it off-screen initially
    // to prevent any flicker.
    panel.style.position = 'absolute';
    panel.style.pointerEvents = 'auto';
    panel.style.visibility = 'hidden';
    panel.style.top = '-9999px';
    panel.style.left = '-9999px';

    // Force a reflow to get accurate dimensions before calculating final position.
    const panelRect = panel.getBoundingClientRect();
    const triggerRect = triggerElement.getBoundingClientRect();
    const MARGIN = 10;
    const SPACING = 4;

    // --- Vertical Positioning ---
    let top;
    // Default: position below the trigger if there is enough space.
    if (triggerRect.bottom + panelRect.height + SPACING < window.innerHeight - MARGIN) {
        top = triggerRect.bottom + SPACING;
        panel.style.transformOrigin = 'top right';
    } 
    // Alternative: position above the trigger.
    else {
        top = triggerRect.top - panelRect.height - SPACING;
        panel.style.transformOrigin = 'bottom right';
    }
    // Clamp the final position to stay within the top viewport boundary.
    top = Math.max(MARGIN, top);

    // --- Horizontal Positioning ---
    /** @type {number | string} */
    let right = 'auto';
    /** @type {string} */
    let left = 'auto';

    // Default: align the right edge of the panel with the right edge of the trigger.
    let rightPos = window.innerWidth - triggerRect.right;
    
    // Check if right-aligning the panel would push it off the left side of the screen.
    if (triggerRect.right - panelRect.width < MARGIN) {
        left = `${MARGIN}px`;
        right = 'auto';
    } else {
        // Clamp the right position to stay within the right viewport boundary.
        right = Math.max(MARGIN, rightPos);
        left = 'auto';
    }

    // Apply final calculated position and make the panel visible.
    panel.style.top = `${top}px`;
    panel.style.left = left;
    panel.style.right = typeof right === 'number' ? `${right}px` : right;
    panel.style.visibility = 'visible';

    // --- END ENHANCED POSITIONING LOGIC ---

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