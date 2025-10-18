import { initializeResolveAdAvailUseCase } from './application/resolveAdAvailUseCase.js';

/**
 * Initializes all application-layer logic for the Advertising feature.
 */
export function initializeAdvertisingFeature() {
    initializeResolveAdAvailUseCase();
}