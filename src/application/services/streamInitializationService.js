import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import { findInitSegmentUrl } from '@/infrastructure/parsing/dash/segment-parser';
import { resolveBaseUrl } from '@/infrastructure/parsing/dash/recursive-parser';
import { workerService } from '@/infrastructure/worker/workerService';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';

/**
 * A service dedicated to enriching stream objects with data from dependent resources
 * (like DASH init segments or HLS media playlists) after the initial analysis is complete.
 */
class StreamInitializationService {
    constructor() {
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;
        eventBus.subscribe(
            'state:analysis-complete',
            this.handleAnalysisComplete.bind(this)
        );
        this.isInitialized = true;
    }

    /**
     * @param {{ streams: import('@/types.ts').Stream[] }} payload
     */
    async handleAnalysisComplete({ streams }) {
        const enrichmentPromises = streams.map((stream) => {
            if (stream.protocol === 'dash') {
                return this.fetchAllDashInitSegments(stream);
            }
            // HLS playlist fetching remains on-demand
            return Promise.resolve();
        });
        await Promise.all(enrichmentPromises);
    }

    /**
     * @param {import('@/types.ts').Stream} stream
     */
    async fetchAllHlsMediaPlaylists(stream) {
        if (!stream.manifest?.variants) return;

        const playlistPromises = stream.manifest.variants.map((variant) =>
            workerService.postTask('fetch-hls-media-playlist', {
                streamId: stream.id,
                variantUri: variant.resolvedUri,
                hlsDefinedVariables: stream.hlsDefinedVariables,
            })
        );

        const results = await Promise.allSettled(playlistPromises);

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const data = result.value;
                analysisActions.updateHlsMediaPlaylist({
                    streamId: data.streamId,
                    variantUri: data.variantUri,
                    manifest: data.manifest,
                    manifestString: data.manifestString,
                    segments: data.segments,
                    freshSegmentUrls: data.freshSegmentUrls,
                });
            } else {
                console.error(
                    '[StreamInitializationService] Failed to fetch HLS media playlist:',
                    result.reason
                );
            }
        });
    }

    /**
     * @param {import('@/types.ts').Stream} stream
     */
    async fetchAllDashInitSegments(stream) {
        if (!stream.manifest?.periods) return;

        const initUrlMap = new Map();
        for (const period of stream.manifest.periods) {
            for (const as of period.adaptationSets) {
                for (const rep of as.representations) {
                    const baseUrl = resolveBaseUrl(
                        stream.baseUrl,
                        stream.manifest.serializedManifest,
                        period.serializedManifest,
                        as.serializedManifest,
                        rep.serializedManifest
                    );
                    const initInfo = findInitSegmentUrl(
                        rep,
                        as,
                        period,
                        baseUrl
                    );

                    if (initInfo) {
                        const uniqueId = initInfo.range
                            ? `${initInfo.url}@init@${initInfo.range}`
                            : initInfo.url;
                        if (!initUrlMap.has(uniqueId)) {
                            initUrlMap.set(uniqueId, {
                                url: initInfo.url,
                                range: initInfo.range,
                            });
                        }
                    }
                }
            }
        }

        const promises = Array.from(initUrlMap.entries()).map(
            async ([uniqueId, { url, range }]) => {
                try {
                    const response = await fetch(url, {
                        headers: range ? { Range: `bytes=${range}` } : {},
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} for ${url}`);
                    }
                    const data = await response.arrayBuffer();

                    // 1. Immediately cache the raw data on the main thread
                    useSegmentCacheStore
                        .getState()
                        .set(uniqueId, { status: 200, data, parsedData: null });

                    // 2. Send the raw data to the worker for caching and async parsing
                    await workerService.postTask('cache-raw-segment', {
                        uniqueId,
                        data,
                    });
                    const { parsedData } = await workerService.postTask(
                        'parse-cached-segment',
                        { uniqueId }
                    );

                    // 3. Update the main thread cache with the parsed data
                    useSegmentCacheStore.getState().set(uniqueId, {
                        status: 200,
                        data,
                        parsedData,
                    });

                    // Dispatch event for any other listeners (e.g., inband event monitor)
                    eventBus.dispatch('stream:init-segment-parsed', {
                        streamId: stream.id,
                        url: uniqueId,
                        parsedData,
                    });
                } catch (e) {
                    console.error(
                        `[StreamInitializationService] Failed to fetch init segment ${uniqueId}:`,
                        e
                    );
                    // Update cache with error state
                    useSegmentCacheStore.getState().set(uniqueId, {
                        status: 0,
                        data: null,
                        parsedData: { error: e.message },
                    });
                }
            }
        );

        await Promise.all(promises);
    }
}

export const streamInitializationService = new StreamInitializationService();
