import { eventBus } from '@/application/event-bus';
import { findChildrenRecursive } from '@/infrastructure/parsing/utils/recursive-parser';
import { analysisActions } from '@/state/analysisStore';
import { AdAvail } from '../domain/AdAvail';

/**
 * A list of known prefixes for Period IDs used by SSAI vendors.
 * This is a heuristic-based fallback for detecting ad insertion periods.
 */
const KNOWN_SSAI_PREFIXES = ['DAICONNECT', 'MEDIATAILOR', 'YOSPACE', 'VMAP'];

/**
 * Iterates through the periods of a stream after analysis is complete
 * and detects ad breaks based on structural heuristics.
 * @param {import('@/types').Stream} stream
 */
function detectStructuralAds(stream) {
    if (stream.protocol !== 'dash' || !stream.manifest?.periods) {
        return;
    }

    const adAvailsToAdd = [];
    let previousPeriod = null;

    for (const currentPeriod of stream.manifest.periods) {
        if (previousPeriod) {
            let detectionMethod = null;

            const currentAssetId = currentPeriod.assetIdentifier?.value;
            const prevAssetId = previousPeriod.assetIdentifier?.value;

            // Heuristic 1: A change in AssetIdentifier is a strong signal of different content.
            if (
                currentAssetId &&
                prevAssetId &&
                currentAssetId !== prevAssetId
            ) {
                detectionMethod = 'ASSET_IDENTIFIER';
            }

            // Heuristic 2: A transition from clear to encrypted or vice-versa is a common SSAI pattern.
            const isCurrentEncrypted =
                findChildrenRecursive(
                    currentPeriod.serializedManifest,
                    'ContentProtection'
                ).length > 0;
            const isPrevEncrypted =
                findChildrenRecursive(
                    previousPeriod.serializedManifest,
                    'ContentProtection'
                ).length > 0;

            if (isCurrentEncrypted !== isPrevEncrypted) {
                detectionMethod = 'ENCRYPTION_TRANSITION';
            }

            // Heuristic 3: The Period ID matches a known SSAI vendor prefix.
            if (
                currentPeriod.id &&
                KNOWN_SSAI_PREFIXES.some((prefix) =>
                    currentPeriod.id.toUpperCase().startsWith(prefix)
                )
            ) {
                // We re-use 'STRUCTURAL_DISCONTINUITY' for this more specific, high-confidence case.
                detectionMethod = 'STRUCTURAL_DISCONTINUITY';
            }

            if (detectionMethod) {
                const adAvail = new AdAvail({
                    id: currentPeriod.id || `ad -break-${currentPeriod.start} `,
                    startTime: currentPeriod.start,
                    duration: currentPeriod.duration || null,
                    scte35Signal: null,
                    adManifestUrl: null,
                    creatives: [],
                    detectionMethod: /** @type {any} */ (detectionMethod),
                });
                adAvailsToAdd.push(adAvail);
            }
        }
        previousPeriod = currentPeriod;
    }

    if (adAvailsToAdd.length > 0) {
        const currentAdAvails = stream.adAvails || [];
        const existingAvailIds = new Set(currentAdAvails.map((a) => a.id));

        const newUniqueAvails = adAvailsToAdd.filter(
            (a) => !existingAvailIds.has(a.id)
        );

        if (newUniqueAvails.length > 0) {
            analysisActions.updateStream(stream.id, {
                adAvails: [...currentAdAvails, ...newUniqueAvails],
            });
        }
    }
}

function handleAnalysisComplete({ streams }) {
    for (const stream of streams) {
        detectStructuralAds(stream);
    }
}

export function initializeDetectStructuralAdsUseCase() {
    eventBus.subscribe('state:analysis-complete', handleAnalysisComplete);
}
