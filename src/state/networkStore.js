import { createStore } from 'zustand/vanilla';

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
 * @property {(eventId: string | null) => void} setSelectedEventId
 * @property {() => void} clearEvents
 * @property {(newFilters: Partial<{type: ResourceFilterType}>) => void} setFilters
 */

/**
 * A store for logging and managing network requests.
 * @type {import('zustand/vanilla').StoreApi<NetworkState & NetworkActions>}
 */
export const useNetworkStore = createStore((set, get) => ({
    events: [],
    selectedEventId: null,
    filters: {
        type: 'all',
    },

    logEvent: (event) => {
        set((state) => ({ events: [...state.events, event] }));
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
}));

export const networkActions = useNetworkStore.getState();
