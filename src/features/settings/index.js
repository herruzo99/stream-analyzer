import { memoryService } from './domain/memory-service.js';
import './ui/memory-view.js';

export function initializeSettingsFeature() {
    // Start background memory monitoring
    memoryService.startMonitoring();
}
