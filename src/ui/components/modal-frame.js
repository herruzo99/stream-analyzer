import { themeRegistry } from '@/ui/layout-engine/theme-registry.js';
import { prismGlassTheme } from '@/ui/layout-engine/themes/prism-glass.js';
import { useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
import * as icons from '@/ui/icons';

// Define static component styles once (Constructible Stylesheet)
const componentStyles = new CSSStyleSheet();
componentStyles.replaceSync(`
    :host {
        display: block;
        position: fixed;
        inset: 0;
        /* 
           Z-Index Strategy:
           - App Shell Main: 40
           - App Shell Bottom Bar: 50
           - App Shell Sub Nav: 60
           - App Shell Global Nav: 70
           - App Shell Right Sidebar: 80
           - Modals: 200 (Must be above all shell panels)
         */
        z-index: 200;
    }

    *, *::before, *::after {
        box-sizing: border-box;
    }

    .backdrop {
        position: absolute;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        animation: fadeIn 0.2s ease-out;
    }

    .container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        pointer-events: none;
    }

    .frame {
        pointer-events: auto;
        position: relative;
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        width: 100%;
        
        background: var(--bg-glass-B-6, rgba(20, 20, 20, 0.9));
        backdrop-filter: var(--region-backdrop, blur(24px));
        border: 1px solid var(--border-on-B, rgba(255,255,255,0.1));
        border-radius: var(--region-radius, 2rem);
        box-shadow: var(--region-shadow, 0 20px 40px -4px rgba(0,0,0,0.4));
        overflow: hidden;
        
        animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        transition: max-width 0.3s ease;
        color: var(--text-on-B-primary, white);
    }

    /* Sizes */
    .size-sm { max-width: 24rem; }
    .size-md { max-width: 32rem; }
    .size-lg { max-width: 56rem; }
    .size-xl { max-width: 80rem; }
    .size-2xl { max-width: 106rem; }
    .size-full { max-width: 98vw; height: 95vh; }

    /* Plain Mode */
    .plain {
        background: transparent;
        backdrop-filter: none;
        border: none;
        box-shadow: none;
        border-radius: 0;
    }

    /* Header */
    header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-on-B, rgba(255,255,255,0.1));
        background: var(--bg-glass-B-1, rgba(255,255,255,0.05));
    }

    h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-on-B-primary, white);
        letter-spacing: -0.025em;
    }

    .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 9999px;
        border: none;
        background: transparent;
        color: var(--text-on-B-secondary, #aaa);
        cursor: pointer;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: var(--bg-surface-B-panel-opaque, rgba(255,255,255,0.1));
        color: var(--text-on-B-primary, white);
    }
    
    .close-btn svg {
        width: 20px;
        height: 20px;
    }

    /* Content */
    .content {
        flex-grow: 1;
        overflow-y: auto;
        scrollbar-width: thin;
    }

    /* Footer */
    footer {
        flex-shrink: 0;
    }
    
    /* Animations */
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }
`);

export class ModalFrame extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'size', 'plain', 'no-header'];
    }

    constructor() {
        super();
        this._title = '';
        this._size = 'lg';
        this._plain = false;
        this._noHeader = false;
        this.unsub = null;
    }

    // ... getters/setters omitted (same as before) ...

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

    get plain() { return this._plain; }
    /** @param {boolean|string} val */
    set plain(val) {
        const newVal = val === '' || val === 'true' || val === true;
        if (this._plain !== newVal) {
            this._plain = newVal;
            this.render();
        }
    }

    get noHeader() { return this._noHeader; }
    /** @param {boolean|string} val */
    set noHeader(val) {
        const newVal = val === '' || val === 'true' || val === true;
        if (this._noHeader !== newVal) {
            this._noHeader = newVal;
            this.render();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'title':
                this.title = newValue;
                break;
            case 'size':
                this.size = newValue;
                break;
            case 'plain':
                this.plain = newValue;
                break;
            case 'no-header':
                this.noHeader = newValue;
                break;
        }
    }

    connectedCallback() {
        this.render();

        // Subscribe to theme changes to update layout variables
        this.unsub = useUiStore.subscribe((state) => {
            // Re-adopt styles if theme changes
            // We don't necessarily need to re-render the HTML structure if only CSS changes
            this.adoptThemeStyles();
        });

        // Initial adoption
        this.adoptThemeStyles();
    }

    adoptThemeStyles() {
        if (!this.shadowRoot) return;

        const { shell } = useUiStore.getState();
        const activeThemeId = shell?.config?.activeThemeId || 'prism-glass';

        const themeSheet = themeRegistry.getThemeStyleSheet(activeThemeId, 'shadow');

        // Combine Theme Sheet + Static Component Sheet
        // Theme sheet comes first (variables), component sheet second (consumers)
        const sheets = [];
        if (themeSheet) sheets.push(themeSheet);
        sheets.push(componentStyles);

        this.shadowRoot.adoptedStyleSheets = sheets;
    }

    disconnectedCallback() {
        if (this.unsub) {
            this.unsub();
            this.unsub = null;
        }
    }

    _handleClose(e) {
        // ... same logic ...
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
            this.adoptThemeStyles();
        }

        const isBackdrop = e.target.classList.contains('backdrop');
        const isCloseBtn = e.currentTarget && e.currentTarget.classList.contains('close-btn');

        if (isBackdrop || isCloseBtn) {
            this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        }
    }

    handleBackdropClick = (e) => {
        if (e.target.classList.contains('backdrop')) {
            this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        }
    }

    handleCloseBtnClick = (e) => {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    render() {
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
            this.adoptThemeStyles();
        }

        const template = html`
            <div class="backdrop" @click=${this.handleBackdropClick}>
                <div class="container">
                    <div class="frame size-${this._size} ${this._plain ? 'plain' : ''}">
                        
                        ${!this._plain && !this._noHeader ? html`
                            <header>
                                <slot name="header">
                                    <h2>${this._title}</h2>
                                </slot>
                                <button class="close-btn" @click=${this.handleCloseBtnClick} aria-label="Close">
                                    ${icons.x}
                                </button>
                            </header>
                        ` : ''}

                        <div class="content">
                            <slot></slot>
                        </div>
                        
                        <footer>
                            <slot name="footer"></slot>
                        </footer>
                    </div>
                </div>
            </div>
        `;

        render(template, this.shadowRoot);
    }
}

customElements.define('modal-frame', ModalFrame);
