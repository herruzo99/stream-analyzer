/**
 * <compliance-sidebar> — contextual sidebar for the compliance view.
 *
 * Reconstructed for the port (imported but never committed). Composes the
 * existing navigation + issue-list pieces from the stream in `.data`.
 */
import { html, render } from 'lit-html';
import { navigationTemplate } from './navigation.js';
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
            render(html``, this);
            return;
        }
        const updates = stream.manifestUpdates || [];
        const currentUpdate =
            updates.find((u) => u.id === stream.activeManifestUpdateId) ||
            updates[0];
        const issues = currentUpdate?.complianceResults || [];
        render(
            html`
                <div class="flex flex-col h-full min-h-0 gap-3">
                    ${navigationTemplate(stream)}
                    <div class="grow min-h-0 overflow-y-auto custom-scrollbar">
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
