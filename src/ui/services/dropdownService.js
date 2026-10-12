import { useAnalysisStore } from '@/state/analysisStore';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useNotificationStore } from '@/state/notificationStore';
import { useUiStore } from '@/state/uiStore';
import { render } from 'lit-html';

let dropdownContainer = null;
let activeDropdowns = [];
let globalClickListener = null;
let resizeObserver = null;
let resizePositionFrame = null;

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
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
    if (resizePositionFrame !== null) {
        cancelAnimationFrame(resizePositionFrame);
        resizePositionFrame = null;
    }
}

/**
 * Calculates and applies position to the panel element relative to the trigger.
 */
function updatePosition(panel, trigger, options = {}) {
    if (!panel || !trigger) return;

    // Ensure we are in absolute mode for final placement
    panel.style.position = 'absolute';
    panel.style.zIndex = '100';

    const MARGIN = 8;
    const SPACING = 4;

    // Reset geometric props to measure natural size if needed,
    // but since we are absolute, we just need to measure the bounding rect.
    // Note: We don't unset 'top/left' here because it causes a flash to 0,0.
    // We measure the current rect and recalculate target.

    const panelRect = panel.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // --- Vertical Logic ---
    const spaceBelow = viewportHeight - triggerRect.bottom - MARGIN;
    const spaceAbove = triggerRect.top - MARGIN;

    let placeBelow = true;
    let transformOriginY = 'top';

    // Flip if constrained below AND more space above
    if (spaceBelow < panelRect.height && spaceAbove > spaceBelow) {
        placeBelow = false;
    }

    let topStyle = '';
    let bottomStyle = '';
    let maxHeightStyle = '';

    if (placeBelow) {
        topStyle = `${triggerRect.bottom + SPACING}px`;
        transformOriginY = 'top';
        if (panelRect.height > spaceBelow) {
            maxHeightStyle = `${spaceBelow}px`;
        }
    } else {
        // Use bottom relative to viewport height to anchor upwards
        bottomStyle = `${viewportHeight - triggerRect.top + SPACING}px`;
        transformOriginY = 'bottom';
        if (panelRect.height > spaceAbove) {
            maxHeightStyle = `${spaceAbove}px`;
        }
    }

    // --- Horizontal Logic ---
    let left = triggerRect.left;
    let transformOriginX = 'left';

    if (options.side === 'right') {
        // Sidebar-footer menus: open beside the trigger, bottom-aligned,
        // so the panel never covers the sidebar content.
        left = triggerRect.right + SPACING * 2;
        transformOriginX = 'left';
        if (left + panelRect.width > viewportWidth - MARGIN) {
            left = Math.max(MARGIN, viewportWidth - panelRect.width - MARGIN);
        }
        const wantBottom = viewportHeight - triggerRect.bottom;
        const topFromBottom = viewportHeight - wantBottom - panelRect.height;
        if (topFromBottom < MARGIN) {
            topStyle = `${MARGIN}px`;
            bottomStyle = '';
            maxHeightStyle = `${viewportHeight - MARGIN * 2}px`;
        } else {
            topStyle = '';
            bottomStyle = `${wantBottom}px`;
            maxHeightStyle =
                panelRect.height > viewportHeight - MARGIN * 2
                    ? `${viewportHeight - MARGIN * 2}px`
                    : '';
        }
    } else if (left + panelRect.width > viewportWidth - MARGIN) {
        // If right edge overflows viewport
        const rightAlignedLeft = triggerRect.right - panelRect.width;
        if (rightAlignedLeft >= MARGIN) {
            left = rightAlignedLeft;
            transformOriginX = 'right';
        } else {
            left = viewportWidth - panelRect.width - MARGIN;
            transformOriginX = 'center';
        }
    }

    // Hard clamp left edge
    if (left < MARGIN) {
        left = MARGIN;
        transformOriginX = 'left';
    }

    // Apply Styles
    panel.style.top = topStyle;
    panel.style.bottom = bottomStyle;
    panel.style.left = `${left}px`;
    panel.style.right = ''; // Clear right
    panel.style.maxHeight = maxHeightStyle;
    panel.style.transformOrigin = `${transformOriginY} ${transformOriginX}`;
}

