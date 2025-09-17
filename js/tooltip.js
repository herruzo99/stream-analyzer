import { dom } from './state.js';

export function setupGlobalTooltipListener() {
    document.body.addEventListener('mouseover', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        
        // ** THE FIX IS HERE **
        // The listener now looks for any element with a `data-tooltip` attribute,
        // not just elements with the `.tooltip` class. This makes it universal.
        const tooltipTrigger = target.closest('[data-tooltip]');
        
        if (!tooltipTrigger) {
            // Hide the tooltip if we move off a trigger
            dom.globalTooltip.style.visibility = 'hidden';
            dom.globalTooltip.style.opacity = '0';
            return;
        }

        const text = tooltipTrigger.dataset.tooltip || '';
        const isoRef = tooltipTrigger.dataset.iso || '';
        
        if (!text) return;

        const tooltipContent = `${text}${isoRef ? `<span class="iso-ref">${isoRef}</span>` : ''}`;
        
        dom.globalTooltip.innerHTML = tooltipContent;

        // Position the tooltip above the trigger element
        const targetRect = tooltipTrigger.getBoundingClientRect();
        const tooltipRect = dom.globalTooltip.getBoundingClientRect();

        // Center the tooltip horizontally above the element
        let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        
        // Ensure it doesn't go off the left or right edge of the screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        dom.globalTooltip.style.left = `${left}px`;
        dom.globalTooltip.style.top = `${targetRect.top - tooltipRect.height - 8}px`; // 8px spacing
        
        dom.globalTooltip.style.visibility = 'visible';
        dom.globalTooltip.style.opacity = '1';
    });

    // A simpler mouseout listener for the whole body
    document.body.addEventListener('mouseout', (e) => {
        // If the mouse leaves the trigger and doesn't enter another part of it
        const target = /** @type {HTMLElement} */ (e.target);
        const relatedTarget = /** @type {HTMLElement} */ (e.relatedTarget);
        const tooltipTrigger = target.closest('[data-tooltip]');
        
        if (tooltipTrigger && !tooltipTrigger.contains(relatedTarget)) {
            dom.globalTooltip.style.visibility = 'hidden';
            dom.globalTooltip.style.opacity = '0';
        }
    });
}