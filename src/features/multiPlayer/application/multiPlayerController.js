import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { EVENTS } from '@/types/events';
import { multiPlayerService } from './multiPlayerService.js';

export function initializeMultiPlayerController() {
    eventBus.subscribe(EVENTS.UI.MP_PLAY_ALL, () =>
        multiPlayerService.playAll()
    );
    eventBus.subscribe(EVENTS.UI.MP_PAUSE_ALL, () =>
        multiPlayerService.pauseAll()
    );

    eventBus.subscribe(EVENTS.UI.MP_MUTE_ALL, () => {
        useMultiPlayerStore.getState().setMuteAll(true);
        multiPlayerService.muteAll();
    });

    eventBus.subscribe(EVENTS.UI.MP_UNMUTE_ALL, () => {
        useMultiPlayerStore.getState().setMuteAll(false);
        multiPlayerService.unmuteAll();
    });

    eventBus.subscribe(EVENTS.UI.MP_SYNC_ALL_TO, ({ streamId }) =>
        multiPlayerService.syncAllTo(streamId)
    );
    eventBus.subscribe(EVENTS.UI.MP_RESET_ALL, () =>
        multiPlayerService.resetAllPlayers()
    );
    eventBus.subscribe(EVENTS.UI.MP_CLEAR_ALL, () =>
        multiPlayerService.clearAndResetPlayers()
    );
    eventBus.subscribe(EVENTS.UI.MP_RESET_FAILED, () =>
        multiPlayerService.resetFailedPlayers()
    );
    eventBus.subscribe(EVENTS.UI.MP_RESET_SINGLE, ({ streamId }) =>
        multiPlayerService.resetSinglePlayer(streamId)
    );
    eventBus.subscribe(EVENTS.UI.MP_TOGGLE_AUTO_RESET, () =>
        useMultiPlayerStore.getState().toggleAutoReset()
    );

    // Layout & HUD
    eventBus.subscribe('ui:multi-player:set-layout', ({ mode }) =>
        useMultiPlayerStore.getState().setLayoutMode(mode)
    );
    eventBus.subscribe('ui:multi-player:set-grid-columns', ({ columns }) =>
        useMultiPlayerStore.getState().setGridColumns(columns)
    );
    eventBus.subscribe('ui:multi-player:set-focus', ({ streamId }) =>
        useMultiPlayerStore.getState().setFocusedStreamId(streamId)
    );
    eventBus.subscribe('ui:multi-player:toggle-global-hud', () =>
        useMultiPlayerStore.getState().toggleGlobalHud()
    );
    eventBus.subscribe('ui:multi-player:toggle-player-hud', ({ streamId }) =>
        useMultiPlayerStore.getState().togglePlayerHud(streamId)
    );

    // Global Control Listeners
    eventBus.subscribe(EVENTS.UI.MP_SET_GLOBAL_ABR, ({ enabled }) => {
        useMultiPlayerStore.getState().setGlobalAbrEnabled(enabled);
        multiPlayerService.setGlobalAbr(enabled);
    });
    eventBus.subscribe(EVENTS.UI.MP_SET_GLOBAL_BW_CAP, ({ bps }) => {
        useMultiPlayerStore.getState().setGlobalBandwidthCap(bps);
        multiPlayerService.setGlobalBandwidthCap(bps);
    });
    eventBus.subscribe(EVENTS.UI.MP_SET_GLOBAL_MAX_HEIGHT, ({ height }) => {
        useMultiPlayerStore.getState().setGlobalMaxHeight(height);
        multiPlayerService.setGlobalMaxHeight(height);
    });
    eventBus.subscribe(
        EVENTS.UI.MP_SET_GLOBAL_TRACK_BY_HEIGHT,
        ({ height }) => {
            multiPlayerService.setGlobalTrackByHeight(height);
        }
    );

    // Per-stream Actions
    eventBus.subscribe(
        EVENTS.UI.PLAYER_SELECT_VIDEO_TRACK,
        ({ streamId, track }) => {
            const { players } = useMultiPlayerStore.getState();
            if (players.has(streamId)) {
                multiPlayerService.selectTrack(streamId, 'variant', track);
                useMultiPlayerStore
                    .getState()
                    .setStreamOverride(streamId, { abr: false });
            }
        }
    );
    eventBus.subscribe(
        EVENTS.UI.PLAYER_SELECT_AUDIO_TRACK,
        ({ streamId, language }) => {
            const { players } = useMultiPlayerStore.getState();
            if (players.has(streamId)) {
                multiPlayerService.selectTrack(streamId, 'audio', language);
            }
        }
    );
    eventBus.subscribe(
        EVENTS.UI.PLAYER_SET_ABR_ENABLED,
        ({ streamId, enabled }) => {
            const { players } = useMultiPlayerStore.getState();
            if (players.has(streamId)) {
                multiPlayerService.setAbrEnabled(streamId, enabled);
                useMultiPlayerStore
                    .getState()
                    .setStreamOverride(streamId, { abr: enabled });
            }
        }
    );

    eventBus.subscribe(EVENTS.UI.MP_TOGGLE_SELECTION, ({ streamId }) => {
        useMultiPlayerStore.getState().toggleStreamSelection(streamId);
    });
    eventBus.subscribe(EVENTS.UI.MP_SELECT_ALL, () =>
        useMultiPlayerStore.getState().selectAllStreams()
    );
    eventBus.subscribe(EVENTS.UI.MP_DESELECT_ALL, () =>
        useMultiPlayerStore.getState().deselectAllStreams()
    );
    eventBus.subscribe(
        EVENTS.UI.MP_SET_STREAM_OVERRIDE,
        ({ streamId, override }) => {
            useMultiPlayerStore
                .getState()
                .setStreamOverride(streamId, override);
            multiPlayerService.applyStreamConfig(streamId);
        }
    );
    eventBus.subscribe(EVENTS.UI.MP_DUPLICATE_STREAM, ({ streamId }) =>
        multiPlayerService.duplicateStream(streamId)
    );
    eventBus.subscribe(EVENTS.UI.MP_APPLY_TO_SELECTED, ({ action }) =>
        multiPlayerService.applyActionToSelected(action)
    );
    eventBus.subscribe(EVENTS.UI.MP_REMOVE_STREAM, ({ streamId }) =>
        useMultiPlayerStore.getState().removePlayer(streamId)
    );
}
