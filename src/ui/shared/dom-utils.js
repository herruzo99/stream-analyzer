let scrollbarWidth = null;

/**
 * Calculates the width of the browser's vertical scrollbar.
 * The result is cached for subsequent calls.
 * @returns {number} The width of the scrollbar in pixels.
 */
export function getScrollbarWidth() {
    if (scrollbarWidth !== null) {
        return scrollbarWidth;
    }

    // Create a temporary, invisible, scrollable element
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll'; // Force scrollbar
    document.body.appendChild(outer);

    // Create an inner element to measure against
    const inner = document.createElement('div');
    outer.appendChild(inner);

    // The difference in width is the scrollbar width
    scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

    // Clean up
    outer.parentNode.removeChild(outer);

    return scrollbarWidth;
}