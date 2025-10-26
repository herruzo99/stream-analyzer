import { memoryService } from './application/memoryService.js';

/**
 * Initializes the Memory Monitor feature.
 * This starts the background service that periodically calculates memory usage.
 */
export function initializeMemoryMonitorFeature() {
    memoryService.start();
}