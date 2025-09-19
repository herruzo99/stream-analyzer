import { html, render } from 'lit-html';
import { dom, analysisState } from './state.js';
import { getGlobalSummaryTemplate } from './features/summary/view.js';
import {
    getComplianceReportTemplate,
    attachComplianceFilterListeners,
} from './features/compliance/view.js';
import { getTimelineAndVisualsTemplate } from './features/timeline-visuals/view.js';
import { getFeaturesAnalysisTemplate } from './features/feature-analysis/view.js';
import { getInteractiveManifestTemplate } from './features/interactive-manifest/view.js';
import { getInteractiveSegmentTemplate } from './features/interactive-segment/view.js';
import {
    initializeSegmentExplorer,
    startSegmentFreshnessChecker,
    stopSegmentFreshnessChecker,
} from './features/segment-explorer/view.js';
import { getComparisonTemplate } from './features/comparison/view.js';
import {
    startManifestUpdatePolling,
    stopManifestUpdatePolling,
} from './features/manifest-updates/poll.js';
import {
    renderManifestUpdates,
    updatePollingButton,
    navigateManifestUpdates,
} from './features/manifest-updates/view.js';
import { exampleStreams } from './data/example-streams.js';

let keyboardNavigationListener = null;

export const tooltipTriggerClasses =
    'cursor-help border-b border-dotted border-blue-500/40 transition-colors hover:bg-blue-500/15 hover:border-solid';

const streamInputTemplate = (
    streamId,
    isFirstStream,
    urlHistory,
    exampleStreams
) => {
    const exampleOptions = exampleStreams.map(
        (stream) => html`<option value="${stream.url}">${stream.name}</option>`
    );
    const historyOptions = urlHistory.map((url) => {
        try {
            return html`<option value="${url}">
                ${new URL(url).hostname}
            </option>`;
        } catch (_e) {
            return html`<option value="${url}">${url}</option>`;
        }
    });

    const removeHandler = (e) => {
        /** @type {HTMLElement} */ (e.target)
            .closest('.stream-input-group')
            .remove();
    };

    return html` <div
        class="stream-input-group ${streamId > 0
            ? 'border-t border-gray-700 pt-6 mt-6'
            : ''}"
        data-id="${streamId}"
    >
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-gray-300">
                Stream ${streamId + 1}
            </h3>
            ${streamId > 0
                ? html`<button
                      class="remove-stream-btn text-red-400 hover:text-red-600 font-bold text-sm"
                      @click=${removeHandler}
                  >
                      &times; Remove
                  </button>`
                : ''}
        </div>
        <div class="space-y-3">
            <div class="flex flex-col sm:flex-row items-center gap-4">
                <input
                    type="url"
                    id="url-${streamId}"
                    class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Manifest URL..."
                    .value=${isFirstStream && urlHistory.length > 0
                        ? urlHistory[0]
                        : ''}
                />
                <span class="text-gray-500">OR</span>
                <label
                    for="file-${streamId}"
                    class="block w-full sm:w-auto cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center flex-shrink-0"
                    >Upload File</label
                >
                <input
                    type="file"
                    id="file-${streamId}"
                    class="input-file hidden"
                    accept=".mpd, .xml, .m3u8"
                    @change=${handleFileChange}
                />
            </div>
            <div class="flex flex-col sm:flex-row items-center gap-4">
                <select
                    class="examples-dropdown w-full bg-gray-700 text-white rounded-md border-gray-600 p-2 text-sm"
                    @change=${handleDropdownChange}
                >
                    <option value="">
                        -- Select from Examples or History --
                    </option>
                    <optgroup label="Examples">${exampleOptions}</optgroup>
                    ${historyOptions.length > 0
                        ? html`<optgroup label="History">
                              ${historyOptions}
                          </optgroup>`
                        : ''}
                </select>
                <p
                    class="file-name-display text-xs text-gray-500 h-4 w-full sm:w-auto flex-shrink-0"
                ></p>
            </div>
        </div>
    </div>`;
};

const handleFileChange = (e) => {
    const fileInput = /** @type {HTMLInputElement} */ (e.target);
    const group = fileInput.closest('.stream-input-group');
    const file = fileInput.files[0];
    if (file) {
        group.querySelector('.file-name-display').textContent =
            `Selected: ${file.name}`;
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-url')
        ).value = '';
        /** @type {HTMLSelectElement} */ (
            group.querySelector('.examples-dropdown')
        ).value = '';
    }
};

const handleDropdownChange = (e) => {
    const dropdown = /** @type {HTMLSelectElement} */ (e.target);
    const group = dropdown.closest('.stream-input-group');
    if (dropdown.value) {
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-url')
        ).value = dropdown.value;
        /** @type {HTMLInputElement} */ (
            group.querySelector('.input-file')
        ).value = '';
        group.querySelector('.file-name-display').textContent = '';
    }
};

