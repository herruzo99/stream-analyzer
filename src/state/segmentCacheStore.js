import { createStore } from 'zustand/vanilla';
import { LRUCache } from '@/application/lru-cache';

const SEGMENT_CACHE_SIZE = 200;

/**
 * @typedef {object} SegmentCacheState
 * @property {LRUCache} cache
 */

/**
 * @typedef {object} SegmentCacheActions
 * @property {(url: string, entry: any) => void} set
 * @property {(url: string) => any} get
 * @property {() => void} clear
 */

/**
 * A dedicated store for managing the segment cache.
 * @type {import('zustand/vanilla').StoreApi<SegmentCacheState & SegmentCacheActions>}
 */
export const useSegmentCacheStore = createStore((set, get) => ({
    cache: new LRUCache(SEGMENT_CACHE_SIZE),
    set: (url, entry) => {
        const currentCache = get().cache;
        currentCache.set(url, entry);
        // Create a new object reference to trigger Zustand's shallow comparison
        set({ cache: currentCache.clone() });
    },
    get: (url) => get().cache.get(url),
    clear: () => set({ cache: new LRUCache(SEGMENT_CACHE_SIZE) }),
}));
