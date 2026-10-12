import { html, render } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import { themeRegistry } from '@/ui/layout-engine/theme-registry';

/**
 * Base class for Web Components that use Shadow DOM and the Prism Glass theme system.
 * Automatically handles:
 * 1. Shadow DOM attachment.
 * 2. Theme Stylesheet adoption (and updates on theme change).
 * 3. Static Component Stylesheet adoption.
 * 4. Cleanup of subscriptions.
 */
export class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._unsubTheme = null;
    }

    /**
     * Define component-specific styles here.
     * Can return a CSS string or a CSSStyleSheet instance.
     * @returns {string|CSSStyleSheet}
     */
    static get styles() {
        return '';
    }

    connectedCallback() {
        // Initial style adoption (Sync)
        this.adoptThemeStyles();

        // Subscribe to theme changes
        this._unsubTheme = useUiStore.subscribe((state, prevState) => {
            if (state.shell.config.activeThemeId !== prevState?.shell?.config?.activeThemeId) {
                this.adoptThemeStyles();
            }
        });

        // Ensure global styles are loaded (Async)
        // Check if already loaded to avoid flicker
        if (!themeRegistry.getGlobalStyleSheet()) {
            themeRegistry.loadGlobalStyles().then(() => {
                this.adoptThemeStyles(); // Re-adopt when loaded
            });
        }

        this.onMount();
        this.render();
    }

    disconnectedCallback() {
        if (this._unsubTheme) {
            this._unsubTheme();
            this._unsubTheme = null;
        }
        this.onUnmount();
    }

    /**
     * Optional lifecycle hook called after connectedCallback and initial style adoption.
     */
    onMount() { }

    /**
     * Optional lifecycle hook called during disconnectedCallback.
     */
    onUnmount() { }

    /**
     * Fetches the active theme stylesheet and combines it with component styles.
     * Applies the result to the Shadow DOM.
     */
    adoptThemeStyles() {
        if (!this.shadowRoot) return;

        const { shell } = useUiStore.getState();
        const activeThemeId = shell?.config?.activeThemeId || 'prism-glass';

        // 1. Get Theme Sheet (Cached, Shadow Mode)
        const themeSheet = themeRegistry.getThemeStyleSheet(activeThemeId, 'shadow');

        // 2. Get Component Sheet
        let componentStyles = /** @type {typeof BaseComponent} */ (this.constructor).styles;
        if (typeof componentStyles === 'string' && componentStyles.trim() !== '') {
            // Convert string to sheet if needed (and cache it on the constructor if possible? 
            // For simplicity, we create it here, but ideally we'd cache it on the class)
            // To avoid re-creating sheet every time, subclasses should ideally return a cached sheet,
            // or we can implement a cache here.
            componentStyles = this._getComponentStyleSheet(componentStyles);
        }

        const sheets = [];

        // 0. Global Layout Styles (Tailwind)
        const globalSheet = themeRegistry.getGlobalStyleSheet();
        if (globalSheet) sheets.push(globalSheet);

        // 1. Theme Styles
        if (themeSheet) sheets.push(themeSheet);

        if (componentStyles instanceof CSSStyleSheet) {
            sheets.push(componentStyles);
        }

        this.shadowRoot.adoptedStyleSheets = sheets;
    }

    /**
     * Helper to convert static style string to Constructible Stylesheet, cached on the class.
     * @param {string} css
     * @returns {CSSStyleSheet}
     */
    _getComponentStyleSheet(css) {
        // Check if we already cached it on the constructor
        const ctor = /** @type {any} */ (this.constructor);
        if (ctor._cachedSheet) {
            return ctor._cachedSheet;
        }

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        ctor._cachedSheet = sheet;
        return sheet;
    }

    /**
     * Main render method. Should be called by subclass when state changes.
     */
    render() {
        const template = this.renderTemplate();
        if (template) {
            render(template, this.shadowRoot);
        }
    }

    /**
     * Template to render. Must be implemented by subclass.
     * @returns {import('lit-html').TemplateResult}
     */
    renderTemplate() {
        return html`<div>BaseComponent</div>`;
    }
}
