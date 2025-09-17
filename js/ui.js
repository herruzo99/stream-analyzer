import { dom, analysisState } from './state.js';
import { getGlobalSummaryHTML } from './views/summary.js';
import { getComplianceReportHTML } from './views/compliance-report.js';
import { getTimelineAndVisualsHTML } from './views/timeline-visuals.js';
import { getFeaturesAnalysisHTML } from './views/features.js';
import { getInteractiveMpdHTML } from './views/interactive-mpd.js';
import { initializeSegmentExplorer, startSegmentFreshnessChecker, stopSegmentFreshnessChecker } from './views/segment-explorer.js';
import { renderComparisonTab } from './views/compare.js';
import { startMpdUpdatePolling, stopMpdUpdatePolling } from './mpd-poll.js';
import { renderMpdUpdates, updatePollingButton, navigateMpdUpdates } from './views/mpd-updates.js';
import { exampleStreams } from './helpers/stream-examples.js';

let keyboardNavigationListener = null;

export function addStreamInput() {
    const streamId = analysisState.streamIdCounter++;
    const isFirstStream = streamId === 0;

    const historyKey = 'dash_analyzer_history';
    const urlHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    const exampleOptions = exampleStreams.map(stream => `<option value="${stream.url}">${stream.name}</option>`).join('');
    const historyOptions = urlHistory.map(url => `<option value="${url}">${new URL(url).hostname}</option>`).join('');

    const inputHtml = `
        <div class="stream-input-group ${streamId > 0 ? 'border-t border-gray-700 pt-4 mt-4' : ''}" data-id="${streamId}">
            <div class="flex items-center justify-between mb-3">
                 <h3 class="text-lg font-semibold text-gray-300">Stream ${streamId + 1}</h3>
                 ${streamId > 0 ? '<button class="remove-stream-btn text-red-400 hover:text-red-600 font-bold text-sm">&times; Remove</button>' : ''}
            </div>
            
            <!-- Unified Input Row -->
            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 sm:col-span-9">
                    <input type="url" id="url-${streamId}" class="input-url w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-blue-500" placeholder="Enter MPD URL...">
                </div>
                <div class="col-span-12 sm:col-span-3 flex items-center">
                    <span class="text-gray-500 mx-4 hidden sm:inline">OR</span>
                    <label for="file-${streamId}" class="block w-full cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-center">Upload File</label>
                    <input type="file" id="file-${streamId}" class="input-file hidden" accept=".mpd, .xml">
                </div>
            </div>

            <!-- Helper Row -->
            <div class="grid grid-cols-12 gap-4 mt-2">
                 <div class="col-span-12 sm:col-span-9">
                    <select class="examples-dropdown w-full bg-gray-700 text-white rounded-md border-gray-600 p-2 text-sm">
                        <option value="">-- Select from Examples or History --</option>
                        <optgroup label="Examples">${exampleOptions}</optgroup>
                        ${historyOptions.length > 0 ? `<optgroup label="History">${historyOptions}</optgroup>` : ''}
                    </select>
                </div>
                <div class="col-span-12 sm:col-span-3 flex items-center">
                     <p class="file-name-display text-xs text-gray-500 h-4 pl-2"></p>
                </div>
            </div>
        </div>`;

    dom.streamInputs.insertAdjacentHTML('beforeend', inputHtml);

    const newGroup = dom.streamInputs.querySelector(`[data-id="${streamId}"]`);
    const urlInput = /** @type {HTMLInputElement} */ (newGroup.querySelector('.input-url'));
    const fileInput = /** @type {HTMLInputElement} */ (newGroup.querySelector('.input-file'));
    const examplesDropdown = /** @type {HTMLSelectElement} */ (newGroup.querySelector('.examples-dropdown'));

    if (isFirstStream && urlHistory.length > 0) {
        urlInput.value = urlHistory[0];
    }

    examplesDropdown.addEventListener('change', () => {
        if (examplesDropdown.value) {
            urlInput.value = examplesDropdown.value;
            fileInput.value = '';
            (newGroup.querySelector('.file-name-display')).textContent = '';
        }
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            (newGroup.querySelector('.file-name-display')).textContent = `Selected: ${file.name}`;
            urlInput.value = '';
            examplesDropdown.value = '';
        }
    });

    const removeBtn = newGroup.querySelector('.remove-stream-btn');
    if (removeBtn) removeBtn.addEventListener('click', () => newGroup.remove());
}

