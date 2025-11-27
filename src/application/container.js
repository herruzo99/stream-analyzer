import { eventBus } from '@/application/event-bus';
import { stopAllMonitoring } from '@/application/services/primaryStreamMonitorService';
import {
    getHistory,
    getLastUsedStreams,
    getPresets,
    saveLastUsedStreams,
} from '@/infrastructure/persistence/streamStorage';
import { workerService } from '@/infrastructure/worker/workerService';
import { analysisActions } from '@/state/analysisStore';
import { Application } from './app.js';

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
