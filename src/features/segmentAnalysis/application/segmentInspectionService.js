/**
 * segmentInspectionService — on-demand media segment inspection for the
 * DASH timing calculator's embedded inspector.
 *
 * Reconstructed for the port (referenced but never committed). Contract,
 * derived from the calculator's call site:
 *   inspect(url, buffer, { initSegmentBoxes }) →
 *     { uniqueId, parsedData, analysisPromise }
 * - `parsedData` resolves fast (structure parse) so the inspector opens
 *   immediately;
 * - `analysisPromise` resolves the enriched result (full bitstream
 *   analysis) and reactively updates the inspector on completion.
 *
 * Built on the established codebase patterns: `workerService.postTask`
 * tasks (`parse-segment-structure`, `full-segment-analysis`) and the
 * `useSegmentCacheStore` LRU cache (same shape as `segmentService`).
 */
import { workerService } from '@/infrastructure/worker/workerService.js';
import { useSegmentCacheStore } from '@/state/segmentCacheStore.js';

/** Stable FNV-1a hex id for a segment URL. */
const hashUrl = (url) => {
    let hash = 2166136261;
    const text = String(url ?? '');
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return `seg-${(hash >>> 0).toString(36)}`;
};

export const segmentInspectionService = {
    /**
     * Inspect an already-fetched media segment buffer.
     * @param {string} url Segment URL (cache key).
     * @param {ArrayBuffer} buffer Fetched media bytes.
     * @param {object} [options]
     * @param {*} [options.initSegmentBoxes] Parsed init boxes for context.
     */
    async inspect(url, buffer, { initSegmentBoxes = null } = {}) {
        const uniqueId = hashUrl(url);
        const store = useSegmentCacheStore.getState();
        const cached = store.get(url);
        if (cached?.parsedData && !cached.parsedData.error) {
            return {
                uniqueId,
                parsedData: cached.parsedData,
                analysisPromise: Promise.resolve(cached.parsedData),
            };
        }

        const parsedData = await workerService.postTask(
            'parse-segment-structure',
            {
                data: buffer,
                url,
                formatHint: 'isobmff',
                initSegmentBoxes,
            }
        ).promise;
        if (parsedData?.error) {
            throw new Error(parsedData.error);
        }
        useSegmentCacheStore
            .getState()
            .set(url, { status: 200, data: buffer, parsedData, uniqueId });

        const analysisPromise = workerService
            .postTask('full-segment-analysis', {
                parsedData,
                rawData: buffer,
                context: { url, uniqueId, initSegmentBoxes },
            })
            .promise.then((enriched) => {
                const merged = { ...parsedData, ...enriched, uniqueId };
                const current = useSegmentCacheStore.getState().get(url);
                if (current) {
                    useSegmentCacheStore
                        .getState()
                        .set(url, { ...current, parsedData: merged });
                }
                return merged;
            });

        return { uniqueId, parsedData, analysisPromise };
    },
};
