import { eventBus } from '@/application/event-bus';
import { dashTimingCalculatorTemplate } from '@/features/interactiveManifest/ui/components/dash/timing-calculator-modal.js';
import '@/features/manifestPatcher/ui/manifest-patcher.js';
// We still import the file to register the custom element, but import the class to be sure (or just side effect)
import '@/features/networkAnalysis/ui/components/network-intervention-panel.js';
import '@/features/networkAnalysis/ui/components/response-viewer.js';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index';
import { memoryViewTemplate } from '@/features/settings/ui/memory-view.js';
import '@/features/streamInput/ui/components/smart-input.js';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { closeModal } from '@/ui/services/modalService';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { segmentPollingSelectorTemplate } from '@/ui/shell/components/segment-polling-selector';
import { html, render } from 'lit-html';
import { aboutModalTemplate } from './about-modal.js';

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
        case 'memoryManagement':
            return memoryViewTemplate();
        case 'segmentAnalysis':
            return getSegmentAnalysisTemplate(
                modalContent.data.parsedData,
                modalContent.data.parsedDataB,
                modalContent.data.isIFrame,
                modalContent.data.uniqueId
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
        case 'dashCalculator':
            return dashTimingCalculatorTemplate(modalContent.data);
        case 'networkIntervention':
            // Simple instantiation, logic is internal to component
            return html`<div class="h-full flex flex-col w-full">
                <network-intervention-panel></network-intervention-panel>
            </div>`;
        case 'networkResponse':
            return html`
                <div
                    class="h-full flex flex-col bg-slate-900 overflow-hidden p-4"
                >
                    <response-viewer
                        .event=${modalContent.data.event}
                        is-modal
                        class="h-full"
                    ></response-viewer>
                </div>
            `;
        case 'addStream': {
            const { streamInputs, streams } = useAnalysisStore.getState();
            const activeIds = new Set(streams.map((s) => s.id));

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
        }
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
            // Reset classes first
            modalContentContainer.className =
                'bg-slate-800 p-0 rounded-xl w-11/12 border border-slate-700 flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/10';

            // Apply Width logic
            if (modalState.isModalFullWidth) {
                modalContentContainer.classList.add('max-w-7xl');
            } else {
                modalContentContainer.classList.add('max-w-4xl');
            }

            // Apply Height logic
            if (modalState.modalContent?.type === 'memoryManagement') {
                modalContentContainer.classList.add('h-auto', 'max-h-[90vh]');
            } else {
                modalContentContainer.classList.add('h-[90vh]');
            }
        }

        dom.segmentModal.classList.remove('hidden', 'modal-leave');
        dom.segmentModal.classList.add('modal-enter');
    } else if (isOpen) {
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

    unsubscribeUiStore = useUiStore.subscribe(renderModal);
    unsubscribeAnalysisStore = useAnalysisStore.subscribe(renderModal);

    if (wasOpen) {
        renderModal();
    }
}
