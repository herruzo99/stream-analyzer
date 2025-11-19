import { initializeResolveAdAvailUseCase } from './application/resolveAdAvailUseCase.js';
import { initializeDetectStructuralAdsUseCase } from './application/detectStructuralAdsUseCase.js';

/**
 * Initializes all application-layer logic for the Advertising feature.
 */
export function initializeAdvertisingFeature() {
    initializeResolveAdAvailUseCase();
    initializeDetectStructuralAdsUseCase();
}
