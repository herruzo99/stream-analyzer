import { html, render } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { closeModal } from '@/ui/services/modalService';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { aboutModalTemplate } from './about-modal.js';
import { segmentPollingSelectorTemplate } from '@/ui/shell/components/segment-polling-selector';
import '@/features/manifestPatcher/ui/manifest-patcher.js';
import '@/features/streamInput/ui/components/smart-input.js';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';

let dom;
let wasOpen = false;
let unsubscribeUiStore = null;
let unsubscribeAnalysisStore = null;

function handleAddStreams() {
    const { streamInputs } = useAnalysisStore.getState();
    closeModal();
    eventBus.dispatch(EVENTS.UI.ADD_STREAMS_REQUESTED, {
        inputs: streamInputs,
    });
}

function handleRemovePending(e, id) {
    e.stopPropagation();
    analysisActions.removeStreamInput(id);
}

const pendingStreamRow = (input) => {
    const name = input.name || new URL(input.url).hostname;
    return html`
        <div
            class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 mb-2 group hover:border-slate-600 transition-colors"
        >
            <div class="flex items-center gap-3 min-w-0">
                <div
                    class="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400 shrink-0 border border-slate-600"
                >
                    ${input.file ? icons.fileText : icons.link}
                </div>
                <div class="min-w-0">
                    <div class="text-sm font-bold text-slate-200 truncate">
                        ${name}
                    </div>
                    <div class="text-[10px] font-mono text-slate-500 truncate">
                        ${input.url || input.file?.name}
                    </div>
                </div>
            </div>
            <button
                @click=${(e) => handleRemovePending(e, input.id)}
                class="text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-red-900/20 rounded"
                title="Remove from queue"
            >
                ${icons.xCircle}
            </button>
        </div>
    `;
};

function getContentTemplate(modalContent) {
    if (!modalContent) {
        return html``;
    }

    switch (modalContent.type) {
        case 'segmentAnalysis':
            return getSegmentAnalysisTemplate(
                modalContent.data.parsedData,
                modalContent.data.parsedDataB,
                modalContent.data.isIFrame
            );
        case 'scte35':
            return scte35DetailsTemplate(modalContent.data.scte35);
        case 'about':
            return aboutModalTemplate();
        case 'segmentPollingSelector':
            return segmentPollingSelectorTemplate();
        case 'manifestPatcher':
            return html`<manifest-patcher
                .streamId=${modalContent.data.streamId}
            ></manifest-patcher>`;
        case 'addStream':
            const { streamInputs, streams } = useAnalysisStore.getState();
            const activeIds = new Set(streams.map((s) => s.id));

            // Pending inputs are those in streamInputs that do not have a corresponding active stream
            // We check if the input's ID is NOT in the set of analyzed active stream IDs.
            const pendingInputs = streamInputs.filter(
                (i) => !activeIds.has(i.id)
            );
            const hasPending = pendingInputs.length > 0;

            return html`
                <div class="flex flex-col bg-slate-900 h-full overflow-hidden">
                    <div class="grow flex flex-col p-8 min-h-0 overflow-y-auto">
                        <div class="text-center mb-6 shrink-0">
                            <div
                                class="inline-flex p-3 bg-blue-500/10 rounded-full mb-3 text-blue-400 shadow-inner border border-blue-500/20"
                            >
                                ${icons.plusCircle}
                            </div>
                            <h3 class="text-xl font-bold text-white">
                                Add Stream
                            </h3>
                            <p
                                class="text-slate-400 text-sm mt-2 max-w-md mx-auto leading-relaxed"
                            >
                                Append new sources to your current workspace
                                without losing existing data.
                            </p>
                        </div>

                        <!-- Input Area -->
                        <div class="w-full max-w-2xl mx-auto shrink-0 mb-8">
                            <smart-input-component
                                mode="add"
                            ></smart-input-component>
                        </div>

                        <!-- Pending List Area -->
                        ${hasPending
                            ? html`
                                  <div
                                      class="w-full max-w-2xl mx-auto flex flex-col min-h-0 shrink-0 animate-fadeIn"
                                  >
                                      <div
                                          class="flex items-center justify-between mb-3 px-1"
                                      >
                                          <div class="flex items-center gap-2">
                                              <h4
                                                  class="text-xs font-bold uppercase tracking-wider text-slate-500"
                                              >
                                                  Staging Queue
                                              </h4>
                                              <span
                                                  class="px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded text-[10px] font-bold border border-blue-500/30"
                                                  >${pendingInputs.length}</span
                                              >
                                          </div>
                                          <span
                                              class="text-[10px] text-slate-600 italic"
                                              >Ready to analyze</span
                                          >
                                      </div>
                                      <div class="space-y-1">
                                          ${pendingInputs.map(pendingStreamRow)}
                                      </div>
                                  </div>
                              `
                            : ''}

                        <!-- Placeholder spacer if empty to push content up slightly -->
                        ${!hasPending ? html`<div class="grow"></div>` : ''}
                    </div>

                    <!-- Footer Actions -->
                    <div
                        class="p-4 bg-slate-800/50 border-t border-slate-800 flex justify-end gap-3 shrink-0 z-10"
                    >
                        <button
                            @click=${closeModal}
                            class="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            @click=${handleAddStreams}
                            ?disabled=${!hasPending}
                            class="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            ${icons.checkCircle} Add to Session
                        </button>
                    </div>
                </div>
            `;
        default:
            return html`<p class="text-red-400">
                Unknown modal content type: ${modalContent.type}
            </p>`;
    }
}

