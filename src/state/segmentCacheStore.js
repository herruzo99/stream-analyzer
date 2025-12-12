import { LRUCache } from '@/application/lru-cache';
import { createStore } from 'zustand/vanilla';
import { useSettingsStore } from './settingsStore.js';

// Initial fallback
const DEFAULT_CACHE_SIZE = 50;

export const useSegmentCacheStore = createStore((set, get) => ({
    // Initialize
    cache: new LRUCache(
        useSettingsStore.getState().segmentCacheLimit || DEFAULT_CACHE_SIZE
    ),

    set: (url, entry) => {
        // --- DEBUG: Track Cache Churn ---
        // console.groupCollapsed(`[SegmentCacheStore] Setting: ${url.split('/').pop()}`);
        // console.trace();
        
        const currentCache = get().cache;
        const currentLimit =
            useSettingsStore.getState().segmentCacheLimit || DEFAULT_CACHE_SIZE;

        // Check if limit changed
        if (currentCache.maxSize !== currentLimit) {
            console.log('[SegmentCacheStore] Resizing cache...');
            const newCache = new LRUCache(currentLimit);
            currentCache.forEach((val, key) => {
                newCache.set(key, val);
            });
            newCache.set(url, entry);
            set({ cache: newCache });
            // console.groupEnd();
            return;
        }

        // Optimization: Don't update if identical data exists (prevents thrashing)
        const existing = currentCache.get(url);
        // Compare status and data reference (cheap check)
        if (existing && existing.status === entry.status && existing.data === entry.data) {
             // If parsedData is also same reference, abort.
             if (existing.parsedData === entry.parsedData) {
                 // console.log('[SegmentCacheStore] Identical entry found. Aborting update.');
                 // console.groupEnd();
                 return;
             }
        }

        // console.log('[SegmentCacheStore] Updating entry.');
        // Normal set
        currentCache.set(url, entry);

        // Trigger update by shallow clone shell to notify subscribers
        const newCacheWrapper = new LRUCache(currentLimit);
        newCacheWrapper.cache = currentCache.cache;
        newCacheWrapper.maxSize = currentCache.maxSize;

        set({ cache: newCacheWrapper });
        // console.groupEnd();
    },

    get: (url) => get().cache.get(url),

    clear: () => {
        console.log('[SegmentCacheStore] Clearing all.');
        const limit =
            useSettingsStore.getState().segmentCacheLimit || DEFAULT_CACHE_SIZE;
        set({ cache: new LRUCache(limit) });
    },
}));