import { initializeMultiPlayerController } from './application/multiPlayerController.js';
import { multiPlayerService } from './application/multiPlayerService.js';

let disposeController = null;

/**
 * Initializes all application-layer logic for the Multi-Player feature.
 */
export function initializeMultiPlayerFeature() {
    disposeController ??= initializeMultiPlayerController();
    multiPlayerService.initialize();
}

export function disposeMultiPlayerFeature() {
    disposeController?.();
    disposeController = null;
    return multiPlayerService.destroyAll();
}
