import { analysisState, dom } from '../state.js';
import { startMpdUpdatePolling, stopMpdUpdatePolling } from '../mpd-poll.js';
import { diffMpd } from '../api/mpd-diff.js';
import xmlFormatter from 'xml-formatter';

let togglePollingBtn;
let prevMpdBtn;
let nextMpdBtn;
let mpdIndexDisplay;
let currentMpdUpdateContainer;

export function renderMpdUpdates(streamId) {
    const updatesContainer = dom.tabContents.updates.querySelector('#mpd-updates-content');
    if (!updatesContainer) return;

    const stream = analysisState.streams.find(s => s.id === streamId);
    
    let content = '';
    if (analysisState.streams.length > 1) {
        content = '<p class="warn">MPD update polling is only supported when analyzing a single stream.</p>';
    } else if (!stream || stream.mpd.getAttribute('type') !== 'dynamic') {
        content = '<p class="info">This is a static MPD. No updates are expected.</p>';
    } else {
        content = `
            <div class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0">
                <button id="toggle-polling-btn" class="px-4 py-2 rounded-md font-bold transition duration-300 w-full sm:w-auto text-white">
                    <!-- Text/State will be set by updatePollingButton -->
                </button>
                <div class="flex items-center space-x-2">
                    <button id="prev-mpd-btn" class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50" title="Previous Update (Right Arrow)">&lt;</button>
                    <span id="mpd-index-display" class="text-gray-400 font-semibold w-16 text-center">1/1</span>
                    <button id="next-mpd-btn" class="px-4 py-2 rounded-md font-bold transition duration-300 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50" title="Next Update (Left Arrow)">&gt;</button>
                </div>
            </div>
            <div id="current-mpd-update" class="mpd-update-entry"></div>
        `;
    }
    updatesContainer.innerHTML = content;

    if (stream && stream.mpd.getAttribute('type') === 'dynamic' && analysisState.streams.length === 1) {
        togglePollingBtn = document.getElementById('toggle-polling-btn');
        prevMpdBtn = document.getElementById('prev-mpd-btn');
        nextMpdBtn = document.getElementById('next-mpd-btn');
        mpdIndexDisplay = document.getElementById('mpd-index-display');
        currentMpdUpdateContainer = document.getElementById('current-mpd-update');

        togglePollingBtn.addEventListener('click', togglePollingState);
        prevMpdBtn.addEventListener('click', () => navigateMpdUpdates(1)); // Reversed for chronological order
        nextMpdBtn.addEventListener('click', () => navigateMpdUpdates(-1)); // Reversed for chronological order

        updateMpdDisplay();
        updatePollingButton();
    }
}

function updateMpdDisplay() {
    const { mpdUpdates, activeMpdUpdateIndex } = analysisState;
    if (!currentMpdUpdateContainer) return;

    if (analysisState.mpdUpdates.length === 0) {
        const initialMpdString = new XMLSerializer().serializeToString(analysisState.streams[0].mpd);
        const formattedInitialMpd = xmlFormatter(initialMpdString, { indentation: '  ', lineSeparator: '\n' });
        currentMpdUpdateContainer.innerHTML = `<div class="text-sm text-gray-400 mb-2">Initial MPD loaded:</div><div class="diff-container"><span>${escapeHtml(formattedInitialMpd)}</span></div>`;
        mpdIndexDisplay.textContent = '1/1';
        prevMpdBtn.disabled = true;
        nextMpdBtn.disabled = true;
        return;
    }

    const currentUpdate = mpdUpdates[activeMpdUpdateIndex];
    currentMpdUpdateContainer.innerHTML = `
        <div class="text-sm text-gray-400 mb-2">Update received at: <span class="font-semibold text-gray-200">${currentUpdate.timestamp}</span></div>
        <div class="diff-container">${currentUpdate.diffHtml}</div>
    `;
    // Display is in chronological order, so index is reversed from array order
    mpdIndexDisplay.textContent = `${mpdUpdates.length - activeMpdUpdateIndex}/${mpdUpdates.length}`;

    prevMpdBtn.disabled = activeMpdUpdateIndex >= mpdUpdates.length - 1;
    nextMpdBtn.disabled = activeMpdUpdateIndex <= 0;
}

function togglePollingState() {
    analysisState.isPollingActive = !analysisState.isPollingActive;
    if (analysisState.isPollingActive) {
        const stream = analysisState.streams.find(s => s.id === analysisState.activeStreamId);
        if (stream && stream.mpd.getAttribute('type') === 'dynamic') {
            startMpdUpdatePolling(stream);
        }
    } else {
        stopMpdUpdatePolling();
    }
    updatePollingButton();
}

export function updatePollingButton() {
    if (togglePollingBtn) {
        const stream = analysisState.streams[0];
        if (!stream || stream.mpd.getAttribute('type') !== 'dynamic' || analysisState.streams.length > 1) {
             togglePollingBtn.style.display = 'none';
             return;
        }
        togglePollingBtn.style.display = 'block';
        togglePollingBtn.textContent = analysisState.isPollingActive ? 'Stop Polling' : 'Start Polling';
        togglePollingBtn.classList.toggle('bg-red-600', !analysisState.isPollingActive);
        togglePollingBtn.classList.toggle('hover:bg-red-700', !analysisState.isPollingActive);
        togglePollingBtn.classList.toggle('bg-blue-600', analysisState.isPollingActive);
        togglePollingBtn.classList.toggle('hover:bg-blue-700', analysisState.isPollingActive);
    }
}

export function navigateMpdUpdates(direction) {
    const { mpdUpdates } = analysisState;
    if (mpdUpdates.length === 0) return;
    
    let newIndex = analysisState.activeMpdUpdateIndex + direction;
    
    if (newIndex < 0) {
        newIndex = 0;
    } else if (newIndex >= mpdUpdates.length) {
        newIndex = mpdUpdates.length - 1;
    }
    
    if (newIndex !== analysisState.activeMpdUpdateIndex) {
        analysisState.activeMpdUpdateIndex = newIndex;
        updateMpdDisplay();
    }
}

// Helper to escape HTML for display
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}