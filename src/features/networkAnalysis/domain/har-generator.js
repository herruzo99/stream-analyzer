/**
 * Generates a HAR 1.2 compliant object from network events.
 * @param {import('@/types').NetworkEvent[]} events The network events to export.
 * @param {import('@/types').Stream[]} streams The active streams (used to define pages).
 * @returns {object} The HAR object.
 */
export function generateHar(events, streams) {
    const creator = {
        name: 'Stream Analyzer',
        version: '1.0.0',
    };

    // Map streams to HAR pages
    const pages = streams.map((stream) => ({
        startedDateTime: new Date().toISOString(), // Ideally this would be stream start time
        id: `page_${stream.id}`,
        title: stream.name || stream.originalUrl,
        pageTimings: {
            onContentLoad: -1,
            onLoad: -1,
        },
    }));

    // If no streams, create a default page
    if (pages.length === 0) {
        pages.push({
            startedDateTime: new Date().toISOString(),
            id: 'page_default',
            title: 'Default Session',
            pageTimings: { onContentLoad: -1, onLoad: -1 },
        });
    }

    const entries = events.map((event) => {
        const startTime = new Date(
            Date.now() - (performance.now() - event.timing.startTime)
        ).toISOString();

        // Default to the first page if streamId is missing or not found
        const pageRef =
            event.streamId && streams.some((s) => s.id === event.streamId)
                ? `page_${event.streamId}`
                : pages[0].id;

        return {
            startedDateTime: startTime,
            time: event.timing.duration,
            request: {
                method: event.request.method,
                url: event.url,
                httpVersion: 'HTTP/1.1', // Assumption, as fetch doesn't expose this
                cookies: [],
                headers: Object.entries(event.request.headers).map(
                    ([name, value]) => ({ name, value })
                ),
                queryString: [], // TODO: Parse query string if needed
                headersSize: -1,
                bodySize: -1,
            },
            response: {
                status: event.response.status,
                statusText: event.response.statusText,
                httpVersion: 'HTTP/1.1',
                cookies: [],
                headers: Object.entries(event.response.headers).map(
                    ([name, value]) => ({ name, value })
                ),
                content: {
                    size: event.response.contentLength || 0,
                    mimeType: event.response.contentType || 'application/octet-stream',
                    // text: ... // We don't store response bodies in memory for performance
                },
                redirectURL: '',
                headersSize: -1,
                bodySize: event.response.contentLength || -1,
            },
            cache: {},
            timings: {
                blocked: -1,
                dns: -1,
                connect: -1,
                send: 0,
                wait: event.timing.breakdown?.ttfb || 0,
                receive: event.timing.breakdown?.download || event.timing.duration,
                ssl: -1,
            },
            serverIPAddress: '',
            connection: '',
            pageref: pageRef,
        };
    });

    return {
        log: {
            version: '1.2',
            creator,
            pages,
            entries,
        },
    };
}

/**
 * Triggers a download of the HAR object.
 * @param {object} har The HAR object.
 * @param {string} filename The filename to save as.
 */
export function downloadHar(har, filename = 'network-log.har') {
    const jsonString = JSON.stringify(har, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
