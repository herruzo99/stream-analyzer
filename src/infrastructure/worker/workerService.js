import { eventBus } from '@/application/event-bus';
import { appLog } from '@/shared/utils/debug';

export class WorkerService {
    constructor() {
        this.worker = null;
        this.requestId = 0;
        this.pendingTasks = new Map();
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized || !window.ASSET_PATHS?.worker) {
            console.error(
                'WorkerService cannot be initialized. Hashed worker path not found.'
            );
            return;
        }
        this.worker = new Worker(window.ASSET_PATHS.worker, { type: 'module' });
        this.worker.onmessage = this._handleMessage.bind(this);
        this.worker.onerror = this._handleError.bind(this);
        this.isInitialized = true;
    }

    _handleError(error) {
        console.error('A critical error occurred in the Web Worker:', error);
        // Reject all pending tasks
        for (const [id, { reject }] of this.pendingTasks.entries()) {
            reject(
                new Error(
                    `Worker terminated unexpectedly. Original error: ${error.message}`
                )
            );
            this.pendingTasks.delete(id);
        }
    }

    _handleMessage(event) {
        const { id, result, error, type, payload } = event.data;

        // Allow global events from worker to bubble up to main thread EventBus
        if (type && id === undefined) {
            appLog(
                'WorkerService',
                'info',
                `Received global event from worker: ${type}. Dispatching to event bus.`,
                payload
            );
            eventBus.dispatch(type, payload);
            return;
        }

        if (!this.pendingTasks.has(id)) {
            return;
        }

        const { resolve, reject } = this.pendingTasks.get(id);

        if (error) {
            const genericError = new Error(
                `Worker task failed: ${error.message}`
            );
            Object.assign(genericError, error);
            reject(genericError);
        } else {
            resolve(result);
        }
        this.pendingTasks.delete(id);
    }

    cancelTask(id) {
        if (this.pendingTasks.has(id)) {
            const { reject } = this.pendingTasks.get(id);

            // Fire and forget message to worker
            if (this.worker) {
                this.worker.postMessage({ id, type: 'cancel-task' });
            }

            const abortError = new Error('Operation aborted by user.');
            abortError.name = 'AbortError';
            reject(abortError);

            this.pendingTasks.delete(id);
            appLog(
                'WorkerService',
                'info',
                `Task ${id} cancelled by main thread.`
            );
        }
    }

    postTask(type, payload) {
        if (!this.isInitialized) {
            return {
                promise: Promise.reject(
                    new Error('WorkerService has not been initialized.')
                ),
                cancel: () => {},
            };
        }

        const id = this.requestId++;

        // Create promise BEFORE postMessage to catch synchronous serialization errors
        const promise = new Promise((resolve, reject) => {
            this.pendingTasks.set(id, { resolve, reject });

            try {
                // ARCHITECTURAL FIX: Guard against DataCloneError
                this.worker.postMessage({ id, type, payload });
            } catch (e) {
                console.error(
                    `[WorkerService] Failed to post message for task ${id} (${type})`,
                    e
                );
                this.pendingTasks.delete(id);
                reject(new Error(`Serialization failed: ${e.message}`));
            }
        });

        return {
            promise,
            cancel: () => this.cancelTask(id),
        };
    }
}

export const workerService = new WorkerService();