function renderModal() {
    if (!dom || !dom.segmentModal) return;

    const { modalState } = useUiStore.getState();
    const isOpen = modalState.isModalOpen;

    const isOpening = isOpen && !wasOpen;
    const isClosing = !isOpen && wasOpen;

    if (isOpening) {
        dom.modalTitle.textContent = modalState.modalTitle;

        // URL Bar Visibility Logic
        const hasUrl = !!modalState.modalUrl;
        dom.modalSegmentUrl.textContent = modalState.modalUrl;
        const urlContainer = dom.modalSegmentUrl.parentElement;
        if (urlContainer) {
            if (hasUrl) {
                urlContainer.classList.remove('hidden');
            } else {
                urlContainer.classList.add('hidden');
            }
        }

        render(
            getContentTemplate(modalState.modalContent),
            dom.modalContentArea
        );

        const modalContentContainer = dom.segmentModal.querySelector('div');
        if (modalContentContainer) {
            modalContentContainer.classList.toggle(
                'max-w-7xl',
                modalState.isModalFullWidth
            );
            modalContentContainer.classList.toggle(
                'max-w-4xl',
                !modalState.isModalFullWidth
            );
        }

        dom.segmentModal.classList.remove('hidden', 'modal-leave');
        dom.segmentModal.classList.add('modal-enter');
    } else if (isOpen) {
        // Re-render content if open to reflect store updates (e.g. adding/removing pending streams)
        render(
            getContentTemplate(modalState.modalContent),
            dom.modalContentArea
        );
    } else if (isClosing) {
        dom.segmentModal.classList.remove('modal-enter');
        dom.segmentModal.classList.add('modal-leave');

        dom.segmentModal.addEventListener(
            'animationend',
            (e) => {
                if (e.target !== dom.segmentModal) {
                    return;
                }
                dom.segmentModal.classList.add('hidden');
                if (useUiStore.getState().modalState.isModalOpen === false) {
                    dom.modalTitle.textContent = '';
                    dom.modalSegmentUrl.textContent = '';
                    render(html``, dom.modalContentArea);
                }
            },
            { once: true }
        );
    }

    wasOpen = isOpen;
}

export function initializeModalComponent(domContext) {
    dom = domContext;
    if (!dom.segmentModal || !dom.closeModalBtn) return;

    dom.segmentModal.addEventListener('click', (e) => {
        if (e.target === dom.segmentModal) {
            closeModal();
        }
    });

    dom.closeModalBtn.addEventListener('click', closeModal);

    wasOpen = useUiStore.getState().modalState.isModalOpen;

    if (unsubscribeUiStore) unsubscribeUiStore();
    if (unsubscribeAnalysisStore) unsubscribeAnalysisStore();

    // Subscribe to both stores to ensure the modal updates when inputs change
    unsubscribeUiStore = useUiStore.subscribe(renderModal);
    unsubscribeAnalysisStore = useAnalysisStore.subscribe(renderModal);

    if (wasOpen) {
        renderModal();
    }
}
