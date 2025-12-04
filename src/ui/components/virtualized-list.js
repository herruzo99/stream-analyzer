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

    set items(newItems) {
        if (this._items === newItems) return;

        // If disconnected, just update state and return to avoid layout thrashing
        if (!this.isConnected) {
            this._items = newItems;
            return;
        }

        let oldScrollTop = 0;
        let oldScrollHeight = 0;

        // Optimization: Only read layout properties if we are likely visible
        // offsetParent is null if display:none or detached
        if (this.offsetParent !== null) {
            oldScrollTop = this.scrollTop;
            oldScrollHeight = this.scrollHeight;
        }

        const isScrolledToBottom =
            oldScrollHeight > 0 &&
            oldScrollTop + this.clientHeight >= oldScrollHeight - 10;

        this._items = newItems;
        this._updateVisibleItems();

        // Restore scroll position in the next frame to allow layout to settle
        requestAnimationFrame(() => {
            if (!this.isConnected) return;

            if (isScrolledToBottom) {
                this.scrollTop = this.scrollHeight;
            } else if (oldScrollTop > 0) {
                // Only try to restore if we had a valid scroll position
                // Check if we drifted significantly to avoid fighting user scroll
                if (Math.abs(this.scrollTop - oldScrollTop) > 20) {
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
        // strict = size + layout + paint + style containment
        this.style.contain = 'strict';
        this.style.display = 'block';
        this.style.height = '100%';
        this.style.overflowY = 'auto';

        // ARCHITECTURAL FIX: Constraints to force wrapping
        // Ensure the host element cannot exceed its parent's width
        this.style.width = '100%';
        this.style.maxWidth = '100%';

        // Allow horizontal scroll control via CSS classes on the instance (e.g. style="overflow-x: hidden")
        // But default to relative positioning
        this.style.position = 'relative';

        if (!this.container) {
            this.container = document.createElement('div');
            // CRITICAL FIX: max-w-full on the inner container ensures that
            // long text lines inside rows will respect the host width boundary
            // and trigger the break-word/break-all behavior.
            this.container.className =
                'list-container relative w-full max-w-full';
            this.appendChild(this.container);
        }

        this.addEventListener('scroll', this._onScroll, { passive: true });

        this.resizeObserver = new ResizeObserver(() => {
            this._scheduleUpdate();
        });
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

    requestUpdate() {
        this._scheduleUpdate();
    }

    _scheduleUpdate() {
        if (this._animationFrameId !== null) return;
        this._animationFrameId = requestAnimationFrame(() => {
            this._animationFrameId = null;
            // Double-check connection status inside the RAF callback
            if (this.isConnected) {
                this._updateVisibleItems();
            }
        });
    }

    _onScroll() {
        if (this.isConnected) this._scheduleUpdate();
    }

    _onResize() {
        if (this.isConnected) this._scheduleUpdate();
    }

    _updateVisibleItems() {
        if (
            !this.isConnected ||
            !this._items ||
            !this._rowHeight ||
            !this.container
        )
            return;

        const scrollTop = this.scrollTop;
        const clientHeight = this.clientHeight;

        // If hidden (height 0), skip calculation to save resources
        if (clientHeight === 0) return;

        const totalItems = this._items.length;
        const totalHeight = totalItems * this._rowHeight;

        // Buffer rows: Render a few extra rows above/below for smoother scrolling
        const buffer = 4;
        const visibleStartIndex = Math.max(
            0,
            Math.floor(scrollTop / this._rowHeight) - buffer
        );
        const numItemsInView = Math.ceil(clientHeight / this._rowHeight);
        const visibleEndIndex = Math.min(
            totalItems - 1,
            visibleStartIndex + numItemsInView + buffer * 2
        );

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
            ${Array.from(visibleItems).map((item, index) =>
                this._rowTemplate(item, startIndex + index)
            )}
        `;

        render(template, this.container);

        if (this.postRenderCallback) {
            requestAnimationFrame(this.postRenderCallback);
        }
    }
}

export default VirtualizedList;
if (!customElements.get('virtualized-list')) {
    customElements.define('virtualized-list', VirtualizedList);
}
