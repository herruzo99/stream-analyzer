import { initializeMultiPlayerController } from './application/multiPlayerController.js';
import { multiPlayerService } from './application/multiPlayerService.js';

/**
 * Initializes all application-layer logic for the Multi-Player feature.
 */
export function initializeMultiPlayerFeature() {
    initializeMultiPlayerController();
    multiPlayerService.initialize();
}
