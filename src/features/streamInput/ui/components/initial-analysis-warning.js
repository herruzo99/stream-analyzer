
import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { closeModal } from '@/ui/services/modalService';

export const initialAnalysisWarningTemplate = (failedInputs) => {
    const handleProceed = () => {
        closeModal();
        eventBus.dispatch(EVENTS.UI.PROCEED_WITH_PARTIAL_ANALYSIS);
    };

    const handleEdit = () => {
        closeModal();
        eventBus.dispatch(EVENTS.UI.EDIT_ANALYSIS_INPUT);
    };

    return html`
        <div class="flex flex-col h-full bg-[var(--bg-glass-B-6)] overflow-hidden">
            <div class="p-6">
                <div class="flex items-center gap-3 text-[var(--color-warning)] mb-2">
                    <div class="w-8 h-8 rounded-full bg-[var(--color-warning)]/10 flex items-center justify-center">
                        ${icons.alertTriangle}
                    </div>
                    <h2 class="text-xl font-bold">Analysis Partial Failure</h2>
                </div>
                <p class="text-[var(--text-on-B-secondary)] text-sm">
                    Some streams could not be analyzed. You can proceed with the successful streams (failed streams will be marked as disabled) or go back to edit your inputs.
                </p>
            </div>

            <div class="grow overflow-y-auto p-6">
                <h3 class="text-xs font-bold text-[var(--text-on-B-secondary)] uppercase tracking-wider mb-3">Failed Streams</h3>
                <div class="space-y-3">
                    ${failedInputs.map(
        (item) => html`
                            <div class="bg-[var(--bg-glass-B-2)] rounded-lg p-4 flex gap-4 items-start">
                                <div class="text-[var(--color-error)] mt-1 shrink-0">
                                    ${icons.xCircle}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="font-bold text-[var(--text-on-B-primary)] truncate" title="${item.input.url}">
                                        ${item.input.name || item.input.url}
                                    </div>
                                    <div class="text-xs text-[var(--text-on-B-secondary)] font-mono break-all mt-1">
                                        ${item.input.url}
                                    </div>
                                    <div class="mt-2 text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 px-2 py-1 rounded inline-block">
                                        ${item.error}
                                    </div>
                                </div>
                            </div>
                        `
    )}
                </div>
            </div>

            <div class="p-6 bg-[var(--bg-glass-B-6)] flex justify-end gap-3 shrink-0">
                <button
                    @click=${handleEdit}
                    class="px-4 py-2 text-sm font-bold text-[var(--text-on-B-secondary)] hover:text-[var(--text-on-B-primary)] transition-colors rounded-lg hover:bg-[var(--bg-glass-B-2)]"
                >
                    Edit Inputs
                </button>
                <button
                    @click=${handleProceed}
                    class="px-6 py-2 bg-[var(--color-warning)]/20 hover:bg-[var(--color-warning)]/30 text-[var(--color-warning)] text-sm font-bold rounded-lg transition-colors shadow-lg shadow-[var(--color-warning)]/10 hover:shadow-[var(--color-warning)]/20"
                >
                    Proceed with Errors
                </button>
            </div>
        </div>
    `;
};
