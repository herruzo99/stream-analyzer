import { createStore } from 'zustand/vanilla';
import { debugLog } from '@/shared/utils/debug';

/** @typedef {import('@/types').NetworkEvent} NetworkEvent */
/** @typedef {import('@/types').ResourceType | 'all'} ResourceFilterType */

/**
 * @typedef {object} NetworkState
 * @property {NetworkEvent[]} events
 * @property {string | null} selectedEventId
 * @property {{type: ResourceFilterType}} filters
 */

/**
 * @typedef {object} NetworkActions
 * @property {(event: NetworkEvent) => void} logEvent
 * @property {(updatedEvent: NetworkEvent) => void} updateEvent
 * @property {(eventId: string | null) => void} setSelectedEventId
 * @property {() => void} clearEvents
 * @property {(newFilters: Partial<{type: ResourceFilterType}>) => void} setFilters
 * @property {() => void} reset
 * @property {() => NetworkState} get
 */

/** @returns {NetworkState} */
const createInitialNetworkState = () => ({
    events: [],
    selectedEventId: null,
    filters: {
        type: 'all',
    },
});

/**
 * A store for logging and managing network requests.
 * @type {import('zustand/vanilla').StoreApi<NetworkState & NetworkActions>}
 */
export const useNetworkStore = createStore((set, get) => ({
    ...createInitialNetworkState(),

    logEvent: (event) => {
        debugLog(
            'NetworkStore',
            'logEvent action called. Adding event to state.',
            event
        );
        set((state) => ({ events: [...state.events, event] }));
    },

    updateEvent: (updatedEvent) => {
        set((state) => ({
            events: state.events.map((e) =>
                e.id === updatedEvent.id ? updatedEvent : e
            ),
        }));
    },

    setSelectedEventId: (eventId) => {
        set({ selectedEventId: eventId });
    },

    clearEvents: () => {
        set({ events: [], selectedEventId: null });
    },

    setFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
        }));
    },

    reset: () => set(createInitialNetworkState()),

    get: get,
}));

// --- BUG FIX: Expose all necessary actions on the exported object ---
export const networkActions = {
    logEvent: (event) => useNetworkStore.getState().logEvent(event),
    updateEvent: (updatedEvent) =>
        useNetworkStore.getState().updateEvent(updatedEvent),
    setSelectedEventId: (eventId) =>
        useNetworkStore.getState().setSelectedEventId(eventId),
    clearEvents: () => useNetworkStore.getState().clearEvents(),
    setFilters: (newFilters) =>
        useNetworkStore.getState().setFilters(newFilters),
    reset: () => useNetworkStore.getState().reset(),
    get: () => useNetworkStore.getState().get(),
};