import { html, render } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';
import { closeModal } from '@/ui/services/modalService';
import * as icons from '@/ui/icons';
import '@/features/streamInput/ui/components/smart-input.js';
import '@/ui/components/modal-frame.js';

export class AddStreamModal extends HTMLElement {
    constructor() {
        super();
        this.pendingInputs = [];
        this.streams = [];
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.updateState();
        this.unsubscribe = useAnalysisStore.subscribe(() => {
            this.updateState();
        });

        // Initial render
        this.render();
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    updateState() {
        const { streamInputs, streams } = useAnalysisStore.getState();
        const activeIds = new Set(streams.map((s) => s.id));
        this.pendingInputs = streamInputs.filter((i) => !activeIds.has(i.id));
        this.streams = streams;
        this.render(); // Re-render on state change
    }

    handleAddStreams() {
        const { streamInputs } = useAnalysisStore.getState();
        closeModal();
        eventBus.dispatch(EVENTS.UI.ADD_STREAMS_REQUESTED, {
            inputs: streamInputs,
        });
    }

    handleRemovePending(e, id) {
        e.stopPropagation();
        analysisActions.removeStreamInput(id);
    }

    renderPendingRow(input) {
        const name = input.name || new URL(input.url).hostname;
        return html`
            <div class="flex items-center justify-between p-3 bg-[var(--bg-surface-B-panel)]/50 rounded-lg border border-[var(--border-on-B)]/50 mb-2 group hover:border-[var(--text-on-B-secondary)]/50 transition-colors">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded bg-[var(--bg-surface-B-panel)] flex items-center justify-center text-[var(--text-on-B-secondary)] shrink-0 border border-[var(--border-on-B)]">
                        ${input.file ? icons.fileText : icons.link}
                    </div>
                    <div class="min-w-0">
                        <div class="text-sm font-bold text-[var(--text-on-B-primary)] truncate">
                            ${name}
                        </div>
                        <div class="text-[10px] font-mono text-[var(--text-on-B-secondary)] truncate">
                            ${input.url || input.file?.name}
                        </div>
                    </div>
                </div>
                <button
                    @click=${(e) => this.handleRemovePending(e, input.id)}
                    class="text-[var(--text-on-B-secondary)] hover:text-[var(--color-error)] transition-colors p-1.5 hover:bg-[var(--color-error)]/20 rounded"
                    title="Remove from queue"
                >
                    ${icons.xCircle}
                </button>
            </div>
        `;
    }

    render() {
        // Since we aren't using Shadow DOM here (unless we want to), we render to 'this'.
        // However, modal-frame expects to be at the root.
        // We can just render directly into 'this' as it is a light DOM component structure.

        const hasPending = this.pendingInputs.length > 0;

        const template = html`
            <style>
                add-stream-modal {
                    display: contents;
                }
            </style>
            <modal-frame title="Add Stream" size="md">
                <div class="p-8 flex flex-col items-center">
                    <div class="text-center mb-6 shrink-0 w-full">
                        <div class="inline-flex p-3 bg-[var(--primary-accent)]/10 rounded-full mb-3 text-[var(--primary-accent)] shadow-inner border border-[var(--primary-accent)]/20">
                            ${icons.plusCircle}
                        </div>
                        <p class="text-[var(--text-on-B-secondary)] text-sm mt-2 max-w-md mx-auto leading-relaxed">
                            Append new sources to your current workspace without losing existing data.
                        </p>
                    </div>

                    <!-- Input Area -->
                    <div class="w-full max-w-xl mx-auto shrink-0 mb-8">
                        <smart-input-component mode="add"></smart-input-component>
                    </div>

                    <!-- Pending List Area -->
                    ${hasPending ? html`
                        <div class="w-full max-w-xl mx-auto flex flex-col min-h-0 shrink-0 animate-fadeIn">
                            <div class="flex items-center justify-between mb-3 px-1">
                                <div class="flex items-center gap-2">
                                    <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--text-on-B-secondary)]">
                                        Staging Queue
                                    </h4>
                                    <span class="px-1.5 py-0.5 bg-[var(--primary-accent-hover)]/30 text-[var(--primary-accent)] rounded text-[10px] font-bold border border-[var(--primary-accent)]/30">
                                        ${this.pendingInputs.length}
                                    </span>
                                </div>
                                <span class="text-[10px] text-[var(--text-on-B-secondary)] italic">Ready to analyze</span>
                            </div>
                            <div class="space-y-1">
                                ${this.pendingInputs.map(i => this.renderPendingRow(i))}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div slot="footer" class="flex justify-end gap-3 w-full">
                    <button
                        @click=${closeModal}
                        class="px-4 py-2 text-sm font-bold text-[var(--text-on-B-secondary)] hover:text-[var(--text-on-B-primary)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        @click=${() => this.handleAddStreams()}
                        ?disabled=${!hasPending}
                        class="px-5 py-2 bg-[var(--primary-accent-hover)] hover:bg-[var(--primary-accent)] disabled:bg-[var(--bg-surface-B-panel)] disabled:text-[var(--text-on-B-secondary)] text-[var(--text-on-B-primary)] text-sm font-bold rounded-lg shadow-lg shadow-[var(--primary-accent)]/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        ${icons.checkCircle} Add to Session
                    </button>
                </div>
            </modal-frame>
        `;

        render(template, this);
    }
}

customElements.define('add-stream-modal', AddStreamModal);
