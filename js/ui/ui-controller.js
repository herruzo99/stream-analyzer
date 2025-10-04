import { html, render } from 'lit-html';
import { eventBus } from '../core/event-bus.js';
import { useStore, storeActions } from '../core/store.js';
import { dom } from '../core/dom.js';
import { getSegmentAnalysisTemplate } from './views/segment-analysis/index.js';
import { savePreset } from '../shared/utils/stream-storage.js';

function openModal() {
    const modalPanel = dom.segmentModal.querySelector('div');
    dom.segmentModal.classList.remove('opacity-0', 'invisible');
    dom.segmentModal.classList.add('opacity-100', 'visible');
    modalPanel.classList.remove('scale-95');
    modalPanel.classList.add('scale-100');
}

// --- Global Controls Logic ---
const reloadHandler = (stream) => {
    const urlToReload = stream.activeMediaPlaylistUrl || stream.originalUrl;
    if (!stream || !urlToReload || !stream.originalUrl) {
        eventBus.dispatch('ui:show-status', {
            message: 'Cannot reload a manifest from a local file.',
            type: 'warn',
            duration: 4000,
        });
        return;
    }
    eventBus.dispatch('ui:show-status', {
        message: `Reloading manifest for ${stream.name}...`,
        type: 'info',
        duration: 2000,
    });
    if (stream.protocol === 'hls' && stream.activeMediaPlaylistUrl) {
        eventBus.dispatch('hls:media-playlist-reload', {
            streamId: stream.id,
            url: stream.activeMediaPlaylistUrl,
        });
    } else {
        eventBus.dispatch('manifest:force-reload', { streamId: stream.id });
    }
};

const togglePollingState = (stream) => {
    if (stream) {
        storeActions.updateStream(stream.id, {
            isPolling: !stream.isPolling,
        });
    }
};

const handleSaveCurrentStream = () => {
    const { streams, activeStreamId } = useStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    if (!stream || !stream.originalUrl) {
        eventBus.dispatch('ui:show-status', {
            message: 'Cannot save a stream loaded from a local file.',
            type: 'warn',
        });
        return;
    }

    const name = prompt(
        'Enter a name for this preset:',
        stream.name || new URL(stream.originalUrl).hostname
    );

    if (name) {
        savePreset({
            name,
            url: stream.originalUrl,
            protocol: stream.protocol,
            type: stream.manifest.type === 'dynamic' ? 'live' : 'vod',
        });
    }
};

const globalControlsTemplate = (stream) => {
    if (!stream) return html``;
    const isDynamic = stream.manifest?.type === 'dynamic';
    const isPolling = stream.isPolling;

    const pollingButton = isDynamic
        ? html`
              <button
                  @click=${() => togglePollingState(stream)}
                  class="font-bold text-sm py-2 px-4 rounded-md transition-colors text-white ${isPolling
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'}"
              >
                  ${isPolling ? 'Stop Polling' : 'Start Polling'}
              </button>
          `
        : '';
    return html`
        ${pollingButton}
        <button
            @click=${() => reloadHandler(stream)}
            class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
            Reload
        </button>
        <button
            @click=${handleSaveCurrentStream}
            class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            title="Save the current stream URL as a preset"
        >
            Save Stream
        </button>
    `;
};

function renderGlobalControls() {
    const { streams, activeStreamId } = useStore.getState();
    const stream = streams.find((s) => s.id === activeStreamId);
    const container = document.getElementById('global-stream-controls');
    if (container) {
        render(globalControlsTemplate(stream), container);
    }
}

/**
 * Initializes all UI-related event bus subscriptions.
 */
export function initializeUiController() {
    let previousStreams = useStore.getState().streams;
    let previousActiveStreamId = useStore.getState().activeStreamId;

    useStore.subscribe(async (state) => {
        const activeStream = state.streams.find(
            (s) => s.id === state.activeStreamId
        );
        const previousActiveStream = previousStreams.find(
            (s) => s.id === previousActiveStreamId
        );

        // Handle changes to the active stream ID (e.g., user switching via dropdown)
        if (state.activeStreamId !== previousActiveStreamId) {
            // Only re-render tabs if we are already in the results view.
            // This prevents a race condition during the initial analysis load.
            if (!dom.results.classList.contains('hidden')) {
                const { renderSingleStreamTabs } = await import(
                    './rendering.js'
                );
                renderSingleStreamTabs(state.activeStreamId);
            }
            renderGlobalControls();
        }
        // Handle polling state changes for the *same* active stream
        else if (activeStream?.isPolling !== previousActiveStream?.isPolling) {
            renderGlobalControls();
        }

        previousStreams = state.streams;
        previousActiveStreamId = state.activeStreamId;
    });

    eventBus.subscribe('stream:data-updated', async ({ streamId }) => {
        if (streamId !== useStore.getState().activeStreamId) return;

        const featuresTab = dom.tabs.querySelector('[data-tab="features"]');
        if (featuresTab && featuresTab.classList.contains('bg-gray-700')) {
            const stream = useStore
                .getState()
                .streams.find((s) => s.id === streamId);
            if (stream) {
                const { getFeaturesAnalysisTemplate } = await import(
                    './views/feature-analysis/index.js'
                );
                render(
                    getFeaturesAnalysisTemplate(stream),
                    dom.tabContents.features
                );
            }
        }

        const updatesTab = dom.tabs.querySelector('[data-tab="updates"]');
        if (updatesTab && updatesTab.classList.contains('bg-gray-700')) {
            const { renderManifestUpdates } = await import(
                './views/manifest-updates/index.js'
            );
            renderManifestUpdates(streamId);
        }
    });

    eventBus.subscribe('ui:request-segment-analysis', ({ url }) => {
        dom.modalTitle.textContent = 'Segment Analysis';
        dom.modalSegmentUrl.textContent = url;
        const cachedSegment = useStore.getState().segmentCache.get(url);
        openModal();
        render(
            getSegmentAnalysisTemplate(cachedSegment?.parsedData),
            dom.modalContentArea
        );
    });

    eventBus.subscribe('ui:request-segment-comparison', ({ urlA, urlB }) => {
        const { segmentCache } = useStore.getState();
        dom.modalTitle.textContent = 'Segment Comparison';
        dom.modalSegmentUrl.textContent = `Comparing Segment A vs. Segment B`;
        const segmentA = segmentCache.get(urlA);
        const segmentB = segmentCache.get(urlB);
        openModal();
        render(
            getSegmentAnalysisTemplate(
                segmentA?.parsedData,
                segmentB?.parsedData
            ),
            dom.modalContentArea
        );
    });
}
