/**
 * A simple, memory-efficient LRU (Least Recently Used) cache implementation.
 * It uses a Map to maintain insertion order for O(1) access, insertion, and deletion.
 * When the cache exceeds its maximum size, the least recently used item (the first item
 * in the map's insertion order) is evicted.
 */
export class LRUCache {
    /**
     * @param {number} maxSize The maximum number of items to store in the cache.
     */
    constructor(maxSize = 100) {
        if (maxSize < 1) {
            throw new Error('LRUCache maxSize must be at least 1.');
        }
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    /**
     * Retrieves an item from the cache and marks it as recently used.
     * @param {any} key The key of the item to retrieve.
     * @returns {any | undefined} The cached value or undefined if not found.
     */
    get(key) {
        if (!this.cache.has(key)) {
            return undefined;
        }

        const value = this.cache.get(key);
        // By deleting and setting the key again, we move it to the end of the
        // map's insertion order, marking it as the most recently used.
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    /**
     * Adds an item to the cache, evicting the least recently used item if necessary.
     * @param {any} key The key of the item to add.
     * @param {any} value The value of the item to add.
     */
    set(key, value) {
        // If the key already exists, delete it to ensure it's moved to the end.
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Check for eviction before adding the new item.
        if (this.cache.size >= this.maxSize) {
            // Get the first key in the map, which is the least recently used.
            const leastRecentlyUsedKey = this.cache.keys().next().value;
            this.cache.delete(leastRecentlyUsedKey);
        }

        this.cache.set(key, value);
    }

    /**
     * Checks if an item exists in the cache.
     * @param {any} key The key to check.
     * @returns {boolean}
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Executes a provided function once for each key/value pair in the cache.
     * @param {(value: any, key: any, map: Map<any, any>) => void} callback
     */
    forEach(callback) {
        this.cache.forEach(callback);
    }

    /**
     * Clears all items from the cache.
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Creates a new LRUCache instance with a shallow copy of the current cache's contents.
     * @returns {LRUCache}
     */
    clone() {
        const newCache = new LRUCache(this.maxSize);
        newCache.cache = new Map(this.cache);
        return newCache;
    }
}