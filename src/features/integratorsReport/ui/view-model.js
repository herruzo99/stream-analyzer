import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';

/**
 * Generates a generic player configuration object based on stream metadata.
 * @param {import('@/types.ts').Stream} stream
 */
function generatePlayerConfig(stream) {
    const config = {
        url: stream.originalUrl,
        protocol: stream.protocol,
        autoplay: true,
    };

    // Auth headers
    if (stream.auth?.headers?.length > 0) {
        config.authentication = {
            headers: stream.auth.headers.reduce(
                (acc, h) => ({ ...acc, [h.key]: h.value }),
                {}
            ),
        };
    }

    // DRM Configuration
    if (stream.drmAuth) {
        const drm = { servers: {}, advanced: {} };

        const licenseUrls = stream.drmAuth.licenseServerUrl;
        if (typeof licenseUrls === 'object' && licenseUrls !== null) {
            drm.servers = { ...licenseUrls };
        } else if (typeof licenseUrls === 'string') {
            drm.servers['com.widevine.alpha'] = licenseUrls;
            drm.servers['com.microsoft.playready'] = licenseUrls;
        }

        // Certificates
        const certs = stream.drmAuth.serverCertificate;
        if (certs) {
            if (
                typeof certs === 'object' &&
                !(certs instanceof File) &&
                !(certs instanceof ArrayBuffer)
            ) {
                Object.entries(certs).forEach(([sys, cert]) => {
                    drm.advanced[sys] = {
                        serverCertificate: '...binary data...',
                    };
                });
            } else {
                drm.advanced['com.apple.fps'] = {
                    serverCertificate: '...binary data...',
                };
            }
        }

        if (stream.drmAuth.headers?.length > 0) {
            drm.headers = stream.drmAuth.headers.reduce(
                (acc, h) => ({ ...acc, [h.key]: h.value }),
                {}
            );
        }

        if (
            Object.keys(drm.servers).length > 0 ||
            Object.keys(drm.advanced).length > 0
        ) {
            config.drm = drm;
        }
    }

    return config;
}

/**
 * Estimates browser compatibility based on codecs and DRM.
 * @param {Set<string>} videoCodecs
 * @param {Set<string>} audioCodecs
 * @param {string[]} drmSystems
 */
function checkCompatibility(videoCodecs, audioCodecs, drmSystems) {
    const code = (c) => [...videoCodecs].some((vc) => vc.startsWith(c));
    const audio = (c) => [...audioCodecs].some((ac) => ac.startsWith(c));

    // Feature Flags
    const isEncrypted = drmSystems.length > 0;
    const hasHevc = code('hvc1') || code('hev1');
    const hasAv1 = code('av01');
    const hasAc3 = audio('ac-3') || audio('ec-3');

    // Helper to build platform object
    const checkPlatform = (
        name,
        engine,
        { drmType, hevcSupport, av1Support, ac3Support }
    ) => {
        const reqs = [];
        let status = 'supported'; // supported | config-required | partial | unsupported

        // Video Check
        if (hasHevc && !hevcSupport) {
            status = 'unsupported';
            reqs.push({ label: 'HEVC', ok: false, msg: 'Codec not supported' });
        } else if (hasHevc) {
            reqs.push({
                label: 'HEVC',
                ok: true,
                msg: 'Requires Hardware Accel.',
            });
        }

        if (hasAv1 && !av1Support) {
            status = 'unsupported';
            reqs.push({ label: 'AV1', ok: false, msg: 'Codec not supported' });
        }

        // Audio Check
        if (hasAc3 && !ac3Support) {
            status = 'unsupported';
            reqs.push({
                label: 'Dolby Audio',
                ok: false,
                msg: 'Codec not supported',
            });
        } else if (hasAc3) {
            reqs.push({ label: 'Dolby Audio', ok: true, msg: 'Supported' });
        }

        // DRM Check
        if (isEncrypted) {
            const hasSpecificDrm = drmSystems.some((s) =>
                s.toLowerCase().includes(drmType.toLowerCase())
            );

            if (hasSpecificDrm) {
                reqs.push({
                    label: 'DRM',
                    ok: true,
                    msg: `${drmType} Detected`,
                });
                // It's supported but needs config
                if (status === 'supported') status = 'config-required';
            } else {
                // Optimistic: Maybe it's CENC generic?
                const isCenc =
                    drmSystems.length === 0 ||
                    drmSystems.includes('urn:mpeg:dash:mp4protection:2011');
                if (isCenc) {
                    reqs.push({
                        label: 'DRM',
                        ok: 'warn',
                        msg: `${drmType} config needed`,
                    });
                    if (status === 'supported') status = 'config-required';
                } else {
                    reqs.push({
                        label: 'DRM',
                        ok: false,
                        msg: `Missing ${drmType}`,
                    });
                    if (status !== 'unsupported') status = 'partial';
                }
            }
        } else {
            reqs.push({ label: 'DRM', ok: true, msg: 'Clear Content' });
        }

        return { name, engine, status, reqs };
    };

    return [
        checkPlatform('Chrome / Edge / Firefox', 'Blink/Gecko', {
            drmType: 'Widevine',
            hevcSupport: true, // Edge/Chrome usually support via HW
            av1Support: true,
            ac3Support: false, // Generally needs OS extension or passthrough, unsafe default
        }),
        checkPlatform('Safari (macOS/iOS)', 'WebKit', {
            drmType: 'FairPlay',
            hevcSupport: true,
            av1Support: true, // M3/iPhone 15
            ac3Support: true, // Native support
        }),
        checkPlatform('Android TV / Mobile', 'ExoPlayer', {
            drmType: 'Widevine',
            hevcSupport: true,
            av1Support: true,
            ac3Support: true, // Passthrough or software decode usually available
        }),
        checkPlatform('Tizen / WebOS', 'Smart TV', {
            drmType: 'PlayReady',
            hevcSupport: true,
            av1Support: false,
            ac3Support: true, // Native support
        }),
    ];
}

