/**
 * <connected-right-sidebar> — telemetry + event log panel for the player
 * simulation view.
 *
 * Reconstructed for the port (imported but never committed). The usage
 * contract (`<connected-right-sidebar class="w-full h-full block">`,
 * self-updating) is fully visible at the call site; it composes the
 * existing event-log and telemetry-panel templates with live store data.
 */
import { html, render } from 'lit-html';
import { usePlayerStore } from '@/state/playerStore';
import { eventLogTemplate } from './event-log.js';
import { telemetryPanelTemplate } from './telemetry-panel.js';

class ConnectedRightSidebar extends HTMLElement {
    connectedCallback() {
        try {
            this._unsubscribe?.();
        } catch {
            /* ignore */
        }
        this._unsubscribe = usePlayerStore.subscribe(() => this.render());
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
        const { eventLog, currentStats } = usePlayerStore.getState();
        render(
            html`
                <div class="flex flex-col h-full min-h-0 gap-3">
                    <div
                        class="shrink-0 max-h-[45%] overflow-y-auto custom-scrollbar"
                    >
                        ${telemetryPanelTemplate(currentStats)}
                    </div>
                    <div class="grow min-h-0 overflow-y-auto custom-scrollbar">
                        ${eventLogTemplate(eventLog)}
                    </div>
                </div>
            `,
            this
        );
    }
}

if (!customElements.get('connected-right-sidebar')) {
    customElements.define('connected-right-sidebar', ConnectedRightSidebar);
}
