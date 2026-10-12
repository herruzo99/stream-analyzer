import { uiActions, useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';

/**
 * Base class for all Views in the application.
 * Standardizes lifecycle (mount/unmount), shell interactions, and cleanups.
 */
export class BaseView {
    constructor() {
        /** @type {HTMLElement | null} */
        this.container = null;
        /** @type {Array<Function>} */
        this.subscriptions = [];
        /** @type {Set<string>} */
        this.activeSlots = new Set();
        /** @type {Object | null} */
        this.stream = null;
        /** @type {Object | null} */
        this.context = null;

        // Default Configuration
        this.hasContextualSidebar = true;
    }

    // =========================================================================
    // LIFECYCLE METHODS (Called by MainRenderer)
    // =========================================================================

    /**
     * Mounts the view into the DOM.
     * @param {HTMLElement} container - The DOM element to render into.
     * @param {Object} context - Context object usually containing { stream, streams }.
     */
    mount(container, context = {}) {
        this.container = container;
        this.context = context;
        if (context.stream) {
            this.stream = context.stream;
        }

        // Automatic Reactivity: Re-render on UI Store changes (except shell updates)
        // This ensures views react to global state like 'playerControlMode' without manual wiring.
        this.subscribe(useUiStore, (state, prevState) => {
            if (!prevState) return;

            // Prevent Infinite Loop:
            // View Render -> setShellSlot -> Update 'shell' -> View Render ...
            const keys = Object.keys(state);
            const nonShellChanges = keys.some(key =>
                key !== 'shell' && state[key] !== prevState[key]
            );

            if (nonShellChanges) {
                // Determine if we should render. 
                // We rely on the View being smart enough or lit-html being fast enough.
                // But mostly, we rely on AppShell NOT re-rendering the DOM if the slot content is the same.
                this.render();
            }
        });

        this.onMount();
        this.render();
    }

    /**
     * Unmounts the view and performs cleanup.
     * @param {HTMLElement} [container] - Optional container (legacy compatibility).
     */
    unmount(container) {
        this.cleanupSubscriptions();
        this.cleanupShellSlots();
        this.onUnmount();

        if (this.container) {
            render(html``, this.container);
        } else if (container) {
            // Fallback for legacy calls that pass container but instance didn't store it?
            // Or just ignore. BaseView insists on storing container in mount.
            render(html``, container);
        }

        this.container = null;
        this.stream = null;
        this.context = null;
    }

    /**
     * Called when the view becomes the active tab (for persistent views).
     * @param {any} data - generic data passed by renderer
     */
    activate(data) {
        this.onActivate(data);
    }

    /**
     * Called when the view is no longer the active tab (for persistent views).
     */
    deactivate() {
        this.onDeactivate();
    }

    // =========================================================================
    // HOOKS (To be implemented by Subclasses)
    // =========================================================================

    /**
     * Initialization hook called during mount().
     */
    onMount() { }

    /**
     * Cleanup hook called during unmount().
     */
    onUnmount() { }

    /**
     * Hook called during activate().
     * @param {any} data
     */
    onActivate(data) { }

    /**
     * Hook called during deactivate().
     */
    onDeactivate() { }

    /**
     * Returns the main template to render.
     * @returns {import('lit-html').TemplateResult}
     */
    renderTemplate() {
        return html`<div>BaseView Template</div>`;
    }

    // =========================================================================
    // CORE FUNCTIONALITY
    // =========================================================================

    /**
     * Triggers a render of the view.
     */
    render() {
        if (!this.container) return;
        const template = this.renderTemplate();
        if (template) {
            render(template, this.container);
        }
    }

    /**
     * Subscribes to a store and automatically handles cleanup on unmount.
     * @param {Object} store - Zustand store (useXStore)
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe functions
     */
    subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        this.subscriptions.push(unsub);
        return unsub;
    }

    /**
     * Cleans up all active subscriptions.
     */
    cleanupSubscriptions() {
        this.subscriptions.forEach((unsub) => unsub());
        this.subscriptions = [];
    }

    // =========================================================================
    // SHELL INTEGRATION
    // =========================================================================

    /**
     * Intejects content into an App Shell slot and tracks it for cleanup.
     * @param {string} slotName - 'globalNav' | 'subNav' | 'topBar' | 'bottomBar' | 'rightSidebar' | 'main'
     * @param {import('lit-html').TemplateResult | null} content - Content to render
     * @param {Object} [config] - Optional slot configuration (e.g. { padding: false })
     */
    setShellSlot(slotName, content, config) {
        uiActions.setShellSlot(slotName, content, config);
        // We track all slots we touch, even if setting to null, to ensure we reset them cleanly if needed?
        // Actually, mostly we want to track NON-NULL sets to clear them later.
        // But if we change config (like padding), we should track that too.
        this.activeSlots.add(slotName);
    }

    /**
     * Updates global shell configuration.
     * @param {Object} config 
     */
    setShellConfig(config) {
        uiActions.setShellConfig(config);
    }

    /**
     * Enables or disables the default padding on the Main Shell Slot.
     * @param {boolean} enable - True to enable padding (default), False for edge-to-edge.
     */
    setMainPadding(enable) {
        this.setShellSlot('main', null, { padding: enable });
    }

    /**
     * Clears all shell slots managed by this view.
     */
    cleanupShellSlots() {
        // 1. Reset specific slots we touched
        this.activeSlots.forEach((slotName) => {
            if (slotName === 'main') {
                // Determine sensible default for main: Padding ON
                uiActions.setShellSlot('main', null, { padding: true });
            } else {
                uiActions.setShellSlot(slotName, null);
            }
        });
        this.activeSlots.clear();
    }
}
