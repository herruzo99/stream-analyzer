import { initializeSegmentExplorerController } from './application/segmentExplorerController.js';
import { initializeSegmentAnalysisController } from './application/segmentAnalysisController.js';

/**
 * Initializes all application-layer logic for the Segment Explorer feature.
 */
export function initializeSegmentExplorerFeature() {
    initializeSegmentExplorerController();
    initializeSegmentAnalysisController();
}