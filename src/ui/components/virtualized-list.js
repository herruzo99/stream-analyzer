import { html, render } from 'lit-html';

class VirtualizedList extends HTMLElement {
    constructor() {
        super();
        this.items = [];
        /** @type {(item: any) => import('lit-html').TemplateResult} */
        this.rowTemplate = (item) => html``;
        this.rowHeight = 40; // Default row height in pixels
        this.visibleStartIndex = 0;
        this.visibleEndIndex = 0;
        this.paddingTop = 0;
        this.paddingBottom = 0;
        this.isScrolledToBottom = true; // Start assuming we're at the bottom
        this._onScroll = this._onScroll.bind(this);
    }

    connectedCallback() {
        // Render directly into the Light DOM, not a Shadow DOM.
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
    }

    disconnectedCallback() {
        this.removeEventListener('scroll', this._onScroll);
        this.resizeObserver.unobserve(this);
    }

    _onScroll() {
        const isAtBottom =
            this.scrollTop + this.clientHeight >= this.scrollHeight - 10;
        this.isScrolledToBottom = isAtBottom;
        this._updateVisibleItems();
    }

    _updateVisibleItems() {
        const totalHeight = this.items.length * this.rowHeight;
        this.visibleStartIndex = Math.floor(this.scrollTop / this.rowHeight);
        this.visibleEndIndex = Math.min(
            this.items.length - 1,
            Math.ceil((this.scrollTop + this.clientHeight) / this.rowHeight)
        );

        this.paddingTop = this.visibleStartIndex * this.rowHeight;
        this.paddingBottom =
            totalHeight - (this.visibleEndIndex + 1) * this.rowHeight;

        this._render();
    }

    _render() {
        const visibleItems = this.items.slice(
            this.visibleStartIndex,
            this.visibleEndIndex + 1
        );

        // Apply padding directly to the container
        this.container.style.paddingTop = `${this.paddingTop}px`;
        this.container.style.paddingBottom = `${this.paddingBottom}px`;

        const template = html`
            ${visibleItems.map((item) => this.rowTemplate(item))}
        `;
        render(template, this.container);
    }

    /**
     * @param {any[]} newItems
     * @param {(item: any) => import('lit-html').TemplateResult} newRowTemplate
     * @param {number} newRowHeight
     */
    updateData(newItems, newRowTemplate, newRowHeight) {
        const hadItems = this.items.length > 0;
        const newCount = newItems.length;
        const oldCount = this.items.length;

        this.items = newItems;
        this.rowTemplate = newRowTemplate;
        this.rowHeight = newRowHeight;

        this._updateVisibleItems();

        if (hadItems && newCount > oldCount && this.isScrolledToBottom) {
            setTimeout(() => {
                this.scrollTop = this.scrollHeight;
            }, 0);
        }
    }
}

// Avoid re-defining the custom element if it already exists
if (!customElements.get('virtualized-list')) {
    customElements.define('virtualized-list', VirtualizedList);
}
