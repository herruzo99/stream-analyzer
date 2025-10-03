import { useStore } from '../core/store.js';
import { eventBus } from '../core/event-bus.js';

// Initialize the worker once using a module-relative URL.
// This allows build tools and test runners to correctly resolve the path.
// parser.js
// js/services/segmentService.js
const parsingWorker = new Worker('/dist/worker.js', {
    type: 'module',
});

// Listen for messages from the worker.
parsingWorker.onmessage = (event) => {
    const { url, parsedData, error } = event.data;
    const { segmentCache } = useStore.getState();

    const entry = segmentCache.get(url);
    if (!entry) return; // Should not happen if request tracking is correct

    const finalEntry = {
        status: error ? 500 : entry.status, // Use existing status if no error
        data: entry.data,
        parsedData: parsedData,
    };

    segmentCache.set(url, finalEntry);
    eventBus.dispatch('segment:loaded', { url, entry: finalEntry });
};

parsingWorker.onerror = (error) => {
    console.error('An error occurred in the parsing worker:', error);
    // Potentially handle catastrophic worker failures here.
};

/**
 * Fetches a segment if it's not already in the cache.
 * Manages the state of the segment cache, dispatches the data to the
 * worker for parsing, and dispatches an event upon completion.
 * @param {string} url The URL of the segment to fetch.
 */
export async function fetchSegment(url) {
    const { segmentCache } = useStore.getState();

    if (segmentCache.has(url) && segmentCache.get(url).status !== -1) {
        eventBus.dispatch('segment:loaded', {
            url,
            entry: segmentCache.get(url),
        });
        return;
    }

    try {
        // Dispatch pending state immediately for UI feedback
        const pendingEntry = { status: -1, data: null, parsedData: null };
        segmentCache.set(url, pendingEntry);
        eventBus.dispatch('segment:pending', { url });

        const response = await fetch(url, { method: 'GET', cache: 'no-store' });
        const data = response.ok ? await response.arrayBuffer() : null;

        const entryWithData = {
            status: response.status,
            data,
            parsedData: null,
        };
        segmentCache.set(url, entryWithData);

        if (data) {
            // Offload parsing to the worker
            parsingWorker.postMessage({
                type: 'parse-segment',
                payload: { url, data },
            });
        } else {
            // If fetch failed, no need to parse, finalize the entry
            const errorEntry = {
                status: response.status,
                data: null,
                parsedData: { error: `HTTP ${response.status}` },
            };
            segmentCache.set(url, errorEntry);
            eventBus.dispatch('segment:loaded', { url, entry: errorEntry });
        }
    } catch (error) {
        console.error(`Failed to fetch segment ${url}:`, error);
        const errorEntry = {
            status: 0,
            data: null,
            parsedData: { error: error.message },
        };
        segmentCache.set(url, errorEntry); // Network error
        eventBus.dispatch('segment:loaded', { url, entry: errorEntry });
    }
}

// Service setup: listen for requests to fetch segments.
eventBus.subscribe('segment:fetch', ({ url }) => fetchSegment(url));
