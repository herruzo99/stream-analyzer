import { html, render } from 'lit-html';

class VirtualizedList extends HTMLElement {
    constructor() {
        super();
        this._items = [];
        this._rowTemplate = (item, index) => html``;
        this._rowHeight = 40;
        this._itemId = (item) => item.id;
        this.postRenderCallback = null;

        this.visibleStartIndex = 0;
        this.visibleEndIndex = 0;
        this.paddingTop = 0;
        this.paddingBottom = 0;

        // State for throttling
        this._animationFrameId = null;

        // Bind methods
        this._onScroll = this._onScroll.bind(this);
        this._onResize = this._onResize.bind(this);
    }

    // --- Property Setters for Reactivity ---
    set items(newItems) {
        if (this._items === newItems) return;

        const oldScrollTop = this.scrollTop;
        const oldScrollHeight = this.scrollHeight;

        // Check if we are near bottom before update
        // Use a small threshold (e.g. 10px) to account for fractional pixels
        const isScrolledToBottom =
            oldScrollHeight > 0 &&
            oldScrollTop + this.clientHeight >= oldScrollHeight - 10;

        this._items = newItems;

        // Force an immediate update when data changes to prevent blank flashes,
        // but still do it efficiently.
        this._updateVisibleItems();

        // Restore scroll position after render in the next frame to ensure layout is settled
        requestAnimationFrame(() => {
            if (isScrolledToBottom) {
                this.scrollTop = this.scrollHeight;
            } else {
                // If the new list is shorter, the browser auto-adjusts scrollTop.
                // If longer, we maintain position.
                if (this.scrollTop !== oldScrollTop) {
                    this.scrollTop = oldScrollTop;
                }
            }
        });
    }

    get items() {
        return this._items;
    }

    set rowTemplate(newTemplate) {
        if (this._rowTemplate === newTemplate) return;
        this._rowTemplate = newTemplate;
        this._scheduleUpdate();
    }

    get rowTemplate() {
        return this._rowTemplate;
    }

    set rowHeight(newHeight) {
        if (this._rowHeight === newHeight) return;
        this._rowHeight = newHeight;
        this._scheduleUpdate();
    }

    get rowHeight() {
        return this._rowHeight;
    }

    set itemId(newItemIdFn) {
        this._itemId = newItemIdFn;
    }

    get itemId() {
        return this._itemId;
    }

    connectedCallback() {
        this.classList.add('block', 'overflow-y-auto', 'relative');

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className =
                'list-container relative overflow-hidden w-full';
            this.appendChild(this.container);
        }

        this.addEventListener('scroll', this._onScroll, { passive: true });

        // Use a wrapper for ResizeObserver to hook into the same scheduling logic
        this.resizeObserver = new ResizeObserver(() => this._onResize());
        this.resizeObserver.observe(this);

        this._scheduleUpdate();
    }

    disconnectedCallback() {
        this.removeEventListener('scroll', this._onScroll);
        if (this.resizeObserver) {
            this.resizeObserver.unobserve(this);
            this.resizeObserver.disconnect();
        }
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
    }

    /**
     * Schedules a visual update on the next animation frame.
     * This effectively throttles high-frequency events like scroll and resize.
     */
    _scheduleUpdate() {
        if (this._animationFrameId !== null) {
            return;
        }
        this._animationFrameId = requestAnimationFrame(() => {
            this._animationFrameId = null;
            this._updateVisibleItems();
        });
    }

    _onScroll() {
        this._scheduleUpdate();
    }

    _onResize() {
        this._scheduleUpdate();
    }

    _updateVisibleItems() {
        if (!this._items || !this._rowHeight || !this.container) return;

        const scrollTop = this.scrollTop;
        const clientHeight = this.clientHeight;
        const totalItems = this._items.length;
        const totalHeight = totalItems * this._rowHeight;

        // Calculate the index range
        // Add a small buffer (overscan) of 1 item above and below to reduce flickering during fast scrolling
        const visibleStartIndex = Math.max(
            0,
            Math.floor(scrollTop / this._rowHeight) - 1
        );

        const numItemsInView = Math.ceil(clientHeight / this._rowHeight);

        // Overscan of 2 below
        const visibleEndIndex = Math.min(
            totalItems - 1,
            visibleStartIndex + numItemsInView + 2
        );

        // Calculate padding to simulate the full height of the list
        this.paddingTop = visibleStartIndex * this._rowHeight;
        this.paddingBottom = Math.max(
            0,
            totalHeight - (visibleEndIndex + 1) * this._rowHeight
        );

        this._render(visibleStartIndex, visibleEndIndex);
    }

    _render(startIndex, endIndex) {
        const visibleItems = this._items.slice(startIndex, endIndex + 1);

        this.container.style.paddingTop = `${this.paddingTop}px`;
        this.container.style.paddingBottom = `${this.paddingBottom}px`;

        const template = html`
            ${visibleItems.map((item, index) =>
                this._rowTemplate(item, startIndex + index)
            )}
        `;
        render(template, this.container);

        if (this.postRenderCallback) {
            // Defer callback to next frame to ensure DOM is painted
            requestAnimationFrame(this.postRenderCallback);
        }
    }
}

export default VirtualizedList;

if (!customElements.get('virtualized-list')) {
    customElements.define('virtualized-list', VirtualizedList);
}
