import { createStore } from 'zustand/vanilla';
import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';

/**
 * @typedef {'pending' | 'ready' | 'error'} KeyStatus
 * @typedef {{ status: KeyStatus; key?: ArrayBuffer; error?: string }} KeyCacheEntry
 * @typedef {Map<string, KeyCacheEntry>} KeyCacheMap
 */

/**
 * @typedef {object} DecryptionState
 * @property {KeyCacheMap} keyCache
 */

/**
 * @typedef {object} DecryptionActions
 * @property {(uri: string) => void} setKeyPending
 * @property {(uri: string, key: ArrayBuffer) => void} setKeyReady
 * @property {(uri: string, error: string) => void} setKeyError
 * @property {() => void} clearCache
 */

/**
 * A store dedicated to caching HLS decryption keys.
 * The key is the key URI, and the value is its status and data.
 * @type {import('zustand/vanilla').StoreApi<DecryptionState & DecryptionActions>}
 */
export const useDecryptionStore = createStore((set, get) => ({
    keyCache: new Map(),

    setKeyPending: (uri) => {
        set((state) => {
            const newCache = new Map(state.keyCache);
            newCache.set(uri, { status: 'pending' });
            return { keyCache: newCache };
        });
        eventBus.dispatch(EVENTS.DECRYPTION.KEY_STATUS_CHANGED, { uri });
    },

    setKeyReady: (uri, key) => {
        set((state) => {
            const newCache = new Map(state.keyCache);
            newCache.set(uri, { status: 'ready', key });
            return { keyCache: newCache };
        });
        eventBus.dispatch(EVENTS.DECRYPTION.KEY_STATUS_CHANGED, { uri });
    },

    setKeyError: (uri, error) => {
        set((state) => {
            const newCache = new Map(state.keyCache);
            newCache.set(uri, { status: 'error', error });
            return { keyCache: newCache };
        });
        eventBus.dispatch(EVENTS.DECRYPTION.KEY_STATUS_CHANGED, { uri });
    },

    clearCache: () => set({ keyCache: new Map() }),
}));

export const decryptionActions = useDecryptionStore.getState();
