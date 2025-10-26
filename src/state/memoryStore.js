import { createStore } from 'zustand/vanilla';

/**
 * @typedef {object} MemoryReport
 * @property {{used: number, total: number, limit: number} | null} jsHeap
 * @property {number} segmentCache
 * @property {{analysis: number, ui: number, player: number, network: number, decryption: number, segmentCacheIndex: number, total: number}} appState
 */

/**
 * @typedef {object} MemoryState
 * @property {boolean} isPerformanceApiSupported
 * @property {MemoryReport | null} report
 */

/**
 * @typedef {object} MemoryActions
 * @property {(report: MemoryReport) => void} updateReport
 */

/** @returns {MemoryState} */
const createInitialState = () => ({
    isPerformanceApiSupported:
        typeof performance !== 'undefined' && 'memory' in performance,
    report: null,
});

/**
 * A store for the memory monitor's state.
 * @type {import('zustand/vanilla').StoreApi<MemoryState & MemoryActions>}
 */
export const useMemoryStore = createStore((set) => ({
    ...createInitialState(),
    updateReport: (report) => set({ report }),
}));

export const memoryActions = useMemoryStore.getState();