import { html } from 'lit-html';
import { BaseComponent } from './BaseComponent.js';
import '@/ui/components/modal-frame.js';

/**
 * Base class for Modal Content components.
 * Extends BaseComponent to add modal-specific capabilities:
 * 1. `close()` method to dispatch 'close' event.
 * 2. Automatic wrapping in `<modal-frame>` (optional).
 */
export class BaseModal extends BaseComponent {
    constructor() {
        super();
        this._title = '';
        this._size = 'md';
        this._noHeader = false;
    }

    get title() { return this._title; }
    set title(val) {
        if (this._title !== val) {
            this._title = val;
            this.render();
        }
    }

    get size() { return this._size; }
    set size(val) {
        if (this._size !== val) {
            this._size = val;
            this.render();
        }
    }

    get noHeader() { return this._noHeader; }
    set noHeader(val) {
        if (this._noHeader !== val) {
            this._noHeader = val;
            this.render();
        }
    }

    /**
     * Override in subclass to provide the inner content of the modal.
     * @returns {import('lit-html').TemplateResult}
     */
    renderContent() {
        return html`<div>Override renderContent() in your modal subclass.</div>`;
    }

    /**
     * Helper to close the modal.
     */
    close() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    /**
     * Main render method.
     * Wraps user content in a <modal-frame> by default.
     * Subclasses can override renderTemplate() if they need full control (e.g. no frame).
     */
    renderTemplate() {
        return html`
            <modal-frame
                .title=${this.title}
                .size=${this.size}
                .noHeader=${this.noHeader}
                @close=${() => this.close()}
            >
                ${this.renderContent()}
            </modal-frame>
        `;
    }
}
