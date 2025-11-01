export function setupGlobalTooltipListener(dom) {
    document.body.addEventListener('mouseover', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const tooltipTrigger = /** @type {HTMLElement} */ (
            target.closest('[data-tooltip], [data-tooltip-html-b64]')
        );

        // Always hide the tooltip first. If we're moving to a new trigger,
        // it will be re-shown. If not, it will remain hidden.
        dom.globalTooltip.style.visibility = 'hidden';
        dom.globalTooltip.style.opacity = '0';

        if (!tooltipTrigger) {
            return;
        }

        const b64Html = tooltipTrigger.dataset.tooltipHtmlB64;
        let tooltipContent = '';

        try {
            if (b64Html) {
                tooltipContent = atob(b64Html);
            } else {
                const text = tooltipTrigger.dataset.tooltip || '';
                const isoRef = tooltipTrigger.dataset.iso || '';
                if (!text) return; // Don't show empty tooltips

                tooltipContent = `${text}${
                    isoRef
                        ? `<span class="block mt-1 font-medium text-emerald-300">${isoRef}</span>`
                        : ''
                }`;
            }
        } catch (error) {
            console.error(
                'Failed to decode or process tooltip content:',
                error
            );
            tooltipContent = '<span class="text-red-400">Tooltip Error</span>';
        }

        if (!tooltipContent.trim()) {
            return;
        }

        dom.globalTooltip.innerHTML = tooltipContent;

        // --- ENHANCED POSITIONING LOGIC ---
        const MARGIN = 10; // 10px margin from viewport edges
        const SPACING = 8; // 8px spacing from the target element

        const triggerRect = tooltipTrigger.getBoundingClientRect();
        const tooltipRect = dom.globalTooltip.getBoundingClientRect();

        // 1. Calculate initial desired position (centered above target)
        let top = triggerRect.top - tooltipRect.height - SPACING;
        let left =
            triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

        // 2. Check for vertical clipping and flip if necessary
        if (top < MARGIN) {
            top = triggerRect.bottom + SPACING;
        }
        // Ensure it doesn't clip at the bottom after flipping
        if (top + tooltipRect.height > window.innerHeight - MARGIN) {
            top = window.innerHeight - tooltipRect.height - MARGIN;
        }

        // 3. Clamp horizontal position to stay within viewport "guardrails"
        left = Math.max(MARGIN, left); // Prevent clipping on the left
        left = Math.min(left, window.innerWidth - tooltipRect.width - MARGIN); // Prevent clipping on the right

        dom.globalTooltip.style.left = `${left}px`;
        dom.globalTooltip.style.top = `${top}px`;
        // --- END ENHANCED POSITIONING LOGIC ---

        dom.globalTooltip.style.visibility = 'visible';
        dom.globalTooltip.style.opacity = '1';
    });

    // The 'mouseout' listener is removed as its logic is now consolidated
    // into the 'mouseover' handler for improved reliability.
}
