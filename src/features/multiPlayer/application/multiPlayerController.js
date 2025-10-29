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
        useMultiPlayerStore.getState().toggleMuteAll();
        multiPlayerService.muteAll();
    });
    eventBus.subscribe('ui:multi-player:unmute-all', () => {
        useMultiPlayerStore.getState().toggleMuteAll();
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

    // New Global Control Listeners
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
}
