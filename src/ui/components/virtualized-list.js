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
        this._onScroll = this._onScroll.bind(this);
    }

    // --- Property Setters for Reactivity ---
    set items(newItems) {
        if (this._items === newItems) return;

        // --- PERFORMANCE FIX: Preserve scroll position across updates ---
        const oldScrollTop = this.scrollTop;
        const oldScrollHeight = this.scrollHeight;
        const isScrolledToBottom =
            oldScrollHeight > 0 &&
            oldScrollTop + this.clientHeight >= oldScrollHeight - 10;
        // --- END FIX ---

        this._items = newItems;
        this._updateVisibleItems();

        // --- PERFORMANCE FIX: Restore scroll position after render ---
        // Use requestAnimationFrame to ensure this runs after the DOM has been updated by lit-html
        requestAnimationFrame(() => {
            if (isScrolledToBottom) {
                this.scrollTop = this.scrollHeight;
            } else {
                this.scrollTop = oldScrollTop;
            }
        });
        // --- END FIX ---
    }

    get items() {
        return this._items;
    }

    set rowTemplate(newTemplate) {
        if (this._rowTemplate === newTemplate) return;
        this._rowTemplate = newTemplate;
        this._updateVisibleItems();
    }

    get rowTemplate() {
        return this._rowTemplate;
    }

    set rowHeight(newHeight) {
        if (this._rowHeight === newHeight) return;
        this._rowHeight = newHeight;
        this._updateVisibleItems();
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

        this.container = document.createElement('div');
        this.container.className =
            'list-container relative overflow-hidden w-full';
        this.appendChild(this.container);

        this.addEventListener('scroll', this._onScroll);
        this.resizeObserver = new ResizeObserver(() =>
            this._updateVisibleItems()
        );
        this.resizeObserver.observe(this);

        this._updateVisibleItems();
    }

    disconnectedCallback() {
        this.removeEventListener('scroll', this._onScroll);
        this.resizeObserver.unobserve(this);
    }

    _onScroll() {
        this._updateVisibleItems();
    }

    _updateVisibleItems() {
        if (!this._items || !this._rowHeight) return;

        const totalHeight = this._items.length * this._rowHeight;
        this.visibleStartIndex = Math.floor(this.scrollTop / this._rowHeight);

        const numItemsInView = Math.ceil(this.clientHeight / this._rowHeight);
        this.visibleEndIndex = Math.min(
            this._items.length - 1,
            this.visibleStartIndex + numItemsInView + 1
        );

        this.paddingTop = this.visibleStartIndex * this._rowHeight;
        this.paddingBottom =
            totalHeight - (this.visibleEndIndex + 1) * this._rowHeight;

        this._render();
    }

    _render() {
        if (!this.container) return;

        const visibleItems = this._items.slice(
            this.visibleStartIndex,
            this.visibleEndIndex + 1
        );

        this.container.style.paddingTop = `${this.paddingTop}px`;
        this.container.style.paddingBottom = `${this.paddingBottom}px`;

        const template = html`
            ${visibleItems.map((item, index) =>
                this._rowTemplate(item, this.visibleStartIndex + index)
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