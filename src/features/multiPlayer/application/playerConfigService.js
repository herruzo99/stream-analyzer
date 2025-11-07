import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { debugLog } from '@/shared/utils/debug';
import { showToast } from '@/ui/components/toast';
import { schemeIdUriToKeySystem } from '@/infrastructure/parsing/utils/drm';

async function fetchCertificate(url) {
    try {
        if (!url) return null;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.arrayBuffer();
    } catch (e) {
        console.error('Failed to fetch DRM service certificate:', e);
        throw e;
    }
}

async function buildDrmConfig(streamDef) {
    const security = streamDef.manifest?.summary?.security;
    const drmConfig = { servers: {}, advanced: {}, clearKeys: {} };

    if (!security?.isEncrypted) {
        return drmConfig;
    }

    const licenseRequestHeaders = {};
    (streamDef.drmAuth?.headers || []).forEach((h) => {
        if (h.key) licenseRequestHeaders[h.key] = h.value;
    });

    let cert;
    if (
        streamDef.drmAuth?.serverCertificate &&
        typeof streamDef.drmAuth.serverCertificate === 'string'
    ) {
        cert = await fetchCertificate(streamDef.drmAuth.serverCertificate);
    } else if (streamDef.drmAuth?.serverCertificate) {
        cert = streamDef.drmAuth.serverCertificate;
    }

    for (const system of security.systems) {
        const keySystem = schemeIdUriToKeySystem[system.systemId.toLowerCase()];
        if (keySystem) {
            const licenseServerUrl =
                typeof streamDef.drmAuth.licenseServerUrl === 'object'
                    ? streamDef.drmAuth.licenseServerUrl[keySystem]
                    : typeof streamDef.drmAuth.licenseServerUrl === 'string'
                      ? streamDef.drmAuth.licenseServerUrl
                      : null;

            const finalUrl =
                licenseServerUrl || system.pssh?.licenseServerUrl || '';

            if (finalUrl) {
                drmConfig.servers[keySystem] = finalUrl;
                drmConfig.advanced[keySystem] = {
                    serverCertificate: cert ? new Uint8Array(cert) : undefined,
                    headers: licenseRequestHeaders,
                };
            }
        }
    }
    return drmConfig;
}

function setAbrEnabled(player, enabled) {
    if (!player) return;
    player.configure({ abr: { enabled } });
}

function selectTrack(player, type, selectionCriteria) {
    if (!player) return;

    if (type === 'variant') {
        const tracks = player.getVariantTracks();
        let trackToSelect;

        if (
            typeof selectionCriteria === 'object' &&
            selectionCriteria !== null
        ) {
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
        player.setTextTrackVisibility(!!track);
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
    buildDrmConfig,
    setAbrEnabled,
    selectTrack,
    applyStreamConfig,
    setGlobalTrackByHeight,
};
