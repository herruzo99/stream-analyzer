import { eventBus } from '../core/event-bus.js';
import { storeActions } from '../core/store.js';
import {
    validateCmafTrack,
    validateCmafSwitchingSets,
    findInitSegmentUrl,
} from '../engines/cmaf/validator.js';
import { resolveBaseUrl } from '../protocols/manifest/dash/recursive-parser.js';
import { getParsedSegment } from './segmentService.js';

/**
 * Runs all CMAF validation checks for a given stream and stores the results.
 * @param {import('../core/types.js').Stream} stream
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
        const firstAS = firstPeriod?.adaptationSets[0];
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
                    getParsedSegment(initUrl),
                    getParsedSegment(mediaUrl),
                ]);
                const trackResults = validateCmafTrack(
                    initData.data,
                    mediaData.data
                );
                allResults.push(...trackResults);
            }
        }

        // --- Switching Set Validation ---
        const switchingSetResults = await validateCmafSwitchingSets(
            stream,
            getParsedSegment
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
