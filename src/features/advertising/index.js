import { initializeDetectStructuralAdsUseCase } from './application/detectStructuralAdsUseCase.js';
import { initializeResolveAdAvailUseCase } from './application/resolveAdAvailUseCase.js';

/**
 * Initializes all application-layer logic for the Advertising feature.
 */
export function initializeAdvertisingFeature() {
    const disposeResolution = initializeResolveAdAvailUseCase();
    const disposeStructural = initializeDetectStructuralAdsUseCase();
    return () => {
        disposeResolution();
        disposeStructural();
    };
}
