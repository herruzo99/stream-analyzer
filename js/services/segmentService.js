import { useSegmentCacheStore } from '../app/store.js';
import { eventBus } from '../app/event-bus.js';

const parsingWorker = new Worker('/dist/worker.js', {
    type: 'module',
});

parsingWorker.onmessage = (event) => {
    const { url, parsedData, error } = event.data;
    const { get, set } = useSegmentCacheStore.getState();

    const entry = get(url);
    if (!entry) return;

    const finalEntry = {
        status: error ? 500 : entry.status,
        data: entry.data,
        parsedData: parsedData,
    };

    set(url, finalEntry);
    eventBus.dispatch('segment:loaded', { url, entry: finalEntry });
};

parsingWorker.onerror = (error) => {
    console.error('An error occurred in the parsing worker:', error);
};

/**
 * The internal implementation that performs the fetch and dispatches to the worker.
 * @param {string} url The URL of the segment to fetch.
 */
async function _fetchAndParseSegment(url) {
    const { set } = useSegmentCacheStore.getState();
    try {
        const pendingEntry = { status: -1, data: null, parsedData: null };
        set(url, pendingEntry);
        eventBus.dispatch('segment:pending', { url });

        const response = await fetch(url, { method: 'GET', cache: 'no-store' });
        const data = response.ok ? await response.arrayBuffer() : null;

        const entryWithData = {
            status: response.status,
            data,
            parsedData: null,
        };
        set(url, entryWithData);

        if (data) {
            parsingWorker.postMessage({
                type: 'parse-segment',
                payload: { url, data },
            });
        } else {
            const errorEntry = {
                status: response.status,
                data: null,
                parsedData: { error: `HTTP ${response.status}` },
            };
            set(url, errorEntry);
            eventBus.dispatch('segment:loaded', { url, entry: errorEntry });
        }
    } catch (error) {
        console.error(`Failed to fetch segment ${url}:`, error);
        const errorEntry = {
            status: 0,
            data: null,
            parsedData: { error: error.message },
        };
        set(url, errorEntry);
        eventBus.dispatch('segment:loaded', { url, entry: errorEntry });
    }
}

/**
 * Public API to get a parsed segment. Returns a promise that resolves with the parsed data.
 * Handles caching, fetching, and event orchestration internally.
 * @param {string} url The URL of the segment to retrieve.
 * @returns {Promise<object>} A promise that resolves with the parsed segment data.
 */
export function getParsedSegment(url) {
    const { get } = useSegmentCacheStore.getState();
    const cachedEntry = get(url);

    if (cachedEntry && cachedEntry.status !== -1 && cachedEntry.parsedData) {
        if (cachedEntry.parsedData.error) {
            return Promise.reject(new Error(cachedEntry.parsedData.error));
        }
        return Promise.resolve(cachedEntry.parsedData);
    }

    return new Promise((resolve, reject) => {
        const onSegmentLoaded = ({ url: loadedUrl, entry }) => {
            if (loadedUrl === url) {
                unsubscribe();
                if (entry.status !== 200) {
                    reject(new Error(`HTTP ${entry.status} for ${url}`));
                } else if (entry.parsedData?.error) {
                    reject(new Error(entry.parsedData.error));
                } else {
                    resolve(entry.parsedData);
                }
            }
        };

        const unsubscribe = eventBus.subscribe(
            'segment:loaded',
            onSegmentLoaded
        );

        if (!cachedEntry || cachedEntry.status !== -1) {
            _fetchAndParseSegment(url);
        }
    });
}

// Service setup: listen for legacy requests to fetch segments.
eventBus.subscribe('segment:fetch', ({ url }) => _fetchAndParseSegment(url));
