import { schemeIdUriToKeySystem } from '@/infrastructure/parsing/utils/drm';
import { appLog } from '@/shared/utils/debug';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';

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

                let certSource = null;
                if (
                    typeof streamDef.drmAuth.serverCertificate === 'object' &&
                    streamDef.drmAuth.serverCertificate !== null
                ) {
                    certSource = streamDef.drmAuth.serverCertificate[keySystem];
                } else {
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

                drmConfig.advanced[keySystem] = {
                    serverCertificate: certBuffer
                        ? new Uint8Array(certBuffer)
                        : undefined,
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

function setRestrictions(player, restrictions) {
    if (!player) return;
    player.configure({ restrictions });
}

function setBufferConfiguration(player, config) {
    if (!player) return;
    player.configure({
        streaming: {
            rebufferingGoal: config.rebufferingGoal,
            bufferingGoal: config.bufferingGoal,
            bufferBehind: config.bufferBehind,
            ignoreTextStreamFailures: config.ignoreTextStreamFailures,
        },
    });
}

function setLatencyConfiguration(player, config) {
    if (!player) return;

    const {
        enabled,
        targetLatency,
        targetLatencyTolerance,
        minPlaybackRate,
        maxPlaybackRate,
        panicMode,
        panicThreshold,
        rebufferingGoal,
    } = config;

    // We adjust bufferBehind to ensure we don't aggressively evict data we might need if latency drifts
    const bufferBehind = targetLatency + 10;

    const newConfig = {
        streaming: {
            rebufferingGoal,
            bufferBehind,
            liveSync: {
                enabled,
                targetLatency,
                targetLatencyTolerance,
                minPlaybackRate,
                maxPlaybackRate,
                panicMode,
                panicThreshold,
                // Removed maxLatency as it is not a valid Shaka 4.x configuration key for liveSync
            },
        },
    };

    appLog(
        'playerConfigService',
        'info',
        'Applying new liveSync configuration:',
        newConfig
    );

    player.configure(newConfig);
}

function setAbrConfiguration(player, config) {
    if (!player) return;
    player.configure({
        abr: {
            bandwidthUpgradeTarget: config.bandwidthUpgradeTarget,
            bandwidthDowngradeTarget: config.bandwidthDowngradeTarget,
        },
    });
}

function selectVariantTrack(player, track, clearBuffer = true) {
    if (!player) return;
    player.configure({ abr: { enabled: false } });
    player.selectVariantTrack(track, clearBuffer);
}

function selectAudioLanguage(player, language) {
    if (!player) return;
    player.selectAudioLanguage(language);
}

function selectTextTrack(player, track) {
    if (!player) return;
    if (!track) {
        player.setTextTrackVisibility(false);
    } else {
        player.selectTextTrack(track);
        player.setTextTrackVisibility(true);
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
    setRestrictions,
    setBufferConfiguration,
    setLatencyConfiguration,
    setAbrConfiguration,
    selectVariantTrack,
    selectAudioLanguage,
    selectTextTrack,
    applyStreamConfig,
    setGlobalTrackByHeight,
};
