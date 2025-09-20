import { analysisState } from '../../state.js';
import { parseISOBMFF } from '../segment-analysis/isobmff-parser.js';

/**
 * Fetches a segment if it's not already in the cache.
 * Manages the state of the segment cache, including parsing the data.
 * @param {string} url The URL of the segment to fetch.
 * @returns {Promise<void>}
 */
export async function fetchSegment(url) {
    if (
        analysisState.segmentCache.has(url) &&
        analysisState.segmentCache.get(url).status !== -1
    )
        return;
    try {
        analysisState.segmentCache.set(url, { status: -1, data: null, parsedData: null }); // Pending
        const response = await fetch(url, { method: 'GET', cache: 'no-store' });
        const data = response.ok ? await response.arrayBuffer() : null;

        let parsedData = null;
        if (data) {
            try {
                // For now, we assume ISOBMFF. A real implementation would check mime types.
                parsedData = parseISOBMFF(data);
            } catch (e) {
                console.error(`Failed to parse segment ${url}:`, e);
                // Store parsing error if needed
                parsedData = { error: e.message };
            }
        }

        analysisState.segmentCache.set(url, { status: response.status, data, parsedData });
    } catch (error) {
        console.error(`Failed to fetch segment ${url}:`, error);
        analysisState.segmentCache.set(url, { status: 0, data: null, parsedData: null }); // Network error
    }
}