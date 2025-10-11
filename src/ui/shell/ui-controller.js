import { html } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { startAnalysisUseCase } from '@/application/useCases/startAnalysis';
import { copyShareUrlToClipboard } from '@/ui/services/shareService';
import { copyDebugInfoToClipboard } from '@/ui/services/debugService';
import { UI_SELECTORS } from '@/ui/shared/constants';
import { stopAllMonitoring } from '@/application/services/primaryStreamMonitorService';
import { toggleAllLiveStreamsPolling } from '@/application/services/streamActionsService';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { container } from '@/application/container';
import { openModalWithContent } from '@/ui/services/modalService';
import { tooltipTriggerClasses } from '../shared/constants';

function handleNewAnalysis() {
    stopAllMonitoring();
    useSegmentCacheStore.getState().clear();
    analysisActions.startAnalysis();
}

/**
 * Renders the global controls for the results view.
 * @param {import('@/types.ts').Stream[]} streams
 * @returns {import('lit-html').TemplateResult}
 */
export const globalControlsTemplate = (streams) => {
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');
    if (streams.length === 0) return html``;

    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const wasStoppedByInactivity = liveStreams.some(
        (s) => s.wasStoppedByInactivity
    );

    const pollingButtonClass = isAnyPolling
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-green-600 hover:bg-green-700';

    const inactivityIcon =
        wasStoppedByInactivity && !isAnyPolling
            ? html`
                  <span
                      class="ml-2 ${tooltipTriggerClasses}"
                      data-tooltip="Polling was automatically paused due to background inactivity."
                  >
                      <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-5 w-5 text-yellow-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                      >
                          <path
                              d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
                          />
                      </svg>
                  </span>
              `
            : '';

    return html`
        ${liveStreams.length > 0
            ? html`<button
                  @click=${toggleAllLiveStreamsPolling}
                  class="${pollingButtonClass} text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center"
                  title="Toggle polling for all live streams"
              >
                  ${isAnyPolling ? 'Pause All' : 'Resume All'} ${inactivityIcon}
              </button>`
            : ''}
        <button
            @click=${copyShareUrlToClipboard}
            data-testid="share-analysis-btn"
            class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
            Share
        </button>
        <button
            @click=${copyDebugInfoToClipboard}
            data-testid="copy-debug-btn"
            class="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-4 rounded-md transition duration-300"
        >
            Copy Debug Info
        </button>
        <button
            @click=${handleNewAnalysis}
            data-testid="new-analysis-btn"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
            Analyze New Streams
        </button>
    `;
};

export class UiController {
    /**
     * @param {HTMLElement} rootElement The root element of the application.
     */
    constructor(rootElement) {
        this.root = rootElement;
        this._collectDomElements();
        this._initializeEventListeners();
    }

    _collectDomElements() {
        this.dom = {
            addStreamBtn: this.root.querySelector(UI_SELECTORS.AddStreamBtn),
            analyzeBtn: this.root.querySelector(UI_SELECTORS.AnalyzeBtn),
            clearAllBtn: this.root.querySelector(UI_SELECTORS.ClearAllBtn),
        };
    }

    _initializeEventListeners() {
        this.dom.addStreamBtn.addEventListener('click', () => {
            analysisActions.addStreamInput();
        });

        this.dom.analyzeBtn.addEventListener('click', () => {
            this._handleAnalysis();
        });

        this.dom.clearAllBtn.addEventListener('click', () => {
            analysisActions.clearAllStreamInputs();
        });

        // Global listener to close custom dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);

            // Close HLS context switcher if click is outside
            if (!target.closest('[data-hls-switcher-container]')) {
                document
                    .querySelectorAll('[data-hls-dropdown-panel]')
                    .forEach((panel) =>
                        panel.classList.add(
                            'opacity-0',
                            'scale-95',
                            '-translate-y-2.5',
                            'pointer-events-none'
                        )
                    );
            }

            // Close main stream switcher if click is outside
            if (!target.closest('[data-stream-switcher-container]')) {
                document
                    .querySelectorAll('[data-stream-dropdown-panel]')
                    .forEach((panel) =>
                        panel.classList.add(
                            'opacity-0',
                            'scale-95',
                            '-translate-y-2.5',
                            'pointer-events-none'
                        )
                    );
            }
        });
    }

    _handleAnalysis() {
        // Get inputs directly from the authoritative state store.
        const { streamInputs } = useAnalysisStore.getState();
        startAnalysisUseCase({ inputs: streamInputs }, container.services);
    }

    _showAboutModal(e) {
        e.preventDefault();
        openModalWithContent({
            title: 'About Stream Analyzer',
            url: 'v1.0.0',
            content: {
                type: 'about',
                data: {},
            },
        });
    }
}