import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { appLog } from '@/shared/utils/debug';
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

                // --- NEW CERTIFICATE LOGIC ---
                let certSource = null;
                if (
                    typeof streamDef.drmAuth.serverCertificate === 'object' &&
                    streamDef.drmAuth.serverCertificate !== null
                ) {
                    certSource = streamDef.drmAuth.serverCertificate[keySystem];
                } else {
                    // Fallback to single certificate for backward compatibility
                    certSource = streamDef.drmAuth.serverCertificate;
                }

                let certBuffer = null;
                if (typeof certSource === 'string') {
                    certBuffer = await fetchCertificate(certSource);
                } else if (certSource instanceof ArrayBuffer) {
                    certBuffer = certSource;
                } else if (certSource instanceof File) {
                    certBuffer = await certSource.arrayBuffer();
                }
                // --- END NEW LOGIC ---

                drmConfig.advanced[keySystem] = {
                    serverCertificate: certBuffer
                        ? new Uint8Array(certBuffer)
                        : undefined,
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
            // Find by properties, which is necessary when the object doesn't have Shaka's internal properties
            trackToSelect = tracks.find(
                (t) =>
                    t.bandwidth === selectionCriteria.bandwidth &&
                    t.height === selectionCriteria.height &&
                    t.width === selectionCriteria.width
            );
        } else {
            // Find by ID for direct Shaka track objects
            trackToSelect = tracks.find((t) => t.id === selectionCriteria);
        }

        if (trackToSelect) {
            player.configure({ abr: { enabled: false } });
            player.selectVariantTrack(trackToSelect, true);
        } else {
            appLog(
                'PlayerConfigService.selectTrack',
                'warn',
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
        // --- ARCHITECTURAL FIX: Use correct Shaka API to disable text tracks ---
        if (!track) {
            player.setTextTrackVisibility(false);
        } else {
            let trackToSelect = track;
            // Handle cases where a simplified track object is passed
            if (typeof track.id !== 'number') {
                const shakaTracks = player.getTextTracks();
                trackToSelect = shakaTracks.find(
                    (t) =>
                        t.language === track.language && t.kind === track.kind
                );
            }

            if (trackToSelect) {
                player.selectTextTrack(trackToSelect);
                player.setTextTrackVisibility(true); // Explicitly enable visibility
            } else {
                appLog(
                    'PlayerConfigService.selectTrack',
                    'warn',
                    `Could not find matching text track for criteria`,
                    track
                );
            }
        }
        // --- END FIX ---
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
