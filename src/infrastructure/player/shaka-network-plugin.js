import shaka from 'shaka-player/dist/shaka-player.compiled';
import { useAnalysisStore } from '@/state/analysisStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { debugLog } from '@/shared/utils/debug';

/**
 * A network plugin for Shaka Player.
 * It intercepts all HTTP/HTTPS requests, performs a robust lookup to find
 * the correct stream context, and forwards them to our web worker for
 * authentication handling and network logging.
 * @param {string} uri
 * @param {shaka.extern.Request} request
 * @param {shaka.net.NetworkingEngine.RequestType} requestType
 * @param {shaka.extern.ProgressUpdated} progressUpdated
 * @returns {shaka.extern.IAbortableOperation<shaka.extern.Response>}
 */
export function shakaNetworkPlugin(uri, request, requestType, progressUpdated) {
    const MANIFEST_REQUEST_TYPE = 0;
    const { urlAuthMap, streams } = useAnalysisStore.getState();

    let streamId = null;
    let auth = null;

    // --- ARCHITECTURAL FIX: Multi-stage, race-free streamId lookup ---
    // Stage 1: Primary. Get ID directly from the NetworkingEngine instance.
    const requester = /** @type {any} */ (request.requester);
    if (requester?.streamAnalyzerStreamId !== undefined) {
        streamId = requester.streamAnalyzerStreamId;
    }

    // Stage 2: Secondary. If primary fails, find stream whose base URL is a prefix of the request URI.
    // This is now more reliable because the base URL is the directory.
    if (streamId === null) {
        const streamForAuth = streams.find(
            (s) => s.baseUrl && uri.startsWith(s.baseUrl)
        );
        if (streamForAuth) {
            streamId = streamForAuth.id;
            auth = streamForAuth.auth;
            debugLog(
                'shakaNetworkPlugin',
                `[Stage 2] Lookup successful. Found stream ID: ${streamId} by base URL.`
            );
        }
    }

    // Stage 3: Fallback to urlAuthMap (useful for initial manifest requests and live updates).
    if (streamId === null) {
        const context = urlAuthMap.get(uri);
        if (context) {
            streamId = context.streamId ?? null;
            auth = context.auth ?? null;
            debugLog(
                'shakaNetworkPlugin',
                `[Stage 3] Lookup successful. Found stream ID: ${streamId} via urlAuthMap.`
            );
        }
    }

    // Stage 4: Definitive but expensive fallback. Iterate all known segments.
    if (streamId === null) {
        for (const stream of streams) {
            for (const state of stream.dashRepresentationState.values()) {
                if (state.segments.some((s) => s.resolvedUrl === uri)) {
                    streamId = stream.id;
                    auth = stream.auth;
                    debugLog(
                        'shakaNetworkPlugin',
                        `[Stage 4] Lookup successful. Found stream ID: ${streamId} via deep segment search.`
                    );
                    break;
                }
            }
            if (streamId !== null) break;
        }
    }
    // --- END FIX ---

    if (streamId !== null && auth === null) {
        const streamForAuth = streams.find((s) => s.id === streamId);
        auth = streamForAuth?.auth ?? null;
    }

    debugLog(
        'shakaNetworkPlugin',
        `Intercepted request. Final lookup found stream ID: ${streamId}`,
        { uri, requestType }
    );

    const serializableRequest = {
        uris: request.uris,
        method: request.method,
        headers: { ...request.headers },
        body: request.body,
    };

    let taskType;
    let payload;

    if (requestType === MANIFEST_REQUEST_TYPE) {
        taskType = 'shaka-fetch-manifest';
        const currentStream = streams.find((s) => s.id === streamId);
        payload = {
            streamId,
            url: uri,
            auth,
            oldRawManifest: currentStream?.rawManifest || '',
            protocol: currentStream?.protocol,
            baseUrl: currentStream?.baseUrl,
            hlsDefinedVariables: currentStream?.hlsDefinedVariables,
            oldManifestObjectForDelta:
                currentStream?.manifest?.serializedManifest,
            oldDashRepresentationState: Array.from(
                currentStream?.dashRepresentationState.entries() || []
            ),
            oldHlsVariantState: Array.from(
                currentStream?.hlsVariantState.entries() || []
            ),
        };
    } else {
        taskType = 'shaka-fetch-resource';
        payload = {
            request: serializableRequest,
            requestType,
            auth,
            streamId,
        };
    }

    const workerTask = workerService.postTask(taskType, payload);

    const shakaPromise = workerTask.promise.catch((error) => {
        if (error.name === 'AbortError') {
            throw new shaka.util.Error(
                shaka.util.Error.Severity.RECOVERABLE,
                shaka.util.Error.Category.PLAYER,
                shaka.util.Error.Code.OPERATION_ABORTED
            );
        }
        throw new shaka.util.Error(
            error.severity || shaka.util.Error.Severity.CRITICAL,
            error.category || shaka.util.Error.Category.NETWORK,
            error.code ||
                shaka.util.Error.Code.REQUESTED_KEY_SYSTEM_CONFIG_UNAVAILABLE,
            error.data || null
        );
    });

    return new shaka.util.AbortableOperation(shakaPromise, () => {
        workerTask.cancel();
        return Promise.resolve();
    });
}
