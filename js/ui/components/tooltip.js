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

        const targetRect = tooltipTrigger.getBoundingClientRect();
        const tooltipRect = dom.globalTooltip.getBoundingClientRect();

        let left =
            targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;

        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        dom.globalTooltip.style.left = `${left}px`;
        dom.globalTooltip.style.top = `${
            targetRect.top - tooltipRect.height - 8
        }px`; // 8px spacing

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