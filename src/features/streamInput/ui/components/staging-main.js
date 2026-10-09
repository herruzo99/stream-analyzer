/**
 * <staging-main> — selected-source configuration pane for staging.
 *
 * Reconstructed for the port (imported but never committed). Wraps the
 * existing inspector panel, which already reads the active input from
 * the stores and handles preset save/load.
 */
import { html, render } from 'lit-html';
import { useAnalysisStore } from '@/state/analysisStore';
import { inspectorPanelTemplate } from './inspector-panel.js';

class StagingMain extends HTMLElement {
    connectedCallback() {
        this._unsubscribe?.();
        try {
            this._unsubscribe = useAnalysisStore.subscribe(() => this.render());
        } catch {
            this._unsubscribe = null;
        }
        this.render();
    }

    disconnectedCallback() {
        try {
            this._unsubscribe?.();
        } catch {
            /* ignore */
        }
        this._unsubscribe = null;
    }

    render() {
        render(
            html`
                <div class="h-full min-h-0 overflow-y-auto custom-scrollbar">
                    ${inspectorPanelTemplate()}
                </div>
            `,
            this
        );
    }
}

if (!customElements.get('staging-main')) {
    customElements.define('staging-main', StagingMain);
}
