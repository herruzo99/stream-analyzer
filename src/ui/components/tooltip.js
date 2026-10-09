export function setupGlobalTooltipListener(dom) {
    let currentObserver = null;

    const updateTooltipContent = (trigger, tooltipEl) => {
        const b64Html = trigger.dataset.tooltipHtmlB64;
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
                const text = trigger.dataset.tooltip || '';
                const isoRef = trigger.dataset.iso || '';
                if (!text) return false; // Don't show empty tooltips

                tooltipContent = `${text}${isoRef
                    ? `<span class="block mt-1 font-medium text-emerald-400">${isoRef}</span>`
                    : ''
                    }`;
            }
        } catch (error) {
            console.error(
                'Failed to decode or process tooltip content:',
                error
            );
            tooltipContent =
                '<span class="text-red-400">Tooltip Error</span>';
        }

        if (!tooltipContent.trim()) {
            return false;
        }

        tooltipEl.innerHTML = tooltipContent;
        return true;
    };

    // --- Shared Logic ---
    let monitorInterval = null;
    let longPressTimer = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let activeTouchTarget = null;
    const LONG_PRESS_DELAY = 500; // ms
    const DRAG_TOLERANCE = 10; // px

    const clearMonitor = () => {
        if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
        }
    };

    const clearLongPress = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    const hideTooltip = () => {
        dom.globalTooltip.style.visibility = 'hidden';
        dom.globalTooltip.style.opacity = '0';

        clearMonitor();
        clearLongPress();

        if (currentObserver) {
            currentObserver.disconnect();
            currentObserver = null;
        }
        activeTouchTarget = null;
    };

    const showTooltipFor = (targetElement) => {
        // Cleanup previous state
        hideTooltip();

        const tooltipTrigger = /** @type {HTMLElement} */ (
            targetElement.closest('[data-tooltip], [data-tooltip-html-b64]')
        );

        if (!tooltipTrigger) return;

        const render = () => {
            if (activeTouchTarget === null && !tooltipTrigger.isConnected) {
                hideTooltip();
                return;
            }

            if (updateTooltipContent(tooltipTrigger, dom.globalTooltip)) {
                dom.globalTooltip.className =
                    'fixed z-[10000] px-3 py-1.5 text-xs font-bold text-slate-100 bg-slate-800 backdrop-filter backdrop-blur-xl border border-slate-800/50 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)] pointer-events-none transition-opacity duration-200 whitespace-nowrap opacity-0';

                const MARGIN = 10;
                const SPACING = 8;
                const PLACEMENT =
                    tooltipTrigger.dataset.tooltipPlacement || 'top';

                const triggerRect = tooltipTrigger.getBoundingClientRect();
                const tooltipRect = dom.globalTooltip.getBoundingClientRect();

                let top = 0;
                let left = 0;

                switch (PLACEMENT) {
                    case 'right':
                        top =
                            triggerRect.top +
                            triggerRect.height / 2 -
                            tooltipRect.height / 2;
                        left = triggerRect.right + SPACING;
                        break;
                    case 'left':
                        top =
                            triggerRect.top +
                            triggerRect.height / 2 -
                            tooltipRect.height / 2;
                        left = triggerRect.left - tooltipRect.width - SPACING;
                        break;
                    case 'bottom':
                        top = triggerRect.bottom + SPACING;
                        left =
                            triggerRect.left +
                            triggerRect.width / 2 -
                            tooltipRect.width / 2;
                        break;
                    case 'top':
                    default:
                        top = triggerRect.top - tooltipRect.height - SPACING;
                        left =
                            triggerRect.left +
                            triggerRect.width / 2 -
                            tooltipRect.width / 2;
                        break;
                }

                // Bounds Checking
                if (top < MARGIN) top = MARGIN;
                if (top + tooltipRect.height > window.innerHeight - MARGIN)
                    top = window.innerHeight - tooltipRect.height - MARGIN;

                if (left < MARGIN) left = MARGIN;
                if (left + tooltipRect.width > window.innerWidth - MARGIN)
                    left = window.innerWidth - tooltipRect.width - MARGIN;

                dom.globalTooltip.style.left = `${left}px`;
                dom.globalTooltip.style.top = `${top}px`;

                requestAnimationFrame(() => {
                    // Guard: If we are hidden (monitor cleared/hide called), don't show
                    if (!monitorInterval && !activeTouchTarget) return;

                    dom.globalTooltip.style.visibility = 'visible';
                    dom.globalTooltip.style.opacity = '1';
                });
            } else {
                hideTooltip();
            }
        };

        // Initial Show
        render();

        // Setup observer for attribute changes
        currentObserver = new MutationObserver(() => {
            render();
        });

        currentObserver.observe(tooltipTrigger, {
            attributes: true,
            attributeFilter: [
                'data-tooltip',
                'data-tooltip-html-b64',
                'data-iso',
                'data-tooltip-placement',
            ],
        });

        // Start Polling (10 times per second = 100ms)
        monitorInterval = setInterval(() => {
            // Check if element is still in DOM
            if (!tooltipTrigger.isConnected) {
                // console.log('[Tooltip] Closing - Trigger disconnected');
                hideTooltip();
                return;
            }

            // Check hover state (only relevant if not activeTouchTarget)
            // If it's a touch target, we don't rely on :hover
            if (!activeTouchTarget) {
                if (!tooltipTrigger.matches(':hover')) {
                    // console.log('[Tooltip] Closing - No longer hovered');
                    hideTooltip();
                }
            }
        }, 100);
    };

    // --- Mouse Interaction ---
    document.body.addEventListener('mouseover', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);

        // --- ARCHITECTURAL FIX: Prevent interference with ECharts ---
        if (
            target.closest('canvas') &&
            target.closest('[data-echarts-instance]')
        ) {
            return;
        }

        // We do strict checking: if we are over a tooltip trigger, show it.
        const trigger = /** @type {HTMLElement} */ (target.closest('[data-tooltip], [data-tooltip-html-b64]'));

        if (trigger) {
            showTooltipFor(trigger);
        }
    });

    // --- Touch Interaction (Mobile Long Press) ---
    document.body.addEventListener('touchstart', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const trigger = target.closest('[data-tooltip], [data-tooltip-html-b64]');

        // Clear any existing press/monitor
        hideTooltip();

        if (!trigger) return;

        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        longPressTimer = setTimeout(() => {
            activeTouchTarget = trigger;
            // Note: showTooltipFor will start polling, but we added a check for activeTouchTarget to skip :hover check
            showTooltipFor(/** @type {HTMLElement} */(trigger));

            // Optional: Vibrate to indicate long press
            if (navigator.vibrate) {
                try { navigator.vibrate(50); } catch { /* ignore */ }
            }
        }, LONG_PRESS_DELAY);
    }, { passive: true });

    document.body.addEventListener('touchmove', (e) => {
        if (!longPressTimer) return;

        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartX);
        const dy = Math.abs(touch.clientY - touchStartY);

        if (dx > DRAG_TOLERANCE || dy > DRAG_TOLERANCE) {
            clearLongPress();
        }
    }, { passive: true });

    document.body.addEventListener('touchend', () => {
        clearLongPress();
        // If we have an active touch target, we keep it visible for a bit or until next tap
        if (activeTouchTarget) {
            setTimeout(hideTooltip, 3000); // Auto-hide after 3s
        }
    });

    document.body.addEventListener('touchcancel', () => {
        clearLongPress();
        hideTooltip();
    });

    // Also hide on scroll to prevent floating tooltips
    window.addEventListener('scroll', hideTooltip, { capture: true, passive: true });
}
