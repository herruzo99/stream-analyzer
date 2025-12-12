import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore } from '@/state/analysisStore';
import { useNetworkStore } from '@/state/networkStore';
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

    // FIX: Intercept HEAD requests to blob: URLs (unsupported by browsers)
    if (request.method === 'HEAD' && uri.startsWith('blob:')) {
        return new shaka.util.AbortableOperation(
            Promise.resolve({
                uri: uri,
                originalUri: uri,
                data: new ArrayBuffer(0),
                headers: {},
            }),
            () => Promise.resolve()
        );
    }

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

            let requestUrlObj = null;
            try {
                requestUrlObj = new URL(uri);
            } catch (_e) { /* ignore */ }

            for (const stream of streams) {
                if (streamId !== null && stream.id !== streamId) continue;

                const findInState = (state) => {
                    const segments = state.segments || [];

                    const matchesUrl = (segUrlString) => {
                        if (segUrlString === uri) return true;
                        if (requestUrlObj) {
                            try {
                                const segUrl = new URL(segUrlString);
                                if (segUrl.pathname === requestUrlObj.pathname) return true;
                            } catch { /* ignore */ }
                        }
                        if (cleanRange && requestUrlObj) {
                            const reqFilename = requestUrlObj.pathname.split('/').pop();
                            if (segUrlString.endsWith(reqFilename)) return true;
                        }
                        return false;
                    };

                    if (cleanRange) {
                        const [reqStart] = cleanRange.split('-').map(Number);

                        // 1. Direct Range Match (Start Byte)
                        // This handles both Init segments (type='Init') and Media segments
                        const match = segments.find(s => {
                            if (!s.range) return false;
                            const [segStart] = s.range.split('-').map(Number);
                            return reqStart === segStart && matchesUrl(s.resolvedUrl);
                        });

                        if (match) return match;

                        // 2. Contiguous Init/Index Match (Heuristic)
                        // If the request starts immediately after an Init segment, treat it as part of Init (e.g. SIDX).
                        const initSegment = segments.find(s => s.type === 'Init' && matchesUrl(s.resolvedUrl));
                        if (initSegment && initSegment.range) {
                            const [_, initEnd] = initSegment.range.split('-').map(Number);
                            // Allow for 1-byte contiguity (end 2952, next 2953)
                            if (reqStart === initEnd + 1) {
                                return initSegment;
                            }
                        }
                    }

                    // 3. Fallback: URL-only match (if no range requested, or range match failed)
                    // We prioritize Media segments over Init if no range is specified, but 
                    // if it's the only match, we take it.
                    return segments.find(s => {
                        if (cleanRange && !s.range) return false;
                        return matchesUrl(s.resolvedUrl);
                    });
                };

                let foundSegment = null;
                // DASH
                for (const state of stream.dashRepresentationState.values()) {
                    // Check Init Segment specifically first if it exists in state root
                    if (state.initSegment) {
                        // Temporary wrap in array for shared logic
                        const initMatch = findInState({ segments: [state.initSegment] });
                        if (initMatch) {
                            foundSegment = initMatch;
                            break;
                        }
                    }
                    if ((foundSegment = findInState(state))) break;
                }
                // HLS
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
                // If matched fail, preserve range info for cache uniqueness.
                // We default to @media@ here, but this is a fallback.
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
    const { interventionRules } = useNetworkStore.getState();
    const activeRules = interventionRules.filter((r) => r.enabled);

    // FIX: Clone auth safely for transport
    let safeAuth = null;
    if (auth) {
        try {
            safeAuth = structuredClone(auth);
        } catch (_e) {
            safeAuth = { ...auth };
        }
    }

    /** @type {any} */
    let payload = {
        request: serializableRequest,
        requestType,
        auth: safeAuth,
        streamId,
        segmentUniqueId: segmentUniqueId || uri,
        segmentDuration,
        interventionRules: activeRules,
    };

    if (requestType === MANIFEST_REQUEST_TYPE) {
        taskType = 'shaka-fetch-manifest';
        const currentStream = streams.find((s) => s.id === streamId);

        payload = {
            streamId,
            url: uri,
            auth: safeAuth,
            isPlayerLoadRequest: !currentStream,
            // ARCHITECTURAL FIX: Explicitly mark this as a playback request
            // to decouple it from the analyzer polling loop.
            purpose: 'playback',

            isLive: currentStream?.manifest?.type === 'dynamic',
            oldRawManifest: currentStream?.rawManifest || '',
            protocol: currentStream?.protocol || null,
            baseUrl: currentStream?.baseUrl,
            hlsDefinedVariables: currentStream?.hlsDefinedVariables,
            oldManifestObjectForDelta:
                currentStream?.manifest?.serializedManifest,

            oldDashRepresentationState: currentStream
                ? Array.from(currentStream.dashRepresentationState.entries())
                : [],
            oldHlsVariantState: currentStream
                ? Array.from(currentStream.hlsVariantState.entries())
                : [],
            oldAdAvails: currentStream?.adAvails || [],
            segmentPollingReps: currentStream
                ? Array.from(currentStream.segmentPollingReps || [])
                : [],

            interventionRules: activeRules,
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
            uri,
            0,
            `Worker Error: ${error.message}`,
            {},
            requestType === MANIFEST_REQUEST_TYPE ? 'manifest' : 'segment'
        );
    });

    return new shaka.util.AbortableOperation(shakaPromise, () => {
        workerTask.cancel();
        return Promise.resolve();
    });
}