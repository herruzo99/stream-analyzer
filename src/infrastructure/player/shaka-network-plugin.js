import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore } from '@/state/analysisStore';
import { useNetworkStore } from '@/state/networkStore'; // New Import
import shaka from 'shaka-player/dist/shaka-player.ui.js';

export function shakaNetworkPlugin(uri, request, requestType, progressUpdated) {
    const MANIFEST_REQUEST_TYPE = 0;
    const SEGMENT_REQUEST_TYPE = 1;
    const LICENSE_REQUEST_TYPE = 2;
    const { urlAuthMap, streams } = useAnalysisStore.getState();

    let streamId = null;
    let auth = null;
    let segmentUniqueId = null;
    let segmentDuration = undefined;

    try {
        const requester = /** @type {any} */ (request['requester']);
        if (requester?.streamAnalyzerStreamId !== undefined) {
            streamId = requester.streamAnalyzerStreamId;
        }

        if (streamId === null && requestType === MANIFEST_REQUEST_TYPE) {
            const context = urlAuthMap.get(uri);
            if (context) {
                streamId = context.streamId ?? null;
                auth = context.auth ?? null;
            }
        }

        if (streamId === null && requestType === LICENSE_REQUEST_TYPE) {
            const requestOrigin = new URL(uri).origin;
            for (const stream of streams) {
                const licenseUrls = stream.drmAuth?.licenseServerUrl;
                if (!licenseUrls) continue;
                const urlsToCheck =
                    typeof licenseUrls === 'string'
                        ? [licenseUrls]
                        : Object.values(licenseUrls);
                for (const licenseUrl of urlsToCheck) {
                    if (new URL(licenseUrl).origin === requestOrigin) {
                        streamId = stream.id;
                        auth = stream.drmAuth;
                        break;
                    }
                }
                if (streamId !== null) break;
            }
        }

        if (requestType === SEGMENT_REQUEST_TYPE) {
            const rangeHeader =
                request.headers &&
                (request.headers['Range'] || request.headers['range']);
            const cleanRange = rangeHeader
                ? rangeHeader.replace('bytes=', '')
                : null;

            for (const stream of streams) {
                if (streamId !== null && stream.id !== streamId) continue;

                const findInState = (state) =>
                    (state.segments || []).find(
                        (s) =>
                            s.resolvedUrl === uri &&
                            (!cleanRange || s.range === cleanRange)
                    );

                let foundSegment = null;
                for (const state of stream.dashRepresentationState.values()) {
                    if ((foundSegment = findInState(state))) break;
                }
                if (!foundSegment) {
                    for (const state of stream.hlsVariantState.values()) {
                        if ((foundSegment = findInState(state))) break;
                    }
                }

                if (foundSegment) {
                    streamId = stream.id;
                    auth = stream.auth;
                    segmentUniqueId = foundSegment.uniqueId;
                    if (foundSegment.duration && foundSegment.timescale) {
                        segmentDuration =
                            foundSegment.duration / foundSegment.timescale;
                    }
                    break;
                }
            }

            if (segmentUniqueId === null && cleanRange) {
                segmentUniqueId = `${uri}@media@${cleanRange}`;
            }
        }

        if (streamId !== null && auth === null) {
            const streamForAuth = streams.find((s) => s.id === streamId);
            if (streamForAuth) {
                if (requestType === LICENSE_REQUEST_TYPE) {
                    auth = streamForAuth.drmAuth;
                } else {
                    auth = streamForAuth.auth;
                }
            }
        }

        if (streamId !== null && auth !== null) {
            if (requestType !== LICENSE_REQUEST_TYPE) {
                urlAuthMap.set(uri, { streamId, auth, isShaka: true });
            }
        }
    } catch (e) {
        console.warn('Shaka context lookup failed non-critically:', e);
    }

    const safeHeaders = {};
    if (request.headers) {
        for (const key of Object.keys(request.headers)) {
            safeHeaders[key] = String(request.headers[key]);
        }
    }

    let safeBody = null;
    if (request.body) {
        try {
            if (typeof request.body === 'string') {
                safeBody = request.body;
            } else if (ArrayBuffer.isView(request.body)) {
                safeBody = request.body.buffer.slice(
                    request.body.byteOffset,
                    request.body.byteOffset + request.body.byteLength
                );
            } else if (request.body instanceof ArrayBuffer) {
                safeBody = request.body.slice(0);
            }
        } catch (err) {
            console.error('[ShakaPlugin] Body cloning failed:', err);
            safeBody = null;
        }
    }

    const serializableRequest = {
        uris: [...request.uris],
        method: String(request.method || 'GET'),
        headers: safeHeaders,
        body: safeBody,
    };

    let taskType = 'shaka-fetch-resource';

    // --- Capture Active Intervention Rules ---
    const { interventionRules } = useNetworkStore.getState();
    const activeRules = interventionRules.filter((r) => r.enabled);

    /** @type {any} */
    let payload = {
        request: serializableRequest,
        requestType,
        auth: auth ? JSON.parse(JSON.stringify(auth)) : null,
        streamId,
        segmentUniqueId: segmentUniqueId || uri,
        segmentDuration,
        interventionRules: activeRules, // Pass rules to worker
    };

    if (requestType === MANIFEST_REQUEST_TYPE) {
        taskType = 'shaka-fetch-manifest';
        const currentStream = streams.find((s) => s.id === streamId);
        payload = {
            streamId,
            url: uri,
            auth: auth ? JSON.parse(JSON.stringify(auth)) : null,
            isPlayerLoadRequest: !currentStream,
            isLive: currentStream?.manifest?.type === 'dynamic',
            oldRawManifest: currentStream?.rawManifest || '',
            protocol: currentStream?.protocol || 'dash',
            baseUrl: currentStream?.baseUrl,
            hlsDefinedVariables: currentStream?.hlsDefinedVariables,
            oldManifestObjectForDelta:
                currentStream?.manifest?.serializedManifest,
            oldDashRepresentationState: [],
            oldHlsVariantState: [],
            oldAdAvails: [],
            segmentPollingReps: [],
            interventionRules: activeRules, // Pass rules here too
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
            shaka.util.Error.Severity.CRITICAL,
            shaka.util.Error.Category.NETWORK,
            shaka.util.Error.Code.HTTP_ERROR,
            null
        );
    });

    return new shaka.util.AbortableOperation(shakaPromise, () => {
        workerTask.cancel();
        return Promise.resolve();
    });
}
