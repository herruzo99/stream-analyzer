export const NETWORK_CONTRACT_LIMITS = Object.freeze({
    records: 500,
    url: 2048,
    label: 120,
    headerCount: 64,
    headerName: 96,
    headerValue: 256,
    responseBytes: 4096,
    durationMs: 24 * 60 * 60 * 1000,
    contentBytes: 1024 * 1024 * 1024,
});

const PRIVATE_QUERY_KEY =
    /^(?:access[_-]?token|api[_-]?key|auth|authorization|code|credential|jwt|key|password|secret|sig|signature|token)$/i;
const PRIVATE_HEADER =
    /^(?:authorization|cookie|proxy-authorization|set-cookie|x-api-key|x-auth-token)$/i;
const REDACTED = '[redacted]';

const boundedText = (value, limit) => String(value ?? '').slice(0, limit);
const finite = (value, maximum = Number.MAX_SAFE_INTEGER) =>
    Math.min(
        maximum,
        Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0)
    );

function hashText(value) {
    let hash = 2166136261;
    for (const character of value) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

export function redactNetworkUrl(value) {
    const input = boundedText(value, NETWORK_CONTRACT_LIMITS.url);
    try {
        const url = new URL(input);
        if (!['http:', 'https:'].includes(url.protocol))
            return '[unsupported URL]';
        url.username = '';
        url.password = '';
        url.hash = '';
        for (const key of [...url.searchParams.keys()]) {
            if (PRIVATE_QUERY_KEY.test(key))
                url.searchParams.set(key, REDACTED);
        }
        return boundedText(url.toString(), NETWORK_CONTRACT_LIMITS.url);
    } catch {
        return '[invalid URL]';
    }
}

export function redactNetworkHeaders(headers) {
    return Object.entries(headers ?? {})
        .slice(0, NETWORK_CONTRACT_LIMITS.headerCount)
        .map(([name, value]) => {
            const safeName = boundedText(
                name,
                NETWORK_CONTRACT_LIMITS.headerName
            );
            const redacted = PRIVATE_HEADER.test(safeName);
            return Object.freeze({
                name: safeName,
                value: redacted
                    ? REDACTED
                    : boundedText(value, NETWORK_CONTRACT_LIMITS.headerValue),
                redacted,
            });
        });
}

function responsePreview(body) {
    /** @type {Uint8Array<ArrayBufferLike>} */
    let bytes = new Uint8Array();
    if (body instanceof ArrayBuffer) bytes = new Uint8Array(body);
    else if (ArrayBuffer.isView(body)) {
        bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    } else if (typeof body === 'string') {
        bytes = new TextEncoder().encode(body);
    }
    const visible = bytes.subarray(0, NETWORK_CONTRACT_LIMITS.responseBytes);
    const rows = [];
    for (let offset = 0; offset < visible.length; offset += 16) {
        const row = visible.subarray(offset, offset + 16);
        rows.push(
            Object.freeze({
                offset,
                address: `0x${offset.toString(16).padStart(8, '0')}`,
                hex: [...row]
                    .map((byte) => byte.toString(16).padStart(2, '0'))
                    .join(' '),
                ascii: [...row]
                    .map((byte) =>
                        byte >= 32 && byte <= 126
                            ? String.fromCharCode(byte)
                            : '.'
                    )
                    .join(''),
            })
        );
    }
    return Object.freeze({
        available: bytes.length > 0,
        totalBytes: bytes.length,
        displayedBytes: visible.length,
        truncated: bytes.length > visible.length,
        rows: Object.freeze(rows),
    });
}

export function projectNetworkEvent(event) {
    const safeUrl = redactNetworkUrl(event?.url);
    const duration = finite(
        event?.timing?.duration,
        NETWORK_CONTRACT_LIMITS.durationMs
    );
    const startTime = finite(event?.timing?.startTime);
    const endTime = Math.max(
        startTime,
        finite(event?.timing?.endTime || startTime + duration)
    );
    const contentLength = finite(
        event?.response?.contentLength,
        NETWORK_CONTRACT_LIMITS.contentBytes
    );
    const identitySource = `${event?.id ?? ''}|${event?.streamId ?? 'none'}|${startTime}|${safeUrl}`;
    return Object.freeze({
        id: `sa-network:v1:${hashText(identitySource)}`,
        sourceId: boundedText(event?.id, NETWORK_CONTRACT_LIMITS.label),
        streamId: event?.streamId ?? null,
        url: safeUrl,
        label: boundedText(
            (() => {
                try {
                    return new URL(safeUrl).pathname.split('/').pop() || '/';
                } catch {
                    return safeUrl;
                }
            })(),
            NETWORK_CONTRACT_LIMITS.label
        ),
        resourceType: boundedText(
            event?.resourceType || 'other',
            NETWORK_CONTRACT_LIMITS.label
        ),
        method: boundedText(
            event?.request?.method || 'GET',
            NETWORK_CONTRACT_LIMITS.label
        ),
        status: finite(event?.response?.status, 999),
        statusText: boundedText(
            event?.response?.statusText,
            NETWORK_CONTRACT_LIMITS.label
        ),
        contentType: boundedText(
            event?.response?.contentType || 'application/octet-stream',
            NETWORK_CONTRACT_LIMITS.headerValue
        ),
        contentLength,
        timing: Object.freeze({ startTime, endTime, duration }),
        requestHeaders: Object.freeze(
            redactNetworkHeaders(event?.request?.headers)
        ),
        responseHeaders: Object.freeze(
            redactNetworkHeaders(event?.response?.headers)
        ),
        response: responsePreview(event?.response?.body),
    });
}

export function createNetworkModel(state) {
    const visibleStreams = state.visibleStreamIds ?? new Set();
    const type = state.filters?.type ?? 'all';
    const search = String(state.filters?.search ?? '').toLowerCase();
    const allRecords = (state.events ?? [])
        .slice(-NETWORK_CONTRACT_LIMITS.records)
        .filter(
            (event) =>
                event.streamId === null || visibleStreams.has(event.streamId)
        )
        .map(projectNetworkEvent)
        .sort((left, right) => left.timing.startTime - right.timing.startTime);
    const records = allRecords.filter(
        (record) =>
            (type === 'all' || record.resourceType === type) &&
            (!search || record.url.toLowerCase().includes(search))
    );
    const selectedSourceId = state.selectedEventId;
    const selected =
        records.find((record) => record.sourceId === selectedSourceId) ?? null;
    const firstStart = allRecords[0]?.timing.startTime ?? 0;
    const lastEnd = allRecords.reduce(
        (maximum, record) => Math.max(maximum, record.timing.endTime),
        firstStart
    );
    const timelineDuration = Math.max(1, lastEnd - firstStart);
    const rows = records.map((record) =>
        Object.freeze({
            ...record,
            leftPercent: Math.min(
                100,
                ((record.timing.startTime - firstStart) / timelineDuration) *
                    100
            ),
            widthPercent: Math.min(
                100,
                Math.max(0.2, (record.timing.duration / timelineDuration) * 100)
            ),
        })
    );
    return Object.freeze({
        state:
            allRecords.length === 0
                ? 'empty'
                : rows.length === 0
                  ? 'filtered-empty'
                  : 'ready',
        rows: Object.freeze(rows),
        selected,
        summary: Object.freeze({
            total: rows.length,
            failed: rows.filter((record) => record.status >= 400).length,
            bytes: rows.reduce((sum, record) => sum + record.contentLength, 0),
            averageDuration:
                rows.length === 0
                    ? 0
                    : rows.reduce(
                          (sum, record) => sum + record.timing.duration,
                          0
                      ) / rows.length,
        }),
    });
}

export function createRedactedHar(model, streams) {
    const pages = (streams ?? []).map((stream) => ({
        id: `page_${boundedText(stream.id, NETWORK_CONTRACT_LIMITS.label)}`,
        title: redactNetworkUrl(stream.originalUrl ?? stream.resolvedUrl ?? ''),
        startedDateTime: new Date(0).toISOString(),
        pageTimings: { onContentLoad: -1, onLoad: -1 },
    }));
    if (pages.length === 0) {
        pages.push({
            id: 'page_default',
            title: 'Network session',
            startedDateTime: new Date(0).toISOString(),
            pageTimings: { onContentLoad: -1, onLoad: -1 },
        });
    }
    return {
        log: {
            version: '1.2',
            creator: { name: 'Stream Analyzer', version: '1.1.0' },
            pages,
            entries: model.rows.map((record) => ({
                pageref:
                    record.streamId === null
                        ? pages[0].id
                        : `page_${record.streamId}`,
                startedDateTime: new Date(0).toISOString(),
                time: record.timing.duration,
                request: {
                    method: record.method,
                    url: record.url,
                    httpVersion: 'HTTP/1.1',
                    cookies: [],
                    headers: record.requestHeaders,
                    queryString: [],
                    headersSize: -1,
                    bodySize: -1,
                },
                response: {
                    status: record.status,
                    statusText: record.statusText,
                    httpVersion: 'HTTP/1.1',
                    cookies: [],
                    headers: record.responseHeaders,
                    content: {
                        size: record.contentLength,
                        mimeType: record.contentType,
                    },
                    redirectURL: '',
                    headersSize: -1,
                    bodySize: record.contentLength || -1,
                },
                cache: {},
                timings: {
                    blocked: -1,
                    dns: -1,
                    connect: -1,
                    send: 0,
                    wait: record.timing.duration,
                    receive: 0,
                    ssl: -1,
                },
            })),
        },
    };
}
