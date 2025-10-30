import { eventBus } from '@/application/event-bus';
import { multiPlayerService } from './multiPlayerService.js';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';

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
    eventBus.subscribe('ui:multi-player:expand-all-toggled', () =>
        useMultiPlayerStore.getState().toggleExpandAll()
    );
    eventBus.subscribe('ui:multi-player:seek-all', ({ time }) =>
        multiPlayerService.seekAll(time)
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
        'ui:multi-player:set-global-max-height',
        ({ height }) => {
            useMultiPlayerStore.getState().setGlobalMaxHeight(height);
            multiPlayerService.setGlobalRestrictions({ maxHeight: height });
        }
    );
    eventBus.subscribe('ui:multi-player:set-global-buffer-goal', ({ goal }) => {
        useMultiPlayerStore.getState().setGlobalBufferingGoal(goal);
        multiPlayerService.setGlobalBufferingGoal(goal);
    });
    eventBus.subscribe(
        'ui:multi-player:set-global-bandwidth-cap',
        ({ bps }) => {
            useMultiPlayerStore.getState().setGlobalBandwidthCap(bps);
            multiPlayerService.setGlobalBandwidthCap(bps);
        }
    );
    eventBus.subscribe('ui:multi-player:set-global-audio-track', ({ lang }) => {
        multiPlayerService.setGlobalAudioTrack(lang);
    });
    eventBus.subscribe('ui:multi-player:set-active-layout', ({ layout }) => {
        useMultiPlayerStore.getState().setActiveLayout(layout);
    });
    eventBus.subscribe(
        'ui:multi-player:select-video-track',
        ({ streamId, trackId }) => {
            multiPlayerService.selectTrack(streamId, 'variant', trackId);
        }
    );
    eventBus.subscribe(
        'ui:multi-player:select-audio-track',
        ({ streamId, language }) => {
            multiPlayerService.selectTrack(streamId, 'audio', language);
        }
    );

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
    eventBus.subscribe('ui:multi-player:remove-stream', ({ streamId }) => {
        multiPlayerService.removePlayer(streamId);
    });
}
