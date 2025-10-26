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
 * Runs all CMAF validation checks for a given stream and stores the results.
 * @param {import('@/types.ts').Stream} stream
 */
async function runCmafValidation(stream) {
    if (stream.protocol !== 'dash') {
        return;
    }

    // Set pending state for local UI loader
    const semanticData = new Map(stream.semanticData);
    semanticData.set('cmafValidationStatus', 'pending');
    analysisActions.updateStream(stream.id, { semanticData });

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
            const initInfo = findInitSegmentUrl(
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

            if (initInfo && mediaUrl) {
                const initUniqueId = initInfo.range
                    ? `${initInfo.url}@init@${initInfo.range}`
                    : initInfo.url;

                const [initData, mediaData] = await Promise.all([
                    getParsedSegment(initUniqueId),
                    getParsedSegment(mediaUrl),
                ]);
                const trackResults = validateCmafTrack(
                    /** @type {any} */ (initData).data,
                    /** @type {any} */ (mediaData).data
                );
                allResults.push(...trackResults);
            }
        }

        // --- Switching Set Validation ---
        const segmentFetcher = (url, range) => {
            const uniqueId = range ? `${url}@init@${range}` : url;
            return getParsedSegment(uniqueId);
        };

        const switchingSetResults = await validateCmafSwitchingSets(
            stream,
            segmentFetcher,
            { resolveBaseUrl, findInitSegmentUrl }
        );
        allResults.push(...switchingSetResults);

        // Store results on the stream object
        const finalSemanticData = new Map(stream.semanticData);
        finalSemanticData.set('cmafValidation', allResults);
        finalSemanticData.set('cmafValidationStatus', 'complete');
        analysisActions.updateStream(stream.id, {
            semanticData: finalSemanticData,
        });
    } catch (e) {
        console.error(`[CMAF Service] Error during validation: ${e.message}`);
        const finalSemanticData = new Map(stream.semanticData);
        finalSemanticData.set('cmafValidation', [
            {
                id: 'CMAF-META',
                text: 'CMAF Conformance',
                status: 'fail',
                details: `Validation failed to run: ${e.message}`,
            },
        ]);
        finalSemanticData.set('cmafValidationStatus', 'error');
        analysisActions.updateStream(stream.id, {
            semanticData: finalSemanticData,
        });
    }
}

/**
 * Initializes the CMAF service to listen for user-initiated validation requests.
 */
export function initializeCmafService() {
    eventBus.subscribe('ui:cmaf-validation-requested', ({ stream }) => {
        runCmafValidation(stream);
    });
}
