import { memoryService } from './application/memoryService.js';

/**
 * Initializes the Memory Monitor feature.
 * This sets up listeners to automatically start/stop the service based on player activity.
 */
export function initializeMemoryMonitorFeature() {
    memoryService.initialize();
}