import { Application } from './app.js';
import { eventBus } from '@/application/event-bus';
import { analysisActions } from '@/state/analysisStore';
import { stopAllMonitoring } from '@/application/services/primaryStreamMonitorService';
import {
    saveLastUsedStreams,
    getLastUsedStreams,
    getHistory,
    getPresets,
} from '@/infrastructure/persistence/streamStorage';
import { workerService } from '@/infrastructure/worker/workerService';

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