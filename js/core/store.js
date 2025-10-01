import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { analysisState } from './state.js';
import { eventBus } from './event-bus.js';

/**
 * =================================================================================
 * The Centralized State Store for the Application
 *
 * This module establishes the single source of truth for the application state,
 * leveraging the 'zustand' library. It is designed to replace the legacy, mutable
 * global `analysisState` object.
 *
 * The migration follows the Strangler Fig Pattern:
 * 1. The store is created.
 * 2. State domains are incrementally moved from the old `analysisState` into this store.
 * 3. Components are refactored to read from and write to this store via selectors and actions.
 * 4. Once the migration is complete, the old state object will be decommissioned.
 *
 * All state modifications MUST be performed through actions defined within this store.
 * =================================================================================
 */

export const useStore = create(
  devtools(
    (set, get) => ({
      // --------------------------------------------------------------------------
      // State Properties
      //
      // This section will hold the new, centralized state. As we migrate,
      // properties from the legacy `analysisState` will be moved here.
      // --------------------------------------------------------------------------

      /**
       * @private
       * A reference to the legacy state object. This is a temporary measure
       * to facilitate the Strangler Fig Pattern migration. Access to this
       * should ONLY occur via selectors.
       * DO NOT ACCESS THIS PROPERTY DIRECTLY FROM COMPONENTS.
       */
      _legacyState: analysisState,


      // --------------------------------------------------------------------------
      // Actions
      //
      // Actions are functions that encapsulate state mutations. They are the
      // ONLY valid way to modify the store.
      // --------------------------------------------------------------------------
      actions: {
        /**
         * Sets the active stream ID. During migration, this action mutates
         * the legacy state object directly and dispatches an event to ensure
         * the rest of the application remains consistent.
         * @param {number} streamId
         */
        setActiveStreamId: (streamId) => {
          get()._legacyState.activeStreamId = streamId;
          // Dispatching an event to notify other parts of the system.
          // This replicates the old behavior and ensures components react.
          eventBus.dispatch('state:update', get()._legacyState);
        },

        /**
         * Handles the completion of a stream analysis, setting the primary
         * state of the application. This action replaces the legacy
         * `setInitialState` function from `state-manager.js`.
         * @param {object} payload - The result of the analysis.
         */
        setAnalysisComplete: (payload) => {
          const state = get()._legacyState;

          // Mutate the legacy state object directly for now.
          state.streams = payload.streams;
          state.activeStreamId = payload.activeStreamId;
          state.isLive = payload.isLive;
          state.isLoading = false;

          // Dispatch the original event to ensure other modules continue to function.
          eventBus.dispatch('state:analysis-complete', { streams: payload.streams });
        },
      },

      // --------------------------------------------------------------------------
      // Selectors
      //
      // Selectors are functions that derive data from the state. They provide a
      // stable API for components to read data, abstracting the underlying state
      // structure. During the migration, some selectors may temporarily read
      // from the legacy state object.
      // --------------------------------------------------------------------------

      /**
       * Provides access to the legacy state object during the migration period.
       * @returns {object} The legacy analysisState object.
       */
      getLegacyState: () => get()._legacyState,

      /**
       * Selector for the streams array.
       * @returns {Array<object>}
       */
      getStreams: () => get()._legacyState.streams,

       /**
       * Selector for the active stream ID.
       * @returns {number}
       */
      getActiveStreamId: () => get()._legacyState.activeStreamId,
    }),
    {
      name: 'HLS-DASH-TOOL-STORE',
    }
  )
);

// To simplify access to actions from outside React components
export const storeActions = useStore.getState().actions;