import { html } from 'lit-html';
import { eventBus } from '../core/event-bus.js';
import { useStore } from '../core/store.js';
import { getSegmentAnalysisTemplate } from './views/segment-analysis/index.js';
import { scte35DetailsTemplate } from './shared/scte35-details.js';
import { savePreset } from '../shared/utils/stream-storage.js';
import {
    reloadStream,
    toggleStreamPolling,
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

export const globalControlsTemplate = (stream) => {
    if (!stream) return html``;
    const isDynamic = stream.manifest?.type === 'dynamic';
    const isPolling = stream.isPolling;

    const pollingButton = isDynamic
        ? html`
              <button
                  @click=${() => toggleStreamPolling(stream)}
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
            @click=${() => reloadStream(stream)}
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

export function initializeUiController(domContext) {
    eventBus.subscribe('ui:request-segment-analysis', ({ url }) => {
        const cachedSegment = useStore.getState().segmentCache.get(url);
        openModalWithContent({
            title: 'Segment Analysis',
            url: url,
            contentTemplate: getSegmentAnalysisTemplate(
                cachedSegment?.parsedData
            ),
        });
    });

    eventBus.subscribe('ui:request-segment-comparison', ({ urlA, urlB }) => {
        const { segmentCache } = useStore.getState();
        const segmentA = segmentCache.get(urlA);
        const segmentB = segmentCache.get(urlB);
        openModalWithContent({
            title: 'Segment Comparison',
            url: 'Comparing Segment A vs. Segment B',
            contentTemplate: getSegmentAnalysisTemplate(
                segmentA?.parsedData,
                segmentB?.parsedData
            ),
        });
    });

    eventBus.subscribe('ui:show-scte35-details', ({ scte35, startTime }) => {
        openModalWithContent({
            title: `SCTE-35 Details @ ${startTime.toFixed(3)}s`,
            url: 'Decoded Splice Info Section',
            contentTemplate: scte35DetailsTemplate(scte35),
        });
    });
}