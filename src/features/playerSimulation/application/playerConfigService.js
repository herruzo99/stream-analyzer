import { appLog } from '@/shared/utils/debug';

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

    const { schemeIdUriToKeySystem } = await import(
        '@/infrastructure/parsing/utils/drm'
    );
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

    const bufferBehind = targetLatency + 10;
    const maxLatency = targetLatency + 5;

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
                maxLatency,
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
};