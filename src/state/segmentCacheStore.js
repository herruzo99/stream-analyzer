import { LRUCache } from '@/application/lru-cache';
import { createStore } from 'zustand/vanilla';

const SEGMENT_CACHE_SIZE = 400;

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
        // Create a new LRUCache instance pointing to the same internal map.
        // This is a cheap way to create a new object reference and trigger Zustand's update.
        const newCache = new LRUCache(currentCache.maxSize);
        newCache.cache = currentCache.cache;
        set({ cache: newCache });
    },
    get: (url) => get().cache.get(url),
    clear: () => set({ cache: new LRUCache(SEGMENT_CACHE_SIZE) }),
}));
