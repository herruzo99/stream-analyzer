import { initializeAnalysisController } from './application/analysisController.js';
import { initializeSavePresetUseCase } from './application/savePresetUseCase.js';
import { initializeStreamInputController } from './application/streamInputController.js';
import { initializeStreamMetadataService } from './application/streamMetadataService.js';

/**
 * Initializes all application-layer logic for the Stream Input feature.
 */
export function initializeStreamInputFeature() {
    initializeStreamInputController();
    initializeSavePresetUseCase();
    initializeAnalysisController();
    initializeStreamMetadataService();
}
