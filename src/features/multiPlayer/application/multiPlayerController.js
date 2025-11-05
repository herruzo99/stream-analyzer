import { eventBus } from '@/application/event-bus';
import { multiPlayerService } from './multiPlayerService.js';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useAnalysisStore } from '@/state/analysisStore.js';

export function initializeMultiPlayerController() {
    eventBus.subscribe('ui:multi-player:play-all', () =>
        multiPlayerService.playAll()
    );
    eventBus.subscribe('ui:multi-player:pause-all', () =>
        multiPlayerService.pauseAll()
    );
    eventBus.subscribe('ui:multi-player:mute-all', () => {
        useMultiPlayerStore.getState().setMuteAll(true);
        multiPlayerService.muteAll();
    });
    eventBus.subscribe('ui:multi-player:unmute-all', () => {
        useMultiPlayerStore.getState().setMuteAll(false);
        multiPlayerService.unmuteAll();
    });
    eventBus.subscribe('ui:multi-player:sync-toggled', () =>
        useMultiPlayerStore.getState().toggleSync()
    );
    eventBus.subscribe(
        'ui:multi-player:set-card-tab',
        ({ streamId, tab }) => {
            useMultiPlayerStore.getState().setPlayerCardTab(streamId, tab);
        }
    );
    eventBus.subscribe('ui:multi-player:sync-all-to', ({ streamId }) =>
        multiPlayerService.syncAllTo(streamId)
    );
    eventBus.subscribe('ui:multi-player:reset-all', () =>
        multiPlayerService.resetAllPlayers()
    );
    eventBus.subscribe('ui:multi-player:clear-all', () =>
        multiPlayerService.clearAndResetPlayers()
    );

    // Global Control Listeners
    eventBus.subscribe('ui:multi-player:set-global-abr', ({ enabled }) => {
        useMultiPlayerStore.getState().setGlobalAbrEnabled(enabled);
        multiPlayerService.setGlobalAbr(enabled);
    });
    eventBus.subscribe(
        'ui:multi-player:set-global-bandwidth-cap',
        ({ bps }) => {
            useMultiPlayerStore.getState().setGlobalBandwidthCap(bps);
            multiPlayerService.setGlobalBandwidthCap(bps);
        }
    );
    eventBus.subscribe(
        'ui:multi-player:set-global-max-height',
        ({ height }) => {
            useMultiPlayerStore.getState().setGlobalMaxHeight(height);
            multiPlayerService.setGlobalMaxHeight(height);
        }
    );
    // --- NEW: Listener for global track selection ---
    eventBus.subscribe(
        'ui:multi-player:set-global-video-track-by-height',
        ({ height }) => {
            multiPlayerService.setGlobalTrackByHeight(height);
        }
    );
    // --- END NEW ---

    // --- REFACTORED TRACK SELECTION HANDLERS FOR MULTIPLAYER CONTEXT ---
    eventBus.subscribe('ui:player:select-video-track', ({ streamId, track }) => {
        const { players } = useMultiPlayerStore.getState();
        // This event is now generic, ensure it's for a player in this view
        if (players.has(streamId)) {
            multiPlayerService.selectTrack(streamId, 'variant', track);
            useMultiPlayerStore
                .getState()
                .setStreamOverride(streamId, { abr: false });
        }
    });
    eventBus.subscribe(
        'ui:player:select-audio-track',
        ({ streamId, language }) => {
            const { players } = useMultiPlayerStore.getState();
            if (players.has(streamId)) {
                multiPlayerService.selectTrack(streamId, 'audio', language);
            }
        }
    );
    eventBus.subscribe('ui:player:set-abr-enabled', ({ streamId, enabled }) => {
        const { players } = useMultiPlayerStore.getState();
        if (players.has(streamId)) {
            multiPlayerService.setAbrEnabled(streamId, enabled);
            useMultiPlayerStore
                .getState()
                .setStreamOverride(streamId, { abr: enabled });
        }
    });
    // --- END REFACTOR ---

    // Per-stream and Group Action Listeners
    eventBus.subscribe('ui:multi-player:toggle-selection', ({ streamId }) => {
        useMultiPlayerStore.getState().toggleStreamSelection(streamId);
    });
    eventBus.subscribe('ui:multi-player:select-all', () => {
        useMultiPlayerStore.getState().selectAllStreams();
    });
    eventBus.subscribe('ui:multi-player:deselect-all', () => {
        useMultiPlayerStore.getState().deselectAllStreams();
    });
    eventBus.subscribe(
        'ui:multi-player:set-stream-override',
        ({ streamId, override }) => {
            useMultiPlayerStore
                .getState()
                .setStreamOverride(streamId, override);
            multiPlayerService.applyStreamConfig(streamId);
        }
    );
    eventBus.subscribe('ui:multi-player:duplicate-stream', ({ streamId }) => {
        multiPlayerService.duplicateStream(streamId);
    });
    eventBus.subscribe('ui:multi-player:apply-to-selected', ({ action }) => {
        multiPlayerService.applyActionToSelected(action);
    });
    // --- STATE MANAGEMENT REFACTOR ---
    // The UI event now dispatches a state change directly to the store.
    // The component's unmount will trigger the service to clean up resources.
    eventBus.subscribe('ui:multi-player:remove-stream', ({ streamId }) => {
        useMultiPlayerStore.getState().removePlayer(streamId);
    });
}