export function addStreamInput() {
    const streamId = analysisState.streamIdCounter++;
    const isFirstStream = streamId === 0;
    const urlHistory = JSON.parse(
        localStorage.getItem('dash_analyzer_history') || '[]'
    );

    const container = document.createElement('div');
    render(
        streamInputTemplate(
            streamId,
            isFirstStream,
            urlHistory,
            exampleStreams
        ),
        container
    );
    dom.streamInputs.appendChild(container.firstElementChild);
}

export function handleTabClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const targetTab = /** @type {HTMLElement} */ (target.closest('[data-tab]'));
    if (!targetTab) return;

    stopSegmentFreshnessChecker();
    stopManifestUpdatePolling();

    if (keyboardNavigationListener) {
        document.removeEventListener('keydown', keyboardNavigationListener);
        keyboardNavigationListener = null;
    }

    const activeClasses = ['border-blue-600', 'text-gray-100', 'bg-gray-700'];
    const inactiveClasses = ['border-transparent'];

    dom.tabs.querySelectorAll('[data-tab]').forEach((t) => {
        t.classList.remove(...activeClasses);
        t.classList.add(...inactiveClasses);
    });
    targetTab.classList.add(...activeClasses);
    targetTab.classList.remove(...inactiveClasses);

    Object.values(dom.tabContents).forEach((c) => {
        if (c) c.classList.add('hidden');
    });
    const activeTabContent = dom.tabContents[targetTab.dataset.tab];
    if (activeTabContent) activeTabContent.classList.remove('hidden');

    // Re-render state-dependent tabs when they are clicked
    if (targetTab.dataset.tab === 'interactive-segment') {
        render(
            getInteractiveSegmentTemplate(),
            dom.tabContents['interactive-segment']
        );
    }

    if (targetTab.dataset.tab === 'explorer') {
        startSegmentFreshnessChecker();
    } else if (targetTab.dataset.tab === 'updates') {
        // Only start polling if the state indicates it should be active.
        if (
            analysisState.isPollingActive &&
            analysisState.streams.length === 1 &&
            analysisState.streams[0].manifest.type === 'dynamic'
        ) {
            const stream = analysisState.streams[0];
            const onUpdateCallback = () => renderManifestUpdates(stream.id);
            startManifestUpdatePolling(stream, onUpdateCallback);
        }
        keyboardNavigationListener = (event) => {
            if (event.key === 'ArrowLeft') navigateManifestUpdates(1);
            if (event.key === 'ArrowRight') navigateManifestUpdates(-1);
        };
        document.addEventListener('keydown', keyboardNavigationListener);
    }
    updatePollingButton();
}

export function populateContextSwitcher() {
    if (analysisState.streams.length > 1) {
        dom.contextSwitcherContainer.classList.remove('hidden');
        const optionsTemplate = analysisState.streams.map(
            (s) => html`<option value="${s.id}">${s.name}</option>`
        );
        render(optionsTemplate, dom.contextSwitcher);
        dom.contextSwitcher.value = String(analysisState.activeStreamId);
    } else {
        dom.contextSwitcherContainer.classList.add('hidden');
    }
}

export function renderAllTabs() {
    const hasMultipleStreams = analysisState.streams.length > 1;

    /** @type {HTMLElement} */
    (document.querySelector('[data-tab="comparison"]')).style.display =
        hasMultipleStreams ? 'block' : 'none';
    /** @type {HTMLElement} */
    (document.querySelector('[data-tab="summary"]')).style.display =
        hasMultipleStreams ? 'none' : 'block';

    if (hasMultipleStreams) {
        render(getComparisonTemplate(), dom.tabContents.comparison);
    }

    renderSingleStreamTabs(analysisState.activeStreamId);
}

export function renderSingleStreamTabs(streamId) {
    const stream = analysisState.streams.find((s) => s.id === streamId);
    if (!stream) return;
    const { manifest, baseUrl } = stream;

    // Only render summary tab if it's a single stream view
    if (analysisState.streams.length === 1) {
        render(getGlobalSummaryTemplate(manifest), dom.tabContents.summary);
    }

    // Comparison tab is handled by renderAllTabs

    render(getComplianceReportTemplate(manifest.rawElement), dom.tabContents.compliance);
    // After rendering the compliance template, attach its specific listeners.
    attachComplianceFilterListeners();

    render(
        getTimelineAndVisualsTemplate(manifest.rawElement),
        dom.tabContents['timeline-visuals']
    );
    render(getFeaturesAnalysisTemplate(manifest), dom.tabContents.features);
    render(
        getInteractiveManifestTemplate(manifest.rawElement),
        dom.tabContents['interactive-mpd']
    );
    render(getInteractiveSegmentTemplate(), dom.tabContents['interactive-segment']);
    initializeSegmentExplorer(dom.tabContents.explorer, manifest, baseUrl); // This view manages its own complex rendering
    renderManifestUpdates(streamId);
}

export function showStatus(message, type) {
    const colors = {
        info: 'text-blue-400',
        pass: 'text-green-400',
        warn: 'text-yellow-400',
        fail: 'text-red-400',
    };
    dom.status.textContent = message;
    dom.status.className = `text-center my-4 ${colors[type]}`;
}