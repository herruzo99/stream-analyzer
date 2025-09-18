import { html, render } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { analysisState, dom } from '../state.js';
import { startMpdUpdatePolling, stopMpdUpdatePolling } from '../mpd-poll.js';
import xmlFormatter from 'xml-formatter';

let togglePollingBtn; // Still need a reference for external updates

const escapeHtml = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const mpdUpdatesTemplate = (stream) => {
    if (analysisState.streams.length > 1) {
        return html`<p class="warn">
            MPD update polling is only supported when analyzing a single stream.
        </p>`;
    }
    if (!stream || stream.mpd.getAttribute('type') !== 'dynamic') {
        return html`<p class="info">
            This is a static MPD. No updates are expected.
        </p>`;
    }

    const { mpdUpdates, activeMpdUpdateIndex } = analysisState;
    const updateCount = mpdUpdates.length;
    const currentIndex =
        updateCount > 0 ? updateCount - activeMpdUpdateIndex : 1;
    const totalCount = updateCount > 0 ? updateCount : 1;

    let currentDisplay;
    if (updateCount === 0) {
        const initialMpdString = new XMLSerializer().serializeToString(
            stream.mpd
        );
        const formattedInitialMpd = xmlFormatter(initialMpdString, {
            indentation: '  ',
            lineSeparator: '\n',
        });
        currentDisplay = html` <div class="text-sm text-gray-400 mb-2">
                Initial MPD loaded:
            </div>
            <div class="diff-container">
                <span>${escapeHtml(formattedInitialMpd)}</span>
            </div>`;
    } else {
        const currentUpdate = mpdUpdates[activeMpdUpdateIndex];
        currentDisplay = html` <div class="text-sm text-gray-400 mb-2">
                Update received at:
                <span class="font-semibold text-gray-200"
                    >${currentUpdate.timestamp}</span
                >
            </div>
            <div class="diff-container">
                ${unsafeHTML(currentUpdate.diffHtml)}
            </div>`;
    }

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
                    id="prev-mpd-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Previous Update (Right Arrow)"
                    ?disabled=${activeMpdUpdateIndex >= updateCount - 1}
                    @click=${() => navigateMpdUpdates(1)}
                >
                    &lt;
                </button>
                <span
                    id="mpd-index-display"
                    class="text-gray-400 font-semibold w-16 text-center"
                    >${currentIndex}/${totalCount}</span
                >
                <button
                    id="next-mpd-btn"
                    class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    title="Next Update (Left Arrow)"
                    ?disabled=${activeMpdUpdateIndex <= 0}
                    @click=${() => navigateMpdUpdates(-1)}
                >
                    &gt;
                </button>
            </div>
        </div>
        <div id="current-mpd-update" class="mpd-update-entry">
            ${currentDisplay}
        </div>`;
};

export function renderMpdUpdates(streamId) {
    const updatesContainer = /** @type {HTMLDivElement} */ (
        dom.tabContents.updates.querySelector('#mpd-updates-content')
    );
    if (!updatesContainer) return;
    const stream = analysisState.streams.find((s) => s.id === streamId);
    render(mpdUpdatesTemplate(stream), updatesContainer);
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
        if (stream && stream.mpd.getAttribute('type') === 'dynamic') {
            startMpdUpdatePolling(stream);
        }
    } else {
        stopMpdUpdatePolling();
    }
    updatePollingButton();
}

export function updatePollingButton() {
    if (!togglePollingBtn) return;
    const stream = analysisState.streams[0];
    if (
        !stream ||
        stream.mpd.getAttribute('type') !== 'dynamic' ||
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

export function navigateMpdUpdates(direction) {
    const { mpdUpdates } = analysisState;
    if (mpdUpdates.length === 0) return;

    let newIndex = analysisState.activeMpdUpdateIndex + direction;
    newIndex = Math.max(0, Math.min(newIndex, mpdUpdates.length - 1));

    if (newIndex !== analysisState.activeMpdUpdateIndex) {
        analysisState.activeMpdUpdateIndex = newIndex;
        renderMpdUpdates(analysisState.activeStreamId);
    }
}
