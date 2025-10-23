import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import { findInitSegmentUrl } from '@/infrastructure/parsing/dash/segment-parser';
import { resolveBaseUrl } from '@/infrastructure/parsing/dash/recursive-parser';
import { workerService } from '@/infrastructure/worker/workerService';

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
        // NOTE: Eager fetching is disabled to prevent excessive requests on load.
        // Segments and playlists are now fetched on-demand by user interaction
        // in the respective UI components (e.g., Segment Explorer).
        // const enrichmentPromises = streams.map((stream) => {
        //     if (stream.protocol === 'dash') {
        //         return this.fetchAllDashInitSegments(stream);
        //     } else if (stream.protocol === 'hls' && stream.manifest?.isMaster) {
        //         return this.fetchAllHlsMediaPlaylists(stream);
        //     }
        //     return Promise.resolve();
        // });
        // await Promise.all(enrichmentPromises);
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
                    if (initInfo && !initUrlMap.has(initInfo.url)) {
                        initUrlMap.set(initInfo.url, { repId: rep.id });
                    }
                }
            }
        }

        const promises = Array.from(initUrlMap.keys()).map((url) =>
            fetch(url)
                .then((res) => {
                    if (!res.ok)
                        throw new Error(`HTTP ${res.status} for ${url}`);
                    return res.arrayBuffer();
                })
                .then((data) => ({ url, data }))
        );

        const results = await Promise.allSettled(promises);

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const { url, data } = result.value;
                // Offload parsing to the worker
                workerService
                    .postTask('parse-segment-structure', {
                        url,
                        data,
                        formatHint: 'isobmff',
                    })
                    .then((parsedData) => {
                        eventBus.dispatch('stream:init-segment-parsed', {
                            streamId: stream.id,
                            url,
                            parsedData,
                        });
                    });
            } else {
                console.error(
                    `[StreamInitializationService] Failed to fetch init segment: ${result.reason}`
                );
            }
        });
    }
}

export const streamInitializationService = new StreamInitializationService();