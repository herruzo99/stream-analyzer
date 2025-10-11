import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import {
    findInitSegmentUrl,
} from '@/infrastructure/parsing/dash/segment-parser';
import {
    resolveBaseUrl,
} from '@/infrastructure/parsing/dash/recursive-parser';
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
     * @param {{ streams: import('@/types').Stream[] }} payload
     */
    handleAnalysisComplete({ streams }) {
        streams.forEach((stream) => {
            if (stream.protocol === 'dash') {
                this.fetchAllDashInitSegments(stream);
            } else if (stream.protocol === 'hls' && stream.manifest?.isMaster) {
                this.fetchAllHlsMediaPlaylists(stream);
            }
        });
    }

    /**
     * @param {import('@/types').Stream} stream
     */
    fetchAllHlsMediaPlaylists(stream) {
        if (!stream.manifest?.variants) return;

        // Trigger fetches for all media playlists in parallel. The existing
        // streamService will handle dispatching these to the worker.
        stream.manifest.variants.forEach((variant) => {
            eventBus.dispatch('hls:media-playlist-fetch-request', {
                streamId: stream.id,
                variantUri: variant.resolvedUri,
                isBackground: true, // This is a background enrichment task
            });
        });
    }

    /**
     * @param {import('@/types').Stream} stream
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
                    const initUrl = findInitSegmentUrl(rep, as, period, baseUrl);
                    if (initUrl && !initUrlMap.has(initUrl)) {
                        initUrlMap.set(initUrl, { repId: rep.id });
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