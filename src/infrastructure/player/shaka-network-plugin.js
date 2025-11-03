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
    let segmentUniqueId = null;

    // --- ARCHITECTURAL FIX: Multi-stage, race-free streamId and uniqueId lookup ---
    // Stage 1: Primary. Get ID directly from the NetworkingEngine instance.
    const requester = /** @type {any} */ (request.requester);
    if (requester?.streamAnalyzerStreamId !== undefined) {
        streamId = requester.streamAnalyzerStreamId;
        debugLog(
            'shakaNetworkPlugin',
            `[Stage 1] Lookup successful. Found stream ID: ${streamId} directly on networking engine.`
        );
    }

    // Stage 2: Secondary. If primary fails, find stream whose base URL is a prefix of the request URI.
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

    // Stage 4: Definitive fallback. Deep search for the exact segment object.
    // This resolves the streamId, auth, and the canonical segmentUniqueId.
    if (streamId === null) {
        const rangeHeader = request.headers['Range']?.replace('bytes=', '');
        for (const stream of streams) {
            let foundSegment = null;
            const findInState = (state) =>
                (state.segments || []).find((s) => {
                    if (s.resolvedUrl !== uri) return false;
                    // If there's a range header, the segment must have a matching range.
                    if (rangeHeader) return s.range === rangeHeader;
                    // If no range header, the segment must not have a range.
                    return !s.range;
                });

            for (const state of stream.dashRepresentationState.values()) {
                foundSegment = findInState(state);
                if (foundSegment) break;
            }
            if (!foundSegment) {
                for (const state of stream.hlsVariantState.values()) {
                    foundSegment = findInState(state);
                    if (foundSegment) break;
                }
            }

            if (foundSegment) {
                streamId = stream.id;
                auth = stream.auth;
                segmentUniqueId = foundSegment.uniqueId;
                debugLog(
                    'shakaNetworkPlugin',
                    `[Stage 4] Lookup successful. Found stream ID: ${streamId} and uniqueId: ${segmentUniqueId} via deep segment search.`
                );
                break; // Exit the main stream loop
            }
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
        const isPlayerLoad = !requester?.isLiveRequest();

        payload = {
            streamId,
            url: uri,
            auth,
            isPlayerLoadRequest: isPlayerLoad, // CRITICAL FIX: Pass context to worker
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
        const player = requester?.player_;
        const shakaManifest = player?.getManifest();
        payload = {
            request: serializableRequest,
            requestType,
            auth,
            streamId,
            shakaManifest,
            segmentUniqueId: segmentUniqueId || uri, // Pass canonical uniqueId, fallback to URI
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
            error.code || shaka.util.Error.Code.NETWORK_ERROR,
            error.data || null
        );
    });

    return new shaka.util.AbortableOperation(shakaPromise, () => {
        workerTask.cancel();
        return Promise.resolve();
    });
}
