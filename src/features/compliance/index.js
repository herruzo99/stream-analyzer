import { initializeCmafService } from './application/cmafService.js';
import { initializeComplianceController } from './application/complianceController.js';

/**
 * Initializes all application-layer logic for the Compliance feature.
 */
export function initializeComplianceFeature() {
    initializeComplianceController();
    initializeCmafService();
}
