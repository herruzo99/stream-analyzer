import { useUiStore } from '@/state/uiStore';

/**
 * Base class for Chart components that need to react to theme changes.
 * Subclasses must implement a `render()` method.
 */
export class BaseChartComponent extends HTMLElement {
    constructor() {
        super();
        this._themeUnsubscribe = null;
    }

    /**
     * Abstract method that must be implemented by subclasses.
     */
    render() {
        console.warn(
            `${this.constructor.name}: render() method not implemented`
        );
    }

    connectedCallback() {
        this._themeUnsubscribe = useUiStore.subscribe((state, prevState) => {
            if (state.theme !== prevState.theme) {
                this.render();
            }
        });
    }

    disconnectedCallback() {
        if (this._themeUnsubscribe) {
            this._themeUnsubscribe();
            this._themeUnsubscribe = null;
        }
    }
}
