import { eventBus } from '@/application/event-bus';
import {
    validateCmafSwitchingSets,
    validateCmafTrack,
} from '@/features/compliance/domain/cmaf/validator';
import { findInitSegmentUrl } from '@/infrastructure/parsing/dash/segment-parser';
import { resolveBaseUrl } from '@/infrastructure/parsing/utils/recursive-parser';
import { getParsedSegment } from '@/infrastructure/segments/segmentService';
import { analysisActions } from '@/state/analysisStore';

async function runCmafValidation(stream) {
    if (stream.protocol !== 'dash') {
        return;
    }

    const semanticData = new Map(stream.semanticData);
    semanticData.set('cmafValidationStatus', 'pending');
    analysisActions.updateStream(stream.id, { semanticData });

    try {
        const manifestElement = stream.manifest.serializedManifest;
        const allResults = [];

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

            const mediaUniqueId = mediaSegment
                ? /** @type {any} */ (mediaSegment).uniqueId
                : undefined;

            if (initInfo && mediaUniqueId) {
                const initUniqueId = initInfo.range
                    ? `${initInfo.url}@init@${initInfo.range}`
                    : initInfo.url;

                // Use background: true to suppress global loader
                // Using .catch to swallow errors like 410 or network failures for the background check
                const [initEntry, mediaEntry] = await Promise.all([
                    getParsedSegment(
                        initUniqueId,
                        stream.id,
                        'isobmff',
                        {},
                        { background: true }
                    )
                        .then((data) => ({ data, status: 200 }))
                        .catch(() => ({ status: 0, data: null })),
                    getParsedSegment(
                        mediaUniqueId,
                        stream.id,
                        'isobmff',
                        {},
                        { background: true }
                    )
                        .then((data) => ({ data, status: 200 }))
                        .catch(() => ({ status: 0, data: null })),
                ]);

                // ARCHITECTURAL FIX: Check success before validating
                if (
                    initEntry.status === 200 &&
                    mediaEntry.status === 200 &&
                    initEntry.data &&
                    mediaEntry.data
                ) {
                    const trackResults = validateCmafTrack(
                        /** @type {any} */ (initEntry.data),
                        /** @type {any} */ (mediaEntry.data)
                    );
                    allResults.push(...trackResults);
                } else {
                    allResults.push({
                        id: 'CMAF-SKIP',
                        text: 'Skipped CMAF Validation',
                        status: 'info',
                        details:
                            'Could not fetch necessary segments (Init or Media) for validation.',
                    });
                }
            }
        }

        const segmentFetcher = async (url, range) => {
            const uniqueId = range ? `${url}@init@${range}` : url;
            try {
                return await getParsedSegment(
                    uniqueId,
                    stream.id,
                    'isobmff',
                    {},
                    { background: true }
                );
            } catch (_e) {
                return null; // Return null on error so validator skips gracefully
            }
        };

        const switchingSetResults = await validateCmafSwitchingSets(
            stream,
            segmentFetcher,
            { resolveBaseUrl, findInitSegmentUrl }
        );
        allResults.push(...switchingSetResults);

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

export function initializeCmafService() {
    eventBus.subscribe('ui:cmaf-validation-requested', ({ stream }) => {
        // Debounce slightly to allow main thread to clear
        setTimeout(() => runCmafValidation(stream), 100);
    });
}
