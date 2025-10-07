import { eventBus } from '../app/event-bus.js';
import { storeActions } from '../app/store.js';
import {
    validateCmafTrack,
    validateCmafSwitchingSets,
} from '../domain/cmaf/validator.js';
import { resolveBaseUrl } from '../infrastructure/manifest/dash/recursive-parser.js';
import { parseISOBMFF } from '../infrastructure/segment/isobmff/parser.js';
import { findInitSegmentUrl } from '../infrastructure/manifest/dash/segment-parser.js';

/**
 * A private, isolated segment fetcher for this service that does not interact
 * with the global store or cache.
 * @param {string} url The URL of the ISOBMFF segment to fetch and parse.
 * @returns {Promise<object>} The parsed segment data.
 * @throws {Error} If the fetch or parsing fails.
 */
async function _fetchAndParseIsobmff(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} fetching segment for CMAF validation: ${url}`
        );
    }
    const buffer = await response.arrayBuffer();
    const { boxes, issues, events } = parseISOBMFF(buffer);
    if (issues.some((issue) => issue.type === 'error')) {
        throw new Error(
            `Failed to parse ISOBMFF segment for CMAF validation: ${url}`
        );
    }
    // The validator expects the `data` property, which we are not providing.
    // The validator's `validateCmafTrack` expects the direct parsed object.
    return { boxes, issues, events };
}

/**
 * Runs all CMAF validation checks for a given stream and stores the results.
 * @param {import('../app/types.js').Stream} stream
 */
async function runCmafValidation(stream) {
    if (stream.protocol !== 'dash') {
        return;
    }

    try {
        const manifestElement = stream.manifest.serializedManifest;
        const allResults = [];

        // --- Track Conformance Validation ---
        const firstPeriod = stream.manifest?.periods[0];
        const firstAS = firstPeriod?.adaptationSets.find(
            (as) => as.contentType === 'video'
        );
        const firstRep = firstAS?.representations[0];

        if (firstRep && firstAS && firstPeriod) {
            const resolvedBaseUrl = resolveBaseUrl(
                stream.baseUrl,
                manifestElement,
                firstPeriod.serializedManifest,
                firstAS.serializedManifest,
                firstRep.serializedManifest
            );
            const initUrl = findInitSegmentUrl(
                firstRep,
                firstAS,
                firstPeriod,
                resolvedBaseUrl
            );
            const mediaUrl = stream.dashRepresentationState
                .get(`${firstPeriod.id}-${firstRep.id}`)
                ?.segments.find((s) => s.type === 'Media')?.resolvedUrl;

            if (initUrl && mediaUrl) {
                const [initData, mediaData] = await Promise.all([
                    _fetchAndParseIsobmff(initUrl),
                    _fetchAndParseIsobmff(mediaUrl),
                ]);
                const trackResults = validateCmafTrack(initData, mediaData);
                allResults.push(...trackResults);
            }
        }

        // --- Switching Set Validation ---
        const switchingSetResults = await validateCmafSwitchingSets(
            stream,
            _fetchAndParseIsobmff
        );
        allResults.push(...switchingSetResults);

        // Store results on the stream object
        const semanticData = new Map(stream.semanticData);
        semanticData.set('cmafValidation', allResults);
        storeActions.updateStream(stream.id, { semanticData });
    } catch (e) {
        console.error(`[CMAF Service] Error during validation: ${e.message}`);
        const semanticData = new Map(stream.semanticData);
        semanticData.set('cmafValidation', [
            {
                id: 'CMAF-META',
                text: 'CMAF Conformance',
                status: 'fail',
                details: `Validation failed to run: ${e.message}`,
            },
        ]);
        storeActions.updateStream(stream.id, { semanticData });
    }
}

/**
 * Initializes the CMAF service to listen for analysis completion events.
 */
export function initializeCmafService() {
    eventBus.subscribe('state:analysis-complete', ({ streams }) => {
        streams.forEach(runCmafValidation);
    });
}
