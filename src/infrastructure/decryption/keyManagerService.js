import { useDecryptionStore, decryptionActions } from '@/state/decryptionStore';
import { workerService } from '@/infrastructure/worker/workerService';
import { eventBus } from '@/application/event-bus';

/**
 * A map to hold pending promises for key fetches. This prevents duplicate
 * requests for the same key URI while it's in flight.
 * @type {Map<string, Promise<ArrayBuffer>>}
 */
const pendingFetches = new Map();

class KeyManagerService {
    initialize() {
        // This service can be initialized at boot.
        // It could also listen for events to clear its cache if needed.
        eventBus.subscribe('analysis:started', () => {
            decryptionActions.clearCache();
            pendingFetches.clear();
        });
    }

    /**
     * Retrieves a decryption key, either from the cache or by fetching it.
     * Manages pending requests to prevent duplicate fetches.
     * @param {string} uri The URI of the key to fetch.
     * @returns {Promise<ArrayBuffer>} A promise that resolves with the key as an ArrayBuffer.
     */
    getKey(uri) {
        // 1. Check live pending fetches first.
        if (pendingFetches.has(uri)) {
            return pendingFetches.get(uri);
        }

        // 2. Check the Zustand cache for a ready key.
        const cachedKey = useDecryptionStore.getState().keyCache.get(uri);
        if (cachedKey?.status === 'ready' && cachedKey.key) {
            return Promise.resolve(cachedKey.key);
        }

        // 3. Initiate a new fetch.
        const fetchPromise = this._fetchAndCacheKey(uri);
        pendingFetches.set(uri, fetchPromise);
        return fetchPromise;
    }

    /**
     * Internal method to perform the key fetch via the worker and update the cache.
     * @param {string} uri The URI of the key.
     * @returns {Promise<ArrayBuffer>}
     */
    async _fetchAndCacheKey(uri) {
        try {
            decryptionActions.setKeyPending(uri);
            const key = await workerService.postTask('fetch-key', { uri });
            decryptionActions.setKeyReady(uri, key);
            pendingFetches.delete(uri);
            return key;
        } catch (e) {
            console.error(
                `[KeyManagerService] Failed to fetch key for ${uri}:`,
                e
            );
            decryptionActions.setKeyError(uri, e.message);
            pendingFetches.delete(uri);
            throw e; // Re-throw to allow the caller to handle the failure.
        }
    }
}

export const keyManagerService = new KeyManagerService();
