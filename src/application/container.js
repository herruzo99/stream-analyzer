import { Application } from './app.js';
import { eventBus } from '@/application/event-bus.js';
import { analysisActions } from '@/state/analysisStore.js';
import { stopAllMonitoring } from '@/application/services/primaryStreamMonitorService.js';
import {
    saveLastUsedStreams,
    getLastUsedStreams,
    getHistory,
    getPresets,
} from '@/infrastructure/persistence/streamStorage.js';
import { workerService } from '@/infrastructure/worker/workerService.js';

// --- Core Service Dependencies ---
const services = {
    eventBus,
    analysisActions,
    stopAllMonitoring,
    workerService,
    storage: {
        saveLastUsedStreams,
        getLastUsedStreams,
        getHistory,
        getPresets,
    },
};

// --- Application Core Instantiation ---
const app = new Application(services);

// --- Export Container ---
export const container = {
    app,
    services,
};