export function toggleDropdown(triggerElement, templateFn, event, options = {}) {
    if (!dropdownContainer) {
        console.error('[DropdownService] Not initialized.');
        return;
    }

    // 1. Close existing if clicking same trigger
    const existingIndex = activeDropdowns.findIndex(
        (d) => d.trigger === triggerElement
    );
    if (existingIndex !== -1) {
        const toClose = activeDropdowns.splice(existingIndex);
        toClose.forEach((d) => d.close());
        if (activeDropdowns.length === 0 && globalClickListener) {
            document.removeEventListener('click', globalClickListener);
            globalClickListener = null;
        }
        return;
    }

    // 2. Close unrelated dropdowns
    const isNested = activeDropdowns.some((d) =>
        d.panel.contains(event?.target)
    );
    if (!isNested) {
        closeAllDropdowns();
    }

    const dropdownOptions = options || {};

    // 3. Create Wrapper
    // We use a wrapper to isolate the Lit rendering, but the wrapper itself
    // acts as a layout boundary.
    const panelContainer = document.createElement('div');

    // CRITICAL FIX:
    // The container acts as a layer. We give it full width/height but no pointer events
    // so it doesn't block clicks, but allows its children (the panel) to calculate size
    // correctly before positioning.
    panelContainer.style.position = 'absolute';
    panelContainer.style.top = '0';
    panelContainer.style.left = '0';
    panelContainer.style.width = '100%';
    panelContainer.style.height = '100%';
    panelContainer.style.pointerEvents = 'none';

    dropdownContainer.appendChild(panelContainer);

    // 4. Render Content
    render(templateFn(), panelContainer);
    const panelElement = /** @type {HTMLElement} */ (
        panelContainer.firstElementChild
    );

    if (!panelElement) {
        dropdownContainer.removeChild(panelContainer);
        return;
    }

    // Enable pointer events on the actual panel so users can click it
    panelElement.style.pointerEvents = 'auto';

    // 5. Initial Position Calculation
    // We do this immediately to set initial coordinates.
    // Then we do it again in RAF to handle any layout shifts from rendering.
    updatePosition(panelElement, triggerElement, dropdownOptions);

    requestAnimationFrame(() => {
        updatePosition(panelElement, triggerElement, dropdownOptions);
    });

    // 6. Reactive Updates (microtask-batched: player ticks and polling
    // updates fire store writes at high frequency; re-render at most once
    // per frame instead of once per write). Placement follows the trigger
    // unless options.side is set ('right' opens beside the trigger,
    // used by sidebar-footer menus that have no room below).
    let rerenderQueued = false;
    const rerender = () => {
        if (rerenderQueued || !panelContainer.isConnected) return;
        rerenderQueued = true;
        queueMicrotask(() => {
            rerenderQueued = false;
            if (!panelContainer.isConnected) return;
            render(templateFn(), panelContainer);
            const el = /** @type {HTMLElement} */ (
                panelContainer.firstElementChild
            );
            if (el) {
                el.style.pointerEvents = 'auto'; // Ensure recreated element has events
                updatePosition(el, triggerElement, dropdownOptions);
            }
        });
    };

    const unsubAnalysis = useAnalysisStore.subscribe(rerender);
    const unsubUi = useUiStore.subscribe(rerender);
    const unsubMultiPlayer = useMultiPlayerStore.subscribe(rerender);
    const unsubNotifications = useNotificationStore.subscribe(rerender);

    // Observe size changes
    if (!resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
            if (resizePositionFrame !== null) return;
            resizePositionFrame = requestAnimationFrame(() => {
                resizePositionFrame = null;
                activeDropdowns.forEach((d) => {
                    const el = /** @type {HTMLElement} */ (
                        d.panel.firstElementChild
                    );
                    if (el) updatePosition(el, d.trigger);
                });
            });
        });
    }
    resizeObserver.observe(panelElement);

    const close = () => {
        rerenderQueued = false;
        if (resizeObserver && panelElement)
            resizeObserver.unobserve(panelElement);
        if (resizePositionFrame !== null) {
            cancelAnimationFrame(resizePositionFrame);
            resizePositionFrame = null;
        }
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
        panel: panelContainer,
        close,
    });

    // 7. Global Click Listener
    if (!globalClickListener) {
        const pendingListener = (e) => {
            const path = e.composedPath();
            let clickedIndex = -1;
            for (let i = activeDropdowns.length - 1; i >= 0; i--) {
                const d = activeDropdowns[i];
                // Check if click is inside trigger or the rendered panel content
                // Note: d.panel is the wrapper, firstElementChild is the visible menu
                if (
                    path.includes(d.trigger) ||
                    (d.panel.firstElementChild &&
                        path.includes(d.panel.firstElementChild))
                ) {
                    clickedIndex = i;
                    break;
                }
            }

            if (clickedIndex === -1) {
                closeAllDropdowns();
            } else {
                // Close any children dropdowns opened *after* this one (nested menus support)
                const toClose = activeDropdowns.splice(clickedIndex + 1);
                toClose.forEach((d) => d.close());
            }
        };
        globalClickListener = pendingListener;
        // Defer adding listener to avoid catching the current opening click.
        // Guarded: if every dropdown closed before the timeout fires, the
        // listener is never attached (previously leaked a dead handler).
        setTimeout(() => {
            if (activeDropdowns.length > 0) {
                document.addEventListener('click', pendingListener);
            } else {
                globalClickListener = null;
            }
        }, 0);
    }

    return {
        close,
        update: rerender,
    };
}

export function closeDropdown() {
    if (activeDropdowns.length > 0) {
        const last = activeDropdowns.pop();
        if (last) last.close();
        if (activeDropdowns.length === 0 && globalClickListener) {
            document.removeEventListener('click', globalClickListener);
            globalClickListener = null;
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }
        }
    }
}
