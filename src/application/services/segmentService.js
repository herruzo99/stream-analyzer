import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { eventBus } from '@/application/event-bus';
import { workerService } from '@/infrastructure/worker/workerService';

async function _fetchAndParseSegment(url) {
    const { set } = useSegmentCacheStore.getState();
    try {
        set(url, { status: -1, data: null, parsedData: null });
        eventBus.dispatch('segment:pending', { url });

        const response = await fetch(url, { method: 'GET', cache: 'no-store' });
        const data = response.ok ? await response.arrayBuffer() : null;

        const entryWithData = { status: response.status, data, parsedData: null };
        set(url, entryWithData);

        if (data) {
            workerService
                .postTask('parse-segment-structure', { url, data })
                .then((parsedData) => {
                    const finalEntry = {
                        status: response.status,
                        data,
                        parsedData,
                    };
                    set(url, finalEntry);
                    eventBus.dispatch('segment:loaded', {
                        url,
                        entry: finalEntry,
                    });
                })
                .catch((error) => {
                    console.error('Segment parsing failed in worker:', error);
                    const errorEntry = {
                        status: response.status,
                        data,
                        parsedData: { error: error.message },
                    };
                    set(url, errorEntry);
                    eventBus.dispatch('segment:loaded', {
                        url,
                        entry: errorEntry,
                    });
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

export function getParsedSegment(url) {
    const { get } = useSegmentCacheStore.getState();
    const cachedEntry = get(url);

    if (cachedEntry && cachedEntry.status !== -1 && cachedEntry.parsedData) {
        return cachedEntry.parsedData.error
            ? Promise.reject(new Error(cachedEntry.parsedData.error))
            : Promise.resolve(cachedEntry.parsedData);
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

export function initializeSegmentService() {
    eventBus.subscribe('segment:fetch', ({ url }) =>
        _fetchAndParseSegment(url)
    );
}