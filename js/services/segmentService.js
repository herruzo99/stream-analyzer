import { analysisState } from '../core/state.js';
import { parseISOBMFF } from '../features/segment-analysis/isobmff-parser.js';
import { eventBus } from '../core/event-bus.js';

/**
 * Fetches a segment if it's not already in the cache.
 * Manages the state of the segment cache, including parsing the data,
 * and dispatches an event upon completion.
 * @param {string} url The URL of the segment to fetch.
 */
async function fetchSegment(url) {
    if (
        analysisState.segmentCache.has(url) &&
        analysisState.segmentCache.get(url).status !== -1
    ) {
        eventBus.dispatch('segment:loaded', {
            url,
            entry: analysisState.segmentCache.get(url),
        });
        return;
    }

    try {
        // Dispatch pending state immediately for UI feedback
        const pendingEntry = { status: -1, data: null, parsedData: null };
        analysisState.segmentCache.set(url, pendingEntry);
        eventBus.dispatch('segment:pending', { url });

        const response = await fetch(url, { method: 'GET', cache: 'no-store' });
        const data = response.ok ? await response.arrayBuffer() : null;

        let parsedData = null;
        if (data) {
            try {
                // Future work: determine parser based on mimeType. For now, assume ISOBMFF.
                parsedData = parseISOBMFF(data);
            } catch (e) {
                console.error(`Failed to parse segment ${url}:`, e);
                parsedData = { error: e.message };
            }
        }

        const finalEntry = { status: response.status, data, parsedData };
        analysisState.segmentCache.set(url, finalEntry);
        eventBus.dispatch('segment:loaded', { url, entry: finalEntry });
    } catch (error) {
        console.error(`Failed to fetch segment ${url}:`, error);
        const errorEntry = {
            status: 0,
            data: null,
            parsedData: { error: error.message },
        };
        analysisState.segmentCache.set(url, errorEntry); // Network error
        eventBus.dispatch('segment:loaded', { url, entry: errorEntry });
    }
}

// Service setup: listen for requests to fetch segments.
eventBus.subscribe('segment:fetch', ({ url }) => fetchSegment(url));