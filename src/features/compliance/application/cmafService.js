import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import {
    validateCmafTrack,
    validateCmafSwitchingSets,
} from '@/features/compliance/domain/cmaf/validator';
import { resolveBaseUrl } from '@/infrastructure/parsing/dash/recursive-parser';
import { findInitSegmentUrl } from '@/infrastructure/parsing/dash/segment-parser';
import { getParsedSegment } from '@/infrastructure/segments/segmentService';

/**
 * A private, isolated segment fetcher for this service that does not interact
 * with the global store or cache directly, but uses the public segment service API.
 * @param {string} url The URL of the ISOBFF segment to fetch and parse.
 * @returns {Promise<object>} The parsed segment data.
 * @throws {Error} If the fetch or parsing fails.
 */
async function _fetchAndParseIsobmff(url) {
    // Re-use the main segment service, which now handles caching and parsing.
    return getParsedSegment(url);
}

/**
 * Runs all CMAF validation checks for a given stream and stores the results.
 * @param {import('@/types.ts').Stream} stream
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

            const compositeKey = `${firstPeriod.id || 0}-${firstRep.id}`;
            const mediaSegment = stream.dashRepresentationState
                .get(compositeKey)
                ?.segments.find((s) => /** @type {any} */ (s).type === 'Media');

            const mediaUrl = mediaSegment
                ? /** @type {any} */ (mediaSegment).resolvedUrl
                : undefined;

            if (initUrl && mediaUrl) {
                const [initData, mediaData] = await Promise.all([
                    _fetchAndParseIsobmff(initUrl),
                    _fetchAndParseIsobmff(mediaUrl),
                ]);
                const trackResults = validateCmafTrack(
                    /** @type {any} */ (initData).data,
                    /** @type {any} */ (mediaData).data
                );
                allResults.push(...trackResults);
            }
        }

        // --- Switching Set Validation ---
        const switchingSetResults = await validateCmafSwitchingSets(
            stream,
            _fetchAndParseIsobmff,
            { resolveBaseUrl, findInitSegmentUrl }
        );
        allResults.push(...switchingSetResults);

        // Store results on the stream object
        const semanticData = new Map(stream.semanticData);
        semanticData.set('cmafValidation', allResults);
        analysisActions.updateStream(stream.id, { semanticData });
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
        analysisActions.updateStream(stream.id, { semanticData });
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