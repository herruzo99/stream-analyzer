import { useAnalysisStore } from '@/state/analysisStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { appLog } from '@/shared/utils/debug';
import shaka from 'shaka-player/dist/shaka-player.ui.js';

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
    const LICENSE_REQUEST_TYPE = 2;
    const { urlAuthMap, streams } = useAnalysisStore.getState();

    let streamId = null;
    let auth = null;
    let segmentUniqueId = null;
    const rangeHeader = request.headers['Range']?.replace('bytes=', '');

    // Stage 1: Primary. Get ID directly from the NetworkingEngine instance if available.
    const requester = /** @type {any} */ (request['requester']);
    if (requester?.streamAnalyzerStreamId !== undefined) {
        streamId = requester.streamAnalyzerStreamId;
        appLog(
            'shakaNetworkPlugin',
            'info',
            `[Stage 1] Lookup successful. Found stream ID: ${streamId} directly on networking engine.`
        );
    }

    // Stage 2: Fallback to urlAuthMap for initial manifest requests.
    if (streamId === null && requestType === MANIFEST_REQUEST_TYPE) {
        const context = urlAuthMap.get(uri);
        if (context) {
            streamId = context.streamId ?? null;
            auth = context.auth ?? null;
            appLog(
                'shakaNetworkPlugin',
                'info',
                `[Stage 2] Lookup successful. Found stream ID: ${streamId} via urlAuthMap for manifest.`
            );
        }
    }

    // Stage 2.5: License request fallback (origin-based).
    if (streamId === null && requestType === LICENSE_REQUEST_TYPE) {
        appLog(
            'shakaNetworkPlugin',
            'info',
            '[Stage 2.5] License request detected. Attempting fallback lookup.'
        );
        try {
            const requestOrigin = new URL(uri).origin;
            for (const stream of streams) {
                const licenseUrls = stream.drmAuth?.licenseServerUrl;
                if (!licenseUrls) continue;

                const urlsToCheck =
                    typeof licenseUrls === 'string'
                        ? [licenseUrls]
                        : Object.values(licenseUrls);

                for (const licenseUrl of urlsToCheck) {
                    try {
                        if (new URL(licenseUrl).origin === requestOrigin) {
                            streamId = stream.id;
                            auth = stream.auth;
                            appLog(
                                'shakaNetworkPlugin',
                                'info',
                                `[Stage 2.5] Lookup successful. Matched license URL origin for stream ID: ${streamId}`
                            );
                            break;
                        }
                    } catch {
                        // Ignore invalid license URLs in config
                    }
                }
                if (streamId !== null) break;
            }
        } catch (e) {
            appLog(
                'shakaNetworkPlugin',
                'warn',
                '[Stage 2.5] Error during license URL origin matching:',
                e
            );
        }
    }

    // Stage 3: Definitive segment search.
    if (requestType === SEGMENT_REQUEST_TYPE) {
        for (const stream of streams) {
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
                streamId = stream.id;
                auth = stream.auth;
                segmentUniqueId = foundSegment.uniqueId;
                appLog(
                    'shakaNetworkPlugin',
                    'info',
                    `[Stage 3] Definitive lookup successful. Found stream ID: ${streamId} and uniqueId: ${segmentUniqueId} via deep segment search.`
                );
                break;
            }
        }
    }

    // Stage 4: Last-resort unique ID construction.
    if (segmentUniqueId === null && requestType === SEGMENT_REQUEST_TYPE) {
        if (rangeHeader) {
            segmentUniqueId = `${uri}@media@${rangeHeader}`;
        }
    }

    if (streamId !== null && auth === null) {
        const streamForAuth = streams.find((s) => s.id === streamId);
        auth = streamForAuth?.auth ?? null;
    }

    // Add to urlAuthMap to prevent the global interceptor from double-logging this request.
    if (streamId !== null && auth !== null) {
        urlAuthMap.set(uri, { streamId, auth, isShaka: true });
    }

    appLog(
        'shakaNetworkPlugin',
        'info',
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
            isLive: currentStream?.manifest?.type === 'dynamic',
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
            segmentPollingReps: Array.from(
                currentStream?.segmentPollingReps || []
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
            segmentUniqueId: segmentUniqueId || uri,
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
            error.code || shaka.util.Error.Code.HTTP_ERROR,
            error.data || null
        );
    });

    return new shaka.util.AbortableOperation(shakaPromise, () => {
        workerTask.cancel();
        return Promise.resolve();
    });
}
