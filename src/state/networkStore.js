import { createStore } from 'zustand/vanilla';
import { useSettingsStore } from './settingsStore.js';

/** @typedef {import('@/types').NetworkEvent} NetworkEvent */

const createInitialNetworkState = () => ({
    events: [],
    selectedEventId: null,
    filters: {
        type: 'all',
        search: '',
    },
    visibleStreamIds: new Set(),
});

export const useNetworkStore = createStore((set, get) => ({
    ...createInitialNetworkState(),

    logEvent: (event) => {
        // Ensure segmentDuration is preserved as a number
        if (event.segmentDuration) {
            event.segmentDuration = Number(event.segmentDuration);
        }

        set((state) => {
            // DYNAMIC LIMIT: Fetch from settings store
            const limit = useSettingsStore.getState().networkLogLimit || 500;
            const currentLength = state.events.length;
            let newEvents;

            if (currentLength < limit) {
                newEvents = [...state.events, event];
            } else {
                // FIFO: Keep limit-1, add new
                newEvents = [...state.events.slice(-(limit - 1)), event];
            }

            return { events: newEvents };
        });
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