export function createIntegratorsReportViewModel(stream) {
    const videoCodecs = new Set();
    const audioCodecs = new Set();
    const textFormats = new Set();
    let maxResolution = { w: 0, h: 0 };
    let maxBandwidth = 0;

    const summary = stream.manifest?.summary;

    if (summary) {
        summary.videoTracks.forEach((t) => {
            t.codecs.forEach((c) => videoCodecs.add(c.value));
            if (t.bandwidth > maxBandwidth) maxBandwidth = t.bandwidth;
            const res = t.resolutions[0]?.value.split('x');
            if (res?.length === 2) {
                const w = parseInt(res[0]);
                const h = parseInt(res[1]);
                if (w * h > maxResolution.w * maxResolution.h)
                    maxResolution = { w, h };
            }
        });
        summary.audioTracks.forEach((t) => {
            t.codecs.forEach((c) => audioCodecs.add(c.value));
        });
        summary.textTracks.forEach((t) => {
            t.codecsOrMimeTypes.forEach((c) => textFormats.add(c.value));
        });
    }

    const security = summary?.security || { isEncrypted: false, systems: [] };
    const drmNames = security.systems.map((s) => getDrmSystemName(s.systemId));

    const domains = new Set();
    try {
        if (stream.baseUrl) domains.add(new URL(stream.baseUrl).origin);
        if (summary?.general?.locations)
            summary.general.locations.forEach((l) =>
                domains.add(new URL(l).origin)
            );
    } catch (_e) {
        /* ignore */
    }

    const capabilities = [];
    if (summary?.lowLatency?.isLowLatency)
        capabilities.push({ name: 'Low Latency', value: 'Enabled' });
    if (summary?.hls?.iFramePlaylists > 0)
        capabilities.push({ name: 'Trick Play', value: 'I-Frame Tracks' });
    if (textFormats.size > 0)
        capabilities.push({
            name: 'Subtitles',
            value: Array.from(textFormats).join(', '),
        });

    const playerConfig = generatePlayerConfig(stream);

    return {
        overview: {
            streamName: stream.name,
            protocol: stream.protocol.toUpperCase(),
            type: stream.manifest?.type === 'dynamic' ? 'LIVE' : 'VOD',
            maxResolution: `${maxResolution.w}x${maxResolution.h}`,
            maxBandwidth: maxBandwidth,
        },
        technical: {
            videoCodecs: Array.from(videoCodecs),
            audioCodecs: Array.from(audioCodecs),
            drmSystems: drmNames,
            isEncrypted: security.isEncrypted,
        },
        compatibility: checkCompatibility(videoCodecs, audioCodecs, drmNames),
        configObject: playerConfig,
        domains: Array.from(domains),
        capabilities,
    };
}
