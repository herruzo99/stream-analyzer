import {
    NETWORK_CONTRACT_LIMITS,
    projectNetworkEvent,
    redactNetworkUrl,
} from '../../networkAnalysis/application/network-contract.js';
import { parsePsshString } from '../domain/pssh-parser.js';

export const DRM_CONTRACT_LIMITS = Object.freeze({
    sessions: 50,
    eventsPerSession: 200,
    accessRequests: 50,
    keyStatuses: 128,
    timeline: 300,
    label: 120,
    error: 256,
    psshCharacters: 384 * 1024,
    payloadBytes: 256 * 1024,
    payloadHexCharacters: 8192,
    keyIds: 64,
});

const boundedText = (
    /** @type {unknown} */ value,
    /** @type {number} */ limit = DRM_CONTRACT_LIMITS.label
) => String(value ?? '').slice(0, limit);
const finite = (value) =>
    Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

export function redactDrmText(value) {
    return boundedText(value, DRM_CONTRACT_LIMITS.error)
        .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => redactNetworkUrl(url))
        .replace(/(bearer\s+)[^\s,;]+/gi, '$1[redacted]')
        .replace(
            /((?:access[_-]?token|api[_-]?key|authorization|credential|password|secret|token)\s*[=:]\s*)[^\s,;&]+/gi,
            '$1[redacted]'
        );
}

function stableId(prefix, value) {
    let hash = 2166136261;
    for (const character of String(value ?? '')) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return `${prefix}:v1:${(hash >>> 0).toString(36)}`;
}

function safeEventData(event) {
    const data = event?.data ?? {};
    const result = {};
    if (data.initDataType !== undefined)
        result.initDataType = boundedText(data.initDataType);
    if (data.messageType !== undefined)
        result.messageType = boundedText(data.messageType);
    if (data.size !== undefined) result.size = finite(data.size);
    if (data.count !== undefined) result.count = finite(data.count);
    if (data.message !== undefined) {
        result.messageBytes = finite(
            data.message?.byteLength ?? data.message?.length
        );
        result.messageOmitted = true;
    }
    if (data.messageText !== undefined)
        result.message = redactDrmText(data.messageText);
    return Object.freeze(result);
}

function projectSessionEvent(event, sessionIdentity) {
    const timestamp = finite(event?.timestamp);
    const name = boundedText(event?.name || 'EME event');
    const type = ['api', 'message', 'keys', 'error'].includes(event?.type)
        ? event.type
        : 'api';
    return Object.freeze({
        id: stableId(
            'sa-drm-event',
            `${sessionIdentity}|${event?.id ?? ''}|${timestamp}|${type}|${name}`
        ),
        timestamp,
        source: 'EME',
        type,
        title: name,
        data: safeEventData(event),
        isError: type === 'error',
    });
}

function projectKeyStatus(key) {
    return Object.freeze({
        kid: boundedText(key?.kid, 128),
        status: boundedText(key?.status || 'unknown', 64),
    });
}

function projectSession([internalId, session]) {
    const identity = `${internalId}|${session?.id ?? ''}|${session?.startTime ?? 0}`;
    const events = (session?.events ?? [])
        .slice(-DRM_CONTRACT_LIMITS.eventsPerSession)
        .map((event) => projectSessionEvent(event, identity));
    const keys = (session?.keyStatuses ?? [])
        .slice(0, DRM_CONTRACT_LIMITS.keyStatuses)
        .map(projectKeyStatus);
    const status = events.some((event) => event.isError)
        ? 'error'
        : session?.status === 'closed'
          ? 'closed'
          : 'active';
    return Object.freeze({
        id: stableId('sa-drm-session', identity),
        sourceId: boundedText(internalId),
        sessionId: boundedText(session?.id || 'Pending'),
        keySystem: boundedText(session?.keySystem || 'Unknown'),
        type: boundedText(session?.type || 'temporary'),
        startTime: finite(session?.startTime),
        performanceStartTime: finite(session?.performanceStartTime),
        status,
        statusLabel:
            status === 'error'
                ? 'Error'
                : status === 'closed'
                  ? 'Closed'
                  : 'Active',
        keys: Object.freeze(keys),
        keysTruncated:
            (session?.keyStatuses?.length ?? 0) >
            DRM_CONTRACT_LIMITS.keyStatuses,
        events: Object.freeze(events),
        eventsTruncated:
            (session?.events?.length ?? 0) >
            DRM_CONTRACT_LIMITS.eventsPerSession,
    });
}

function projectAccessRequest(request) {
    const status = request?.status === 'success' ? 'success' : 'failure';
    return Object.freeze({
        id: stableId(
            'sa-drm-access',
            `${request?.timestamp ?? 0}|${request?.keySystem ?? ''}|${status}`
        ),
        timestamp: finite(request?.timestamp),
        keySystem: boundedText(request?.keySystem || 'Unknown'),
        status,
        statusLabel: status === 'success' ? 'Supported' : 'Rejected',
        error: status === 'failure' ? redactDrmText(request?.error) : '',
    });
}

