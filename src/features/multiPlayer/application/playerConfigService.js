import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { debugLog } from '@/shared/utils/debug';
import { showToast } from '@/ui/components/toast';

function setAbrEnabled(player, enabled) {
    if (!player) return;
    player.configure({ abr: { enabled } });
}

function selectTrack(player, type, selectionCriteria) {
    if (!player) return;

    if (type === 'variant') {
        const tracks = player.getVariantTracks();
        let trackToSelect;

        if (typeof selectionCriteria === 'object' && selectionCriteria !== null) {
            // Find by properties
            trackToSelect = tracks.find(
                (t) =>
                    t.bandwidth === selectionCriteria.bandwidth &&
                    t.height === selectionCriteria.height &&
                    t.width === selectionCriteria.width
            );
        } else {
            // Find by ID
            trackToSelect = tracks.find((t) => t.id === selectionCriteria);
        }

        if (trackToSelect) {
            player.configure({ abr: { enabled: false } });
            player.selectVariantTrack(trackToSelect, true);
        } else {
            debugLog(
                'PlayerConfigService.selectTrack',
                `Could not find matching variant track for criteria`,
                selectionCriteria
            );
        }
    } else if (type === 'audio') {
        const language = selectionCriteria;
        const audioTracks = player.getAudioLanguagesAndRoles();
        const trackToSelect =
            audioTracks.find((t) => t.label === language) ||
            audioTracks.find((t) => t.language === language);
        if (trackToSelect) {
            player.selectAudioLanguage(trackToSelect.language);
        }
    } else if (type === 'text') {
        const track = selectionCriteria;
        player.selectTextTrack(track);
    }
}

function applyStreamConfig(player, playerState) {
    const {
        globalAbrEnabled,
        globalMaxHeight,
        globalBufferingGoal,
        globalBandwidthCap,
    } = useMultiPlayerStore.getState();
    if (!playerState || !player) return;

    const abrEnabled =
        playerState.abrOverride !== null
            ? playerState.abrOverride
            : globalAbrEnabled;
    const maxHeight =
        playerState.maxHeightOverride !== null
            ? playerState.maxHeightOverride
            : globalMaxHeight;
    const bufferingGoal =
        playerState.bufferingGoalOverride !== null
            ? playerState.bufferingGoalOverride
            : globalBufferingGoal;

    player.configure({
        abr: { enabled: abrEnabled },
        restrictions: {
            maxHeight: maxHeight,
            maxBandwidth: globalBandwidthCap,
        },
        streaming: { bufferingGoal },
    });
}

function setGlobalTrackByHeight(player, height) {
    const tracks = player
        .getVariantTracks()
        .filter((t) => t.type === 'variant' && t.videoCodec);
    if (tracks.length === 0) return false;

    const bestTrack = tracks.reduce((best, current) => {
        if (!best) return current;
        const currentDiff = Math.abs((current.height || 0) - height);
        const bestDiff = Math.abs((best.height || 0) - height);

        if (currentDiff < bestDiff) {
            return current;
        }
        if (currentDiff === bestDiff) {
            return (current.bandwidth || 0) > (best.bandwidth || 0)
                ? current
                : best;
        }
        return best;
    });

    if (bestTrack) {
        player.configure({ abr: { enabled: false } });
        player.selectVariantTrack(bestTrack, true);
        return true;
    }
    return false;
}

export const playerConfigService = {
    setAbrEnabled,
    selectTrack,
    applyStreamConfig,
    setGlobalTrackByHeight,
};