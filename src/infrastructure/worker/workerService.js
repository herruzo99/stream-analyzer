import { debugLog } from '@/shared/utils/debug';
import { eventBus } from '@/application/event-bus';

const TASK_TIMEOUT = 30000; // 30 seconds

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

        if (type && id === undefined) {
            debugLog(
                'WorkerService',
                `Received global event from worker: ${type}. Dispatching to event bus.`,
                payload
            );
            eventBus.dispatch(type, payload);
            return;
        }

        if (!this.pendingTasks.has(id)) {
            return;
        }

        const { resolve, reject, timeoutId } = this.pendingTasks.get(id);
        clearTimeout(timeoutId);

        if (error) {
            // Reject with a generic Error, wrapping the worker's message.
            // The caller is responsible for converting this to a domain-specific error if needed.
            const genericError = new Error(
                `Worker task failed: ${error.message}`
            );
            // Attach original error properties for context
            Object.assign(genericError, error);
            reject(genericError);
        } else {
            resolve(result);
        }
        this.pendingTasks.delete(id);
    }

    cancelTask(id) {
        if (this.pendingTasks.has(id)) {
            const { reject, timeoutId } = this.pendingTasks.get(id);
            clearTimeout(timeoutId);

            // Notify worker to cancel the operation
            this.worker.postMessage({ id, type: 'cancel-task' });

            // Immediately reject the promise with a standard AbortError.
            const abortError = new Error('Operation aborted by user.');
            abortError.name = 'AbortError';
            reject(abortError);

            this.pendingTasks.delete(id);
            debugLog('WorkerService', `Task ${id} cancelled by main thread.`);
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
        const promise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (this.pendingTasks.has(id)) {
                    this.cancelTask(id);
                }
            }, TASK_TIMEOUT);

            this.pendingTasks.set(id, { resolve, reject, timeoutId });
            this.worker.postMessage({ id, type, payload });
        });

        return {
            promise,
            cancel: () => this.cancelTask(id),
        };
    }
}

export const workerService = new WorkerService();