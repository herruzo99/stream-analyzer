import { useAnalysisStore } from '@/state/analysisStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { debugLog } from '@/shared/utils/debug';

/**
 * A network plugin for Shaka Player.
 * It intercepts all HTTP/HTTPS requests, performs a robust lookup to find
 * the correct stream context, and forwards them to our web worker for
 * authentication handling and network logging.
 * @param {string} uri
 * @param {any} request
 * @param {any} requestType
 * @param {any} progressUpdated
 * @returns {any}
 */
export function shakaNetworkPlugin(uri, request, requestType, progressUpdated) {
    const MANIFEST_REQUEST_TYPE = 0;
    const SEGMENT_REQUEST_TYPE = 1;
    const { urlAuthMap, streams } = useAnalysisStore.getState();

    let streamId = null;
    let auth = null;
    let segmentUniqueId = null;
    const rangeHeader = request.headers['Range']?.replace('bytes=', '');

    // --- ARCHITECTURAL FIX: Always perform deep search for segments ---
    // This new, consolidated lookup ensures we find the canonical segment object
    // from our state, which contains the correct `uniqueId` needed for caching.

    // Stage 1: Primary. Get ID directly from the NetworkingEngine instance if available.
    const requester = /** @type {any} */ (request['requester']);
    if (requester?.streamAnalyzerStreamId !== undefined) {
        streamId = requester.streamAnalyzerStreamId;
        debugLog(
            'shakaNetworkPlugin',
            `[Stage 1] Lookup successful. Found stream ID: ${streamId} directly on networking engine.`
        );
    }

    // Stage 2: Fallback to urlAuthMap for initial manifest requests.
    if (streamId === null && requestType === MANIFEST_REQUEST_TYPE) {
        const context = urlAuthMap.get(uri);
        if (context) {
            streamId = context.streamId ?? null;
            auth = context.auth ?? null;
            debugLog(
                'shakaNetworkPlugin',
                `[Stage 2] Lookup successful. Found stream ID: ${streamId} via urlAuthMap for manifest.`
            );
        }
    }

    // Stage 3: Definitive segment search. This must run for all segment requests.
    if (requestType === SEGMENT_REQUEST_TYPE) {
        for (const stream of streams) {
            // If we already know the streamId, only search within that stream.
            if (streamId !== null && stream.id !== streamId) {
                continue;
            }

            let foundSegment = null;
            const findInState = (state) =>
                (state.segments || []).find((s) => {
                    if (s.resolvedUrl !== uri) return false;
                    if (rangeHeader) return s.range === rangeHeader;
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
                streamId = stream.id; // Confirm or set streamId
                auth = stream.auth;
                segmentUniqueId = foundSegment.uniqueId;
                debugLog(
                    'shakaNetworkPlugin',
                    `[Stage 3] Definitive lookup successful. Found stream ID: ${streamId} and uniqueId: ${segmentUniqueId} via deep segment search.`
                );
                break; // Exit the main stream loop
            }
        }
    }

    // Stage 4: Fallback for segments that were not pre-calculated (e.g. some live scenarios)
    if (segmentUniqueId === null && requestType === SEGMENT_REQUEST_TYPE) {
        // Find stream context if not already known
        if (streamId === null) {
            const streamForAuth = streams.find(
                (s) => s.baseUrl && uri.startsWith(s.baseUrl)
            );
            if (streamForAuth) {
                streamId = streamForAuth.id;
                auth = streamForAuth.auth;
            }
        }
        // Construct unique ID as a last resort
        if (rangeHeader) {
            segmentUniqueId = `${uri}@media@${rangeHeader}`;
            debugLog(
                'shakaNetworkPlugin',
                `[Stage 4 - Fallback] Constructed unique ID for byte-ranged request: ${segmentUniqueId}`
            );
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

        const isPlayerLoad = !currentStream;

        payload = {
            streamId,
            url: uri,
            auth,
            isPlayerLoadRequest: isPlayerLoad,
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
            oldAdAvails: currentStream?.adAvails || [],
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
            throw new window.shaka.util.Error(
                window.shaka.util.Error.Severity.RECOVERABLE,
                window.shaka.util.Error.Category.PLAYER,
                window.shaka.util.Error.Code.OPERATION_ABORTED
            );
        }
        throw new window.shaka.util.Error(
            error.severity || window.shaka.util.Error.Severity.CRITICAL,
            error.category || window.shaka.util.Error.Category.NETWORK,
            error.code || window.shaka.util.Error.Code.HTTP_ERROR,
            error.data || null
        );
    });

    return new window.shaka.util.AbortableOperation(shakaPromise, () => {
        workerTask.cancel();
        return Promise.resolve();
    });
}