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
        const { id, result, error } = event.data;
        if (!this.pendingTasks.has(id)) {
            return;
        }

        const { resolve, reject, timeoutId } = this.pendingTasks.get(id);
        clearTimeout(timeoutId);

        if (error) {
            const errorObj = new Error(`[Worker Task Failed] ${error.message}`);
            errorObj.stack = error.stack;
            errorObj.name = error.name;
            reject(errorObj);
        } else {
            resolve(result);
        }
        this.pendingTasks.delete(id);
    }

    postTask(type, payload) {
        if (!this.isInitialized) {
            return Promise.reject(
                new Error('WorkerService has not been initialized.')
            );
        }
        return new Promise((resolve, reject) => {
            const id = this.requestId++;

            const timeoutId = setTimeout(() => {
                if (this.pendingTasks.has(id)) {
                    reject(new Error(`Task "${type}" timed out.`));
                    this.pendingTasks.delete(id);
                }
            }, TASK_TIMEOUT);

            this.pendingTasks.set(id, { resolve, reject, timeoutId });
            this.worker.postMessage({ id, type, payload });
        });
    }
}

export const workerService = new WorkerService();
