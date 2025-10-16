export function setupGlobalTooltipListener(dom) {
    document.body.addEventListener('mouseover', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);

        const tooltipTrigger = /** @type {HTMLElement} */ (
            target.closest('[data-tooltip], [data-tooltip-html-b64]')
        );

        if (!tooltipTrigger) {
            dom.globalTooltip.style.visibility = 'hidden';
            dom.globalTooltip.style.opacity = '0';
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
            dom.globalTooltip.style.visibility = 'hidden';
            dom.globalTooltip.style.opacity = '0';
            return;
        }

        dom.globalTooltip.innerHTML = tooltipContent;

        // --- ENHANCED POSITIONING LOGIC ---
        const MARGIN = 10; // 10px margin from viewport edges
        const SPACING = 8; // 8px spacing from the target element

        const targetRect = tooltipTrigger.getBoundingClientRect();
        const tooltipRect = dom.globalTooltip.getBoundingClientRect();

        // 1. Calculate initial desired position (centered above target)
        let top = targetRect.top - tooltipRect.height - SPACING;
        let left =
            targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;

        // 2. Check for vertical clipping and flip if necessary
        if (top < MARGIN) {
            top = targetRect.bottom + SPACING;
        }
        // Ensure it doesn't clip at the bottom after flipping
        if (top + tooltipRect.height > window.innerHeight - MARGIN) {
            top = window.innerHeight - tooltipRect.height - MARGIN;
        }

        // 3. Clamp horizontal position to stay within viewport "guardrails"
        left = Math.max(MARGIN, left); // Prevent clipping on the left
        left = Math.min(
            left,
            window.innerWidth - tooltipRect.width - MARGIN
        ); // Prevent clipping on the right

        dom.globalTooltip.style.left = `${left}px`;
        dom.globalTooltip.style.top = `${top}px`;
        // --- END ENHANCED POSITIONING LOGIC ---

        dom.globalTooltip.style.visibility = 'visible';
        dom.globalTooltip.style.opacity = '1';
    });

    document.body.addEventListener('mouseout', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const relatedTarget = /** @type {HTMLElement} */ (e.relatedTarget);
        const tooltipTrigger = target.closest(
            '[data-tooltip], [data-tooltip-html-b64]'
        );

        if (tooltipTrigger && !tooltipTrigger.contains(relatedTarget)) {
            dom.globalTooltip.style.visibility = 'hidden';
            dom.globalTooltip.style.opacity = '0';
        }
    });
}