export function handleTabClick(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!target.classList.contains('tab') || target.offsetParent === null) return;

    stopSegmentFreshnessChecker();
    stopMpdUpdatePolling();

    if (keyboardNavigationListener) {
        document.removeEventListener('keydown', keyboardNavigationListener);
        keyboardNavigationListener = null;
    }

    dom.tabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('tab-active'));
    target.classList.add('tab-active');

    Object.values(dom.tabContents).forEach((c) => {
        if (c) c.classList.remove('tab-content-active');
    });
    const activeTabContent = dom.tabContents[target.dataset.tab];
    if (activeTabContent) activeTabContent.classList.add('tab-content-active');

    if (target.dataset.tab === 'explorer') {
        startSegmentFreshnessChecker();
    } else if (target.dataset.tab === 'updates') {
        if (analysisState.streams.length === 1 && analysisState.streams[0].mpd.getAttribute('type') === 'dynamic') {
            analysisState.isPollingActive = true;
            startMpdUpdatePolling(analysisState.streams[0]);
        }
        keyboardNavigationListener = (event) => {
            if (event.key === 'ArrowLeft') navigateMpdUpdates(1);
            if (event.key === 'ArrowRight') navigateMpdUpdates(-1);
        };
        document.addEventListener('keydown', keyboardNavigationListener);
    }
    updatePollingButton();
}

export function populateContextSwitcher() {
    if (analysisState.streams.length > 1) {
        dom.contextSwitcherContainer.classList.remove('hidden');
        dom.contextSwitcher.innerHTML = analysisState.streams
            .map((s) => `<option value="${s.id}">${s.name}</option>`)
            .join('');
        dom.contextSwitcher.value = String(analysisState.activeStreamId);
    } else {
        dom.contextSwitcherContainer.classList.add('hidden');
    }
}

export function renderAllTabs() {
    const hasMultipleStreams = analysisState.streams.length > 1;
    
    /** @type {HTMLElement} */
    (document.querySelector('.tab[data-tab="comparison"]')).style.display = hasMultipleStreams ? 'block' : 'none';
    /** @type {HTMLElement} */
    (document.querySelector('.tab[data-tab="summary"]')).style.display = hasMultipleStreams ? 'none' : 'block';

    if (hasMultipleStreams) {
        renderComparisonTab();
    }
    
    renderSingleStreamTabs(analysisState.activeStreamId);
}

export function renderSingleStreamTabs(streamId) {
    const stream = analysisState.streams.find((s) => s.id === streamId);
    if (!stream) return;
    const { mpd, baseUrl } = stream;

    if (analysisState.streams.length === 1 && dom.tabContents.summary) {
        dom.tabContents.summary.innerHTML = getGlobalSummaryHTML(mpd, false);
    }
    
    if (analysisState.streams.length > 1) {
        renderComparisonTab();
    }
    
    dom.tabContents.compliance.innerHTML = getComplianceReportHTML(mpd, false);
    dom.tabContents['timeline-visuals'].innerHTML = getTimelineAndVisualsHTML(mpd);
    dom.tabContents.features.innerHTML = getFeaturesAnalysisHTML(mpd);
    dom.tabContents['interactive-mpd'].innerHTML = getInteractiveMpdHTML(mpd);
    initializeSegmentExplorer(dom.tabContents.explorer, mpd, baseUrl);
    renderMpdUpdates(streamId);
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

export function createInfoTooltip(text, isoRef) {
    return `<span class="tooltip info-icon" data-tooltip="${text}" data-iso="${isoRef}">[?]</span>`;
}