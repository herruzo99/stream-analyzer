import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { analysisState, dom } from '../../core/state.js';
import {
    startManifestUpdatePolling,
    stopManifestUpdatePolling,
} from './poll.js';
import xmlFormatter from 'xml-formatter';

let togglePollingBtn; // Still need a reference for external updates

const manifestUpdatesTemplate = (stream) => {
    if (analysisState.streams.length > 1) {
        return html`<p class="warn">
            Manifest update polling is only supported when analyzing a single
            stream.
        </p>`;
    }
    if (!stream || stream.manifest.type !== 'dynamic') {
        return html`<p class="info">
            This is a static manifest. No updates are expected.
        </p>`;
    }

    const { manifestUpdates, activeManifestUpdateIndex } = analysisState;
    const updateCount = manifestUpdates.length;

    // This view should only be rendered for dynamic streams, which will have an initial update.
    if (updateCount === 0) {
        return html`<p class="info">Awaiting first manifest update...</p>`;
    }

    const currentIndex = updateCount - activeManifestUpdateIndex;
    const currentUpdate = manifestUpdates[activeManifestUpdateIndex];
    const lines = currentUpdate.diffHtml.split('\n');
    const updateLabel =
        activeManifestUpdateIndex === manifestUpdates.length - 1
            ? 'Initial Manifest loaded:'
            : 'Update received at:';

    const currentDisplay = html` <div class="text-sm text-gray-400 mb-2">
            ${updateLabel}
            <span class="font-semibold text-gray-200"
                >${currentUpdate.timestamp}</span
            >
        </div>
        <div
            class="bg-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto"
        >
            ${lines.map(
                (line, i) => html`
                    <div class="flex">
                        <span
                            class="text-right text-gray-500 pr-4 select-none flex-shrink-0 w-10"
                            >${i + 1}</span
                        >
                        <span
                            class="flex-grow whitespace-pre-wrap break-all"
                            >${unsafeHTML(line)}</span
                        >
                    </div>
                `
            )}
        </div>`;

    return html` <div
            class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0"
        >
            <button
                id="toggle-polling-btn"
                class="px-4 py-2 rounded-md font-bold transition duration-300 w-full sm:w-auto text-white"
                @click=${togglePollingState}
            >
                <!-- Content set by updatePollingButton -->
            </button>
            <div class="flex items-center space-x-2">
                <button
                    id="prev-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Previous Update (Right Arrow)"
                    ?disabled=${activeManifestUpdateIndex >= updateCount - 1}
                    @click=${() => navigateManifestUpdates(1)}
                >
                    &lt;
                </button>
                <span
                    id="manifest-index-display"
                    class="text-gray-400 font-semibold w-16 text-center"
                    >${currentIndex}/${updateCount}</span
                >
                <button
                    id="next-manifest-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Next Update (Left Arrow)"
                    ?disabled=${activeManifestUpdateIndex <= 0}
                    @click=${() => navigateManifestUpdates(-1)}
                >
                    &gt;
                </button>
            </div>
        </div>
        <div id="current-manifest-update" class="manifest-update-entry">
            ${currentDisplay}
        </div>`;
};

export function renderManifestUpdates(streamId) {
    const updatesContainer = /** @type {HTMLDivElement} */ (
        dom.tabContents.updates.querySelector('#mpd-updates-content')
    );
    if (!updatesContainer) return;
    const stream = analysisState.streams.find((s) => s.id === streamId);
    render(manifestUpdatesTemplate(stream), updatesContainer);
    // Keep a reference to the button for external updates
    togglePollingBtn = document.getElementById('toggle-polling-btn');
    updatePollingButton();
}

function togglePollingState() {
    analysisState.isPollingActive = !analysisState.isPollingActive;
    if (analysisState.isPollingActive) {
        const stream = analysisState.streams.find(
            (s) => s.id === analysisState.activeStreamId
        );
        if (stream && stream.manifest.type === 'dynamic') {
            // Provide a callback to re-render this view upon update.
            const onUpdateCallback = () => renderManifestUpdates(stream.id);
            startManifestUpdatePolling(stream, onUpdateCallback);
        }
    } else {
        stopManifestUpdatePolling();
    }
    updatePollingButton();
}

export function updatePollingButton() {
    if (!togglePollingBtn) return;
    const stream = analysisState.streams[0];
    if (
        !stream ||
        stream.manifest.type !== 'dynamic' ||
        analysisState.streams.length > 1
    ) {
        togglePollingBtn.style.display = 'none';
        return;
    }
    togglePollingBtn.style.display = 'block';
    togglePollingBtn.textContent = analysisState.isPollingActive
        ? 'Stop Polling'
        : 'Start Polling';
    togglePollingBtn.classList.toggle(
        'bg-red-600',
        analysisState.isPollingActive
    );
    togglePollingBtn.classList.toggle(
        'hover:bg-red-700',
        analysisState.isPollingActive
    );
    togglePollingBtn.classList.toggle(
        'bg-blue-600',
        !analysisState.isPollingActive
    );
    togglePollingBtn.classList.toggle(
        'hover:bg-blue-700',
        !analysisState.isPollingActive
    );
}

export function navigateManifestUpdates(direction) {
    const { manifestUpdates } = analysisState;
    if (manifestUpdates.length === 0) return;

    let newIndex = analysisState.activeManifestUpdateIndex + direction;
    newIndex = Math.max(0, Math.min(newIndex, manifestUpdates.length - 1));

    if (newIndex !== analysisState.activeManifestUpdateIndex) {
        analysisState.activeManifestUpdateIndex = newIndex;
        renderManifestUpdates(analysisState.activeStreamId);
    }
}