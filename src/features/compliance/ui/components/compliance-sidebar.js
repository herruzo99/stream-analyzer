/**
 * <compliance-sidebar> — contextual sidebar for the compliance view.
 * Scorecard on top, filterable issue list below. Single instance of the
 * list: the main pane shows summary + source, never a second list.
 */
import { html, render } from 'lit-html';
import './issue-list.js';

class ComplianceSidebar extends HTMLElement {
    constructor() {
        super();
        this._data = null;
    }

    set data(val) {
        this._data = val;
        if (this.isConnected) this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const stream = this._data?.stream;
        if (!stream) {
            render(
                html`<p class="mono text-[11px] text-slate-600 p-4">
                    Select a stream to see its findings.
                </p>`,
                this
            );
            return;
        }
        const updates = Array.isArray(stream.manifestUpdates)
            ? stream.manifestUpdates
            : [];
        const currentUpdate =
            updates.find((u) => u.id === stream.activeManifestUpdateId) ||
            updates[0];
        const issues = currentUpdate?.complianceResults || [];
        render(
            html`
                <div class="flex flex-col h-full min-h-0">
                    <div
                        class="px-3 py-2 border-b border-white/5 shrink-0 flex items-center justify-between gap-2"
                    >
                        <span
                            class="mono text-[11px] font-medium text-slate-400"
                            >findings</span
                        >
                        <span class="mono text-[10px] text-slate-600"
                            >${issues.length} check${issues.length === 1
                                ? ''
                                : 's'}</span
                        >
                    </div>
                    <div class="grow min-h-0 flex flex-col">
                        <compliance-issue-list
                            .data=${{ issues, stream }}
                        ></compliance-issue-list>
                    </div>
                </div>
            `,
            this
        );
    }
}

if (!customElements.get('compliance-sidebar')) {
    customElements.define('compliance-sidebar', ComplianceSidebar);
}
