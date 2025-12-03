import { LRUCache } from '@/application/lru-cache';
import { createStore } from 'zustand/vanilla';
import { useSettingsStore } from './settingsStore.js';

// Initial fallback
const DEFAULT_CACHE_SIZE = 50;

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

export const useSegmentCacheStore = createStore((set, get) => ({
    // Initialize
    cache: new LRUCache(
        useSettingsStore.getState().segmentCacheLimit || DEFAULT_CACHE_SIZE
    ),

    set: (url, entry) => {
        const currentCache = get().cache;
        const currentLimit =
            useSettingsStore.getState().segmentCacheLimit || DEFAULT_CACHE_SIZE;

        // Check if limit changed
        if (currentCache.maxSize !== currentLimit) {
            // Create new cache with new limit and copy over
            const newCache = new LRUCache(currentLimit);
            currentCache.forEach((val, key) => {
                newCache.set(key, val);
            });
            newCache.set(url, entry);
            set({ cache: newCache });
            return;
        }

        // Normal set
        currentCache.set(url, entry);

        // Trigger update by shallow clone shell
        const newCacheWrapper = new LRUCache(currentLimit);
        newCacheWrapper.cache = currentCache.cache;
        newCacheWrapper.maxSize = currentCache.maxSize;

        set({ cache: newCacheWrapper });
    },

    get: (url) => get().cache.get(url),

    clear: () => {
        const limit =
            useSettingsStore.getState().segmentCacheLimit || DEFAULT_CACHE_SIZE;
        set({ cache: new LRUCache(limit) });
    },
}));
