import { appLog } from '@/shared/utils/debug';
import { createStore } from 'zustand/vanilla';

/** @typedef {import('@/types').NetworkEvent} NetworkEvent */
/** @typedef {import('@/types').ResourceType | 'all'} ResourceFilterType */

/**
 * @typedef {object} NetworkState
 * @property {NetworkEvent[]} events
 * @property {string | null} selectedEventId
 * @property {{type: ResourceFilterType, search: string}} filters
 * @property {Set<number>} visibleStreamIds
 */

/**
 * @typedef {object} NetworkActions
 * @property {(event: NetworkEvent) => void} logEvent
 * @property {(updatedEvent: NetworkEvent) => void} updateEvent
 * @property {(eventId: string | null) => void} setSelectedEventId
 * @property {() => void} clearEvents
 * @property {(newFilters: Partial<{type: ResourceFilterType, search: string}>) => void} setFilters
 * @property {(streamIds: number[]) => void} setVisibleStreamIds
 * @property {(streamId: number) => void} toggleVisibleStreamId
 * @property {() => void} reset
 * @property {() => NetworkState} get
 */

/** @returns {NetworkState} */
const createInitialNetworkState = () => ({
    events: [],
    selectedEventId: null,
    filters: {
        type: 'all',
        search: '',
    },
    visibleStreamIds: new Set(),
});

/**
 * A store for logging and managing network requests.
 * @type {import('zustand/vanilla').StoreApi<NetworkState & NetworkActions>}
 */
export const useNetworkStore = createStore((set, get) => ({
    ...createInitialNetworkState(),

    logEvent: (event) => {
        appLog(
            'NetworkStore',
            'info',
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

    setVisibleStreamIds: (streamIds) => {
        set({ visibleStreamIds: new Set(streamIds) });
    },

    toggleVisibleStreamId: (streamId) => {
        set((state) => {
            const newSet = new Set(state.visibleStreamIds);
            if (newSet.has(streamId)) {
                newSet.delete(streamId);
            } else {
                newSet.add(streamId);
            }
            return { visibleStreamIds: newSet };
        });
    },

    reset: () => set(createInitialNetworkState()),

    get: get,
}));

export const networkActions = useNetworkStore.getState();
