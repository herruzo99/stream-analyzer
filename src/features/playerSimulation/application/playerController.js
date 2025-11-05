import { eventBus } from '@/application/event-bus';
import { playerActions, usePlayerStore } from '@/state/playerStore';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { playerService } from './playerService.js';
import { useUiStore } from '@/state/uiStore';

function onAdaptation({ oldTrack, newTrack }) {
    const time = new Date().toLocaleTimeString();
    let details = '';

    // If both are null, the event is malformed or irrelevant. Do nothing.
    if (!newTrack && !oldTrack) {
        return;
    }

    const newType = newTrack?.type;
    const oldType = oldTrack?.type;

    // Case 1: A video track adaptation (bitrate/resolution change).
    if (newType === 'variant') {
        const oldBw = (oldTrack?.bandwidth || 0) / 1000;
        const newBw = (newTrack.bandwidth || 0) / 1000;
        details = `Bitrate: ${oldBw.toFixed(0)}k → ${newBw.toFixed(0)}k`;
        if (newTrack.height) {
            details += ` | Resolution: ${oldTrack?.height || '?'}p → ${
                newTrack.height
            }p`;
        } else {
            details += ` | (Audio-only variant)`;
        }
        // Case 2: A text track was enabled, disabled, or changed.
    } else if (newType === 'text' || oldType === 'text') {
        details = `Text track changed: ${oldTrack?.language || 'Off'} → ${
            newTrack?.language || 'Off'
        }`;
        // Case 3: A generic adaptation to a new track where we don't have special formatting.
    } else if (newTrack) {
        details = `Selected ${newType} track (ID: ${newTrack.id})`;
        // Case 4: A track was deselected and no new one was chosen.
    } else if (oldTrack) {
        details = `Deselected ${oldTrack.type} track (ID: ${oldTrack.id})`;
    }

    playerActions.logEvent({ timestamp: time, type: 'adaptation', details });

    // Only log adaptation events with resolution changes to the stream state for the timeline visual.
    if (newTrack?.stream && newTrack.type === 'variant' && newTrack.height) {
        analysisActions.updateStream(newTrack.streamId, {
            adaptationEvents: [
                ...(newTrack.stream.adaptationEvents || []),
                {
                    time: newTrack.playheadTime,
                    oldWidth: oldTrack?.width,
                    oldHeight: oldTrack?.height,
                    newWidth: newTrack.width,
                    newHeight: newTrack.height,
                },
            ],
        });
    }
}

function onBuffering({ buffering }) {
    const time = new Date().toLocaleTimeString();
    const type = 'buffering';
    const details = buffering ? 'Buffering started...' : 'Buffering ended.';
    playerActions.logEvent({ timestamp: time, type, details });
}

function onPlayerError({ error }) {
    const time = new Date().toLocaleTimeString();
    const type = 'error';
    const details = `Error code ${error.code}: ${error.message}`;
    playerActions.logEvent({ timestamp: time, type, details });
}

function onPipChanged({ isInPiP }) {
    playerActions.setPictureInPicture(isInPiP);

    if (!isInPiP) {
        const { activeTab } = useUiStore.getState();
        if (activeTab !== 'player-simulation') {
            playerService.destroy();
        }
    }
}

export function initializePlayerController() {
    eventBus.subscribe('player:adaptation-internal', onAdaptation);
    eventBus.subscribe('player:buffering', onBuffering);
    eventBus.subscribe('player:error', onPlayerError);
    eventBus.subscribe('player:pip-changed', onPipChanged);
    eventBus.subscribe('player:loading', () => {
        playerActions.logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'lifecycle',
            details: 'Player is loading new content.',
        });
    });
    eventBus.subscribe('player:loaded', () => {
        playerActions.logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'lifecycle',
            details: 'Content loaded successfully.',
        });
    });
    eventBus.subscribe('player:streaming', (e) => {
        playerActions.logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'lifecycle',
            details: `Streaming has ${e.streaming ? 'begun' : 'ended'}.`,
        });
    });
    eventBus.subscribe('player:ratechange', ({ rate }) => {
        playerActions.logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'interaction',
            details: `Playback rate changed to ${rate}x.`,
        });
    });
    eventBus.subscribe('player:emsg', (emsg) => {
        playerActions.logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'metadata',
            details: `Received EMSG event. Scheme: ${emsg.schemeIdUri}, Timescale: ${emsg.timescale}.`,
        });
    });
    eventBus.subscribe('player:texttrackvisibility', () => {
        playerActions.logEvent({
            timestamp: new Date().toLocaleTimeString(),
            type: 'interaction',
            details: `Text track visibility changed.`,
        });
    });

    // --- Track Selection Event Listeners ---
    eventBus.subscribe('ui:player:set-abr-enabled', ({ streamId, enabled }) => {
        if (useUiStore.getState().activeTab !== 'player-simulation') return;
        const { activeStreamId } = useAnalysisStore.getState();
        if (streamId === activeStreamId) {
            playerService.setAbrEnabled(enabled);
            playerActions.setAbrEnabled(enabled);
        }
    });
    eventBus.subscribe(
        'ui:player:select-video-track',
        ({ streamId, track }) => {
            if (useUiStore.getState().activeTab !== 'player-simulation') return;
            const { activeStreamId } = useAnalysisStore.getState();
            if (streamId === activeStreamId) {
                playerService.selectVariantTrack(track);
                playerActions.setAbrEnabled(false);
            }
        }
    );
    eventBus.subscribe(
        'ui:player:select-audio-track',
        ({ streamId, language }) => {
            if (useUiStore.getState().activeTab !== 'player-simulation') return;
            const { activeStreamId } = useAnalysisStore.getState();
            if (streamId === activeStreamId) {
                playerService.selectAudioLanguage(language);
            }
        }
    );
    eventBus.subscribe(
        'ui:player:select-text-track',
        ({ streamId, track }) => {
            if (useUiStore.getState().activeTab !== 'player-simulation') return;
            const { activeStreamId } = useAnalysisStore.getState();
            if (streamId === activeStreamId) {
                playerService.selectTextTrack(track);
            }
        }
    );
    // --- End Track Selection ---

    // --- ARCHITECTURAL FIX: Add listeners for configuration presets ---
    eventBus.subscribe('ui:player:set-abr-strategy', ({ config }) => {
        if (useUiStore.getState().activeTab !== 'player-simulation') return;
        playerService.setAbrConfiguration(config);
    });

    eventBus.subscribe('ui:player:set-restrictions', ({ restrictions }) => {
        if (useUiStore.getState().activeTab !== 'player-simulation') return;
        playerService.setRestrictions(restrictions);
    });

    eventBus.subscribe('ui:player:set-buffering-strategy', ({ config }) => {
        if (useUiStore.getState().activeTab !== 'player-simulation') return;
        playerService.setBufferConfiguration(config);
    });
    // --- END FIX ---

    eventBus.subscribe('analysis:started', playerActions.reset);

    // --- ARCHITECTURAL FIX: Reset player state on stream context change ---
    useAnalysisStore.subscribe((state, prevState) => {
        if (
            state.activeStreamId !== null &&
            state.activeStreamId !== prevState.activeStreamId
        ) {
            const { isLoaded } = usePlayerStore.getState();
            if (isLoaded) {
                // If a stream was loaded, destroy the player and reset state
                // to ensure a clean slate for the new stream context.
                playerService.destroy();
                playerActions.reset();
            }
        }
    });
}