import { createStore } from 'zustand/vanilla';
import { useSettingsStore } from './settingsStore.js';

/** @typedef {import('@/types').NetworkEvent} NetworkEvent */

/**
 * @typedef {Object} InterventionRule
 * @property {string} id - UUID
 * @property {string} label - User defined name
 * @property {boolean} enabled - Is rule active
 * @property {string} urlPattern - Regex string or simple string
 * @property {'all' | 'manifest' | 'video' | 'audio' | 'license'} resourceType
 * @property {'block' | 'delay'} action
 * @property {{statusCode?: number, delayMs?: number, probability?: number}} params
 */

const createInitialNetworkState = () => ({
    events: [],
    selectedEventId: null,
    filters: {
        type: 'all',
        search: '',
    },
    visibleStreamIds: new Set(),
    interventionRules: [], // List of active/inactive rules
});

export const useNetworkStore = createStore((set, get) => ({
    ...createInitialNetworkState(),

    logEvent: (event) => {
        // Ensure segmentDuration is preserved as a number
        if (event.segmentDuration) {
            event.segmentDuration = Number(event.segmentDuration);
        }

        set((state) => {
            const limit = useSettingsStore.getState().networkLogLimit || 500;
            const currentLength = state.events.length;
            let newEvents;

            if (currentLength < limit) {
                newEvents = [...state.events, event];
            } else {
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

    // --- Intervention Actions ---

    addInterventionRule: (rule) => {
        set((state) => ({
            interventionRules: [...state.interventionRules, rule],
        }));
    },

    updateInterventionRule: (id, updates) => {
        set((state) => ({
            interventionRules: state.interventionRules.map((r) =>
                r.id === id ? { ...r, ...updates } : r
            ),
        }));
    },

    removeInterventionRule: (id) => {
        set((state) => ({
            interventionRules: state.interventionRules.filter(
                (r) => r.id !== id
            ),
        }));
    },

    toggleInterventionRule: (id) => {
        set((state) => ({
            interventionRules: state.interventionRules.map((r) =>
                r.id === id ? { ...r, enabled: !r.enabled } : r
            ),
        }));
    },

    reset: () => set(createInitialNetworkState()),
    get: get,
}));

export const networkActions = useNetworkStore.getState();
