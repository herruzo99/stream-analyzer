import { eventBus } from '@/application/event-bus';
import { EVENTS } from '@/types/events';
import { createStore } from 'zustand/vanilla';

/**
 * @typedef {object} KeyStatus
 * @property {string} kid - Hex-encoded Key ID.
 * @property {string} status - 'usable', 'expired', 'output-restricted', etc.
 * @property {string} system - The key system (e.g., 'com.widevine.alpha').
 */

/**
 * @typedef {object} EmeSession
 * @property {string} id - The Session ID (or temporary ID).
 * @property {string} keySystem - The Key System in use.
 * @property {'temporary' | 'persistent-license'} type - Session type.
 * @property {number} startTime - Timestamp of creation.
 * @property {KeyStatus[]} keyStatuses - Current map of keys.
 * @property {any[]} events - Chronological list of API calls and events for this session.
 */

const createInitialState = () => ({
    // HLS Legacy Cache (Url -> Key ArrayBuffer)
    keyCache: new Map(),

    // New EME Architecture
    accessRequests: [], // Global log of navigator.requestMediaKeySystemAccess
    sessions: new Map(), // Map<InternalId, EmeSession>
    selectedSessionId: null, // InternalId of currently viewed session
});

export const useDecryptionStore = createStore((set, get) => ({
    ...createInitialState(),

    // --- EME Access Logs ---
    logAccessRequest: (req) => {
        set((state) => ({
            accessRequests: [
                { ...req, timestamp: Date.now() },
                ...state.accessRequests,
            ].slice(0, 50),
        }));
    },

    // --- Session Management ---
    registerSession: (internalId, data) => {
        set((state) => {
            const newSessions = new Map(state.sessions);
            newSessions.set(internalId, {
                internalId, // Store internal ID for reference
                id: 'Pending...',
                keySystem: 'Unknown',
                type: 'temporary',
                startTime: Date.now(),
                keyStatuses: [],
                events: [],
                ...data,
            });

            // Auto-select if it's the first session and none is selected
            const selectedSessionId = state.selectedSessionId || internalId;

            return { sessions: newSessions, selectedSessionId };
        });
    },

    updateSession: (internalId, updates) => {
        set((state) => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(internalId);
            if (session) {
                newSessions.set(internalId, { ...session, ...updates });
            }
            return { sessions: newSessions };
        });
    },

    logSessionEvent: (internalId, event) => {
        set((state) => {
            const newSessions = new Map(state.sessions);
            const session = newSessions.get(internalId);
            if (session) {
                const updatedEvents = [
                    ...session.events,
                    {
                        ...event,
                        timestamp: Date.now(),
                        id: crypto.randomUUID(),
                    },
                ];
                newSessions.set(internalId, {
                    ...session,
                    events: updatedEvents,
                });
            }
            return { sessions: newSessions };
        });
    },

    setSelectedSessionId: (id) => set({ selectedSessionId: id }),

    // --- HLS Legacy Actions (Maintains compatibility with keyManagerService) ---
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

    clearCache: () => set(createInitialState()),
}));

export const decryptionActions = useDecryptionStore.getState();
