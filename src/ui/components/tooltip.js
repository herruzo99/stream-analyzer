export function setupGlobalTooltipListener(dom) {
    document.body.addEventListener('mouseover', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);

        // --- ARCHITECTURAL FIX: Prevent interference with ECharts ---
        // ECharts has its own tooltip system. Our global tooltip's synthetic events
        // create race conditions with the ECharts event loop. This guard prevents
        // our system from activating when the mouse is over any ECharts canvas.
        if (
            target.closest('canvas') &&
            target.closest('[data-echarts-instance]')
        ) {
            return;
        }
        // --- END FIX ---

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
                // Robust UTF-8 Base64 Decoding
                const binaryString = atob(b64Html);
                try {
                    // Convert binary string back to percent-encoded UTF-8 sequence for correct decoding
                    const percentEncoded = binaryString
                        .split('')
                        .map(
                            (c) =>
                                '%' +
                                ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                        )
                        .join('');
                    tooltipContent = decodeURIComponent(percentEncoded);
                } catch (_e) {
                    // Fallback for legacy/ASCII-only base64
                    tooltipContent = binaryString;
                }
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

        const MARGIN = 10;
        const SPACING = 8;

        const triggerRect = tooltipTrigger.getBoundingClientRect();
        const tooltipRect = dom.globalTooltip.getBoundingClientRect();

        let top = triggerRect.top - tooltipRect.height - SPACING;
        let left =
            triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

        if (top < MARGIN) {
            top = triggerRect.bottom + SPACING;
        }
        if (top + tooltipRect.height > window.innerHeight - MARGIN) {
            top = window.innerHeight - tooltipRect.height - MARGIN;
        }

        left = Math.max(MARGIN, left);
        left = Math.min(left, window.innerWidth - tooltipRect.width - MARGIN);

        dom.globalTooltip.style.left = `${left}px`;
        dom.globalTooltip.style.top = `${top}px`;

        dom.globalTooltip.style.visibility = 'visible';
        dom.globalTooltip.style.opacity = '1';
    });
}