function projectLicenseEvent(event, session) {
    if (!['license', 'key'].includes(event?.resourceType)) return null;
    const startTime = finite(event?.timing?.startTime);
    if (
        session.performanceStartTime > 0 &&
        startTime < session.performanceStartTime
    ) {
        return null;
    }
    const record = projectNetworkEvent(event);
    return Object.freeze({
        id: stableId('sa-drm-network', record.id),
        timestamp: startTime,
        source: 'NETWORK',
        type: 'traffic',
        title: `${record.method} ${record.label}`,
        data: Object.freeze({
            status: record.status,
            duration: record.timing.duration,
            url: record.url,
            responseBytes: record.response.totalBytes,
            responseTruncated: record.response.truncated,
        }),
        isError: record.status >= 400,
    });
}

function capabilityState({
    emeSupported,
    encrypted,
    sessions,
    accessRequests,
}) {
    if (!emeSupported)
        return Object.freeze({
            state: 'unsupported',
            label: 'Encrypted Media Extensions unavailable',
            detail: 'This browser context does not expose the EME capability.',
        });
    if (sessions.length > 0)
        return Object.freeze({
            state: 'sessions',
            label: 'DRM sessions observed',
            detail: `${sessions.length} bounded session record${sessions.length === 1 ? '' : 's'}.`,
        });
    if (accessRequests[0]?.status === 'failure')
        return Object.freeze({
            state: 'rejected',
            label: 'Key-system access rejected',
            detail: accessRequests[0].error || 'The browser rejected access.',
        });
    if (encrypted)
        return Object.freeze({
            state: 'waiting',
            label: 'Waiting for a key session',
            detail: 'Start playback to request encrypted-media access.',
        });
    return Object.freeze({
        state: 'clear',
        label: 'Clear content',
        detail: 'No DRM signaling is present in the active manifest.',
    });
}

export function createDrmModel({
    decryptionState,
    networkState,
    encrypted = false,
    emeSupported = false,
}) {
    const sessionEntries = [
        ...(decryptionState?.sessions ?? new Map()).entries(),
    ]
        .slice(-DRM_CONTRACT_LIMITS.sessions)
        .reverse();
    const sessions = sessionEntries.map(projectSession);
    const selectedSourceId = decryptionState?.selectedSessionId ?? null;
    const selected =
        sessions.find((session) => session.sourceId === selectedSourceId) ??
        sessions[0] ??
        null;
    const accessRequests = (decryptionState?.accessRequests ?? [])
        .slice(0, DRM_CONTRACT_LIMITS.accessRequests)
        .map(projectAccessRequest);
    const licenseTimeline = selected
        ? (networkState?.events ?? [])
              .map((event) => projectLicenseEvent(event, selected))
              .filter(Boolean)
        : [];
    const timeline = selected
        ? [...selected.events, ...licenseTimeline]
              .sort((left, right) => left.timestamp - right.timestamp)
              .slice(-DRM_CONTRACT_LIMITS.timeline)
        : [];
    return Object.freeze({
        capability: capabilityState({
            emeSupported,
            encrypted,
            sessions,
            accessRequests,
        }),
        sessions: Object.freeze(sessions),
        sessionsTruncated:
            (decryptionState?.sessions?.size ?? 0) >
            DRM_CONTRACT_LIMITS.sessions,
        selected,
        timeline: Object.freeze(timeline),
        timelineTruncated:
            (selected?.events.length ?? 0) + licenseTimeline.length >
            DRM_CONTRACT_LIMITS.timeline,
        accessRequests: Object.freeze(accessRequests),
    });
}

export function decodePsshEvidence(input) {
    const value = String(input ?? '').trim();
    if (!value)
        return Object.freeze({ state: 'empty', error: 'Enter PSSH data.' });
    if (value.length > DRM_CONTRACT_LIMITS.psshCharacters) {
        return Object.freeze({
            state: 'too-large',
            error: `PSSH input exceeds ${DRM_CONTRACT_LIMITS.psshCharacters} characters.`,
        });
    }
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
        return Object.freeze({
            state: 'invalid',
            error: 'Invalid Base64 PSSH.',
        });
    }
    const estimatedBytes = Math.floor((value.length * 3) / 4);
    if (estimatedBytes > DRM_CONTRACT_LIMITS.payloadBytes) {
        return Object.freeze({
            state: 'too-large',
            error: `Decoded PSSH exceeds ${DRM_CONTRACT_LIMITS.payloadBytes} bytes.`,
        });
    }
    try {
        const parsed = parsePsshString(value);
        const dataHex = boundedText(
            parsed.dataHex,
            DRM_CONTRACT_LIMITS.payloadHexCharacters
        );
        return Object.freeze({
            state: 'ready',
            systemName: boundedText(parsed.systemName),
            systemId: boundedText(parsed.systemId),
            version: finite(parsed.version),
            keyIds: Object.freeze(
                (parsed.keyIds ?? [])
                    .slice(0, DRM_CONTRACT_LIMITS.keyIds)
                    .map((keyId) => boundedText(keyId, 128))
            ),
            keyIdsTruncated:
                (parsed.keyIds?.length ?? 0) > DRM_CONTRACT_LIMITS.keyIds,
            dataSize: finite(parsed.dataSize),
            dataHex,
            payloadTruncated: parsed.dataHex.length > dataHex.length,
            licenseUrl: parsed.licenseUrl
                ? redactNetworkUrl(parsed.licenseUrl)
                : '',
        });
    } catch (error) {
        return Object.freeze({
            state: 'invalid',
            error: boundedText(error?.message, DRM_CONTRACT_LIMITS.error),
        });
    }
}

export const DRM_NETWORK_PREVIEW_LIMIT = NETWORK_CONTRACT_LIMITS.responseBytes;
