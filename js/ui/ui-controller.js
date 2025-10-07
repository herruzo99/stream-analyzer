import { html } from 'lit-html';
import { eventBus } from '../app/event-bus.js';
import { useStore, useSegmentCacheStore } from '../app/store.js';
import { savePreset } from '../shared/utils/stream-storage.js';
import {
    reloadStream,
    toggleAllLiveStreamsPolling,
} from '../services/streamActionsService.js';
import { openModalWithContent } from '../services/modalService.js';

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

export const globalControlsTemplate = (streams) => {
    const { activeStreamId } = useStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);

    const hasLiveStreams = streams.some((s) => s.manifest?.type === 'dynamic');
    if (!hasLiveStreams) return html``; // Don't show controls if no live streams are loaded

    const isAnyPolling = streams.some(
        (s) => s.manifest?.type === 'dynamic' && s.isPolling
    );

    const pollingButton = html`
        <button
            @click=${toggleAllLiveStreamsPolling}
            class="font-bold text-sm py-2 px-4 rounded-md transition-colors text-white ${isAnyPolling
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'}"
        >
            ${isAnyPolling ? 'Stop All Polling' : 'Start All Polling'}
        </button>
    `;

    return html`
        ${pollingButton}
        <button
            @click=${() => reloadStream(activeStream)}
            class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
            Reload Active
        </button>
        <button
            @click=${handleSaveCurrentStream}
            class="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            title="Save the current stream URL as a preset"
        >
            Save Active Stream
        </button>
    `;
};

export function initializeUiController(domContext) {
    eventBus.subscribe('ui:request-segment-analysis', ({ url }) => {
        const cachedSegment = useSegmentCacheStore.getState().get(url);
        openModalWithContent({
            title: 'Segment Analysis',
            url: url,
            content: {
                type: 'segmentAnalysis',
                data: { parsedData: cachedSegment?.parsedData },
            },
        });
    });

    eventBus.subscribe('ui:request-segment-comparison', ({ urlA, urlB }) => {
        const { get: getFromCache } = useSegmentCacheStore.getState();
        const segmentA = getFromCache(urlA);
        const segmentB = getFromCache(urlB);
        openModalWithContent({
            title: 'Segment Comparison',
            url: 'Comparing Segment A vs. Segment B',
            content: {
                type: 'segmentAnalysis',
                data: {
                    parsedData: segmentA?.parsedData,
                    parsedDataB: segmentB?.parsedData,
                },
            },
        });
    });

    eventBus.subscribe('ui:show-scte35-details', ({ scte35, startTime }) => {
        openModalWithContent({
            title: `SCTE-35 Details @ ${startTime.toFixed(3)}s`,
            url: 'Decoded Splice Info Section',
            content: { type: 'scte35', data: { scte35, startTime } },
        });
    });
}
