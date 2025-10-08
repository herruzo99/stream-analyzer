import { html } from 'lit-html';
import {
    useAnalysisStore,
    analysisActions,
} from '@/state/analysisStore.js';
import { addStreamInput } from '@/ui/components/stream-inputs.js';
import { startAnalysisUseCase } from '@/application/useCases/startAnalysis.js';
import { copyShareUrlToClipboard } from '@/ui/services/shareService.js';
import { copyDebugInfoToClipboard } from '@/ui/services/debugService.js';
import { UI_SELECTORS } from '@/ui/shared/constants.js';
import { stopAllMonitoring } from '@/application/services/primaryStreamMonitorService.js';
import {
    toggleAllLiveStreamsPolling,
    reloadStream,
} from '@/application/services/streamActionsService.js';
import { useSegmentCacheStore } from '@/state/segmentCacheStore.js';
import { container } from '@/application/container.js';

/**
 * Renders the global controls for live streams (toggle polling, reload).
 * @param {import('@/types.ts').Stream[]} streams
 * @returns {import('lit-html').TemplateResult}
 */
export const globalControlsTemplate = (streams) => {
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');
    if (liveStreams.length === 0) return html``;

    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const { activeStreamId } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    return html`
        <button
            @click=${toggleAllLiveStreamsPolling}
            class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
            title="Toggle polling for all live streams"
        >
            ${isAnyPolling ? 'Pause All' : 'Resume All'}
        </button>
        <button
            @click=${() => reloadStream(activeStream)}
            class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
            title="Force reload the manifest for the active stream"
        >
            Reload
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
            streamInputsContainer: this.root.querySelector('#stream-inputs'),
            addStreamBtn: this.root.querySelector(UI_SELECTORS.AddStreamBtn),
            analyzeBtn: this.root.querySelector(UI_SELECTORS.AnalyzeBtn),
            clearAllBtn: this.root.querySelector(UI_SELECTORS.ClearAllBtn),
            newAnalysisBtn: this.root.querySelector(
                UI_SELECTORS.NewAnalysisBtn
            ),
            shareAnalysisBtn: this.root.querySelector(
                UI_SELECTORS.ShareAnalysisBtn
            ),
            copyDebugBtn: this.root.querySelector(UI_SELECTORS.CopyDebugBtn),
            contextSwitcher: this.root.querySelector(
                UI_SELECTORS.ContextSwitcher
            ),
        };
    }

    _initializeEventListeners() {
        this.dom.addStreamBtn.addEventListener('click', () => {
            addStreamInput();
        });

        this.dom.analyzeBtn.addEventListener('click', () => {
            this._handleAnalysis();
        });

        this.dom.newAnalysisBtn.addEventListener('click', () => {
            stopAllMonitoring();
            // Reset stores before showing input view
            useSegmentCacheStore.getState().clear();
            analysisActions.startAnalysis();
        });

        this.dom.clearAllBtn.addEventListener('click', () => {
            analysisActions.resetStreamInputIds();
        });

        this.dom.contextSwitcher.addEventListener('change', (e) => {
            const target = /** @type {HTMLSelectElement} */ (e.target);
            analysisActions.setActiveStreamId(parseInt(target.value, 10));
        });

        this.dom.shareAnalysisBtn.addEventListener(
            'click',
            copyShareUrlToClipboard
        );
        this.dom.copyDebugBtn.addEventListener(
            'click',
            copyDebugInfoToClipboard
        );
    }

    _handleAnalysis() {
        const inputGroups = this.dom.streamInputsContainer.querySelectorAll(
            '[data-testid="stream-input-group"]'
        );

        const inputs = Array.from(inputGroups).map((group) => {
            const id = parseInt(
                /** @type {HTMLElement} */ (group).dataset.id,
                10
            );
            const urlInput = /** @type {HTMLInputElement} */ (
                group.querySelector('.input-url')
            );
            const nameInput = /** @type {HTMLInputElement} */ (
                group.querySelector('.input-name')
            );
            const fileInput = /** @type {HTMLInputElement} */ (
                group.querySelector('.input-file')
            );
            return {
                id,
                url: urlInput.value,
                name: nameInput.value,
                file: fileInput.files.length > 0 ? fileInput.files[0] : null,
            };
        });

        // Call the authoritative use case, providing it with all necessary services from the container.
        startAnalysisUseCase({ inputs }, container.services);
    }
}