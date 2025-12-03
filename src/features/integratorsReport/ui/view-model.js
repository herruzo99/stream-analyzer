import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';

/**
 * Generates player-specific code snippets.
 * @param {import('@/types.ts').Stream} stream
 */
function generateIntegrationCode(stream) {
    const url = stream.originalUrl;
    // FIX: Ensure drmAuth has a valid shape matching the type definition fallback
    const drm = stream.drmAuth || { licenseServerUrl: {}, headers: [] };
    const licenseServers = drm.licenseServerUrl || {};

    // Helper to safe-string
    const s = (str) => JSON.stringify(str);

    // --- Shaka Player ---
    const shakaDrmConfig = {};
    if (Object.keys(licenseServers).length > 0) {
        shakaDrmConfig.servers = licenseServers;
    }
    const shakaCode = `
const video = document.getElementById('video');
const player = new shaka.Player(video);

player.configure({
  drm: ${JSON.stringify(shakaDrmConfig, null, 2).replace(/\n/g, '\n  ')}
});

try {
  await player.load(${s(url)});
  console.log('The video has now been loaded!');
} catch (e) {
  console.error('Error code', e.code, 'object', e);
}
`.trim();

    // --- hls.js ---
    const hlsCode =
        stream.protocol === 'hls'
            ? `
if (Hls.isSupported()) {
  const video = document.getElementById('video');
  const hls = new Hls({
    // DRM configuration usually handled via setMediaKeys or custom loader
    xhrSetup: (xhr, url) => {
      // Add custom headers here if needed
    }
  });
  hls.loadSource(${s(url)});
  hls.attachMedia(video);
}
`.trim()
            : '// HLS.js is valid only for HLS streams.';

    // --- dash.js ---
    let dashDrmConfig = {};
    if (stream.protocol === 'dash' && Object.keys(licenseServers).length > 0) {
        dashDrmConfig = Object.entries(licenseServers).reduce(
            (acc, [sys, url]) => {
                acc[sys] = { serverURL: url };
                return acc;
            },
            {}
        );
    }

    const dashCode =
        stream.protocol === 'dash'
            ? `
const url = ${s(url)};
const player = dashjs.MediaPlayer().create();
player.initialize(document.querySelector("#video"), url, true);

${Object.keys(dashDrmConfig).length > 0 ? `player.setProtectionData(${JSON.stringify(dashDrmConfig, null, 2)});` : ''}
`.trim()
            : '// dash.js is valid only for MPEG-DASH streams.';

    // --- HTML5 / AVPlayer (Native) ---
    const html5Code = `
<video id="video" controls autoplay>
    <source src="${url}" type="${stream.protocol === 'dash' ? 'application/dash+xml' : 'application/x-mpegURL'}">
</video>
`.trim();

    return {
        shaka: shakaCode,
        hlsjs: hlsCode,
        dashjs: dashCode,
        html5: html5Code,
    };
}

/**
 * Estimates browser compatibility based on codecs and DRM.
 */
function checkCompatibility(videoCodecs, audioCodecs, drmSystems) {
    const code = (c) => [...videoCodecs].some((vc) => vc.startsWith(c));
    const audio = (c) => [...audioCodecs].some((ac) => ac.startsWith(c));

    const isEncrypted = drmSystems.length > 0;
    const hasHevc = code('hvc1') || code('hev1');
    const hasAv1 = code('av01');
    const hasAc3 = audio('ac-3') || audio('ec-3');
    const hasVp9 = code('vp09');

    // Helper to build platform object
    const checkPlatform = (
        name,
        engine,
        { drmType, hevcSupport, av1Support, ac3Support, vp9Support }
    ) => {
        const reqs = [];
        let status = 'supported';

        // Video Check
        if (hasHevc && !hevcSupport) {
            status = 'unsupported';
            reqs.push({ label: 'HEVC', ok: false, msg: 'Codec unsupported' });
        }
        if (hasAv1 && !av1Support) {
            status = 'unsupported';
            reqs.push({ label: 'AV1', ok: false, msg: 'Codec unsupported' });
        }
        if (hasVp9 && !vp9Support) {
            reqs.push({ label: 'VP9', ok: true, msg: 'Supported' });
        }

        // Audio Check
        if (hasAc3 && !ac3Support) {
            status = 'unsupported';
            reqs.push({
                label: 'Dolby',
                ok: false,
                msg: 'Codec unsupported',
            });
        }

        // DRM Check
        if (isEncrypted) {
            const hasSpecificDrm = drmSystems.some((s) =>
                s.toLowerCase().includes(drmType.toLowerCase())
            );

            // Generic CENC check (Common Encryption)
            const isCenc = drmSystems.some(
                (s) => s.includes('common') || s.includes('mp4protection')
            );

            if (hasSpecificDrm) {
                reqs.push({ label: 'DRM', ok: true, msg: `${drmType} Ready` });
            } else if (isCenc) {
                reqs.push({
                    label: 'DRM',
                    ok: 'warn',
                    msg: `CENC (Check ${drmType})`,
                });
            } else {
                reqs.push({
                    label: 'DRM',
                    ok: false,
                    msg: `Missing ${drmType}`,
                });
                if (status !== 'unsupported') status = 'partial';
            }
        } else {
            reqs.push({ label: 'DRM', ok: true, msg: 'Clear Content' });
        }

        return { name, engine, status, reqs };
    };

    return [
        checkPlatform('Chrome / Edge / Firefox', 'Blink/Gecko', {
            drmType: 'Widevine',
            hevcSupport: true, // Modern versions/hardware
            av1Support: true,
            vp9Support: true,
            ac3Support: false,
        }),
        checkPlatform('Safari (macOS/iOS)', 'WebKit', {
            drmType: 'FairPlay',
            hevcSupport: true,
            av1Support: true, // Newer hardware
            vp9Support: true,
            ac3Support: true,
        }),
        checkPlatform('Android TV / Mobile', 'ExoPlayer', {
            drmType: 'Widevine',
            hevcSupport: true,
            av1Support: true,
            vp9Support: true,
            ac3Support: true, // Passthrough usually
        }),
        checkPlatform('Smart TVs (Tizen/WebOS)', 'Platform', {
            drmType: 'PlayReady',
            hevcSupport: true,
            av1Support: false, // Varies
            vp9Support: true,
            ac3Support: true,
        }),
    ];
}

export function createIntegratorsReportViewModel(stream) {
    const summary = stream.manifest?.summary;
    if (!summary) return null;

    const videoCodecs = new Set();
    const audioCodecs = new Set();
    const textFormats = new Set();
    let maxResolution = { w: 0, h: 0 };
    let maxBandwidth = 0;
    let minBandwidth = Infinity;

    summary.videoTracks.forEach((t) => {
        t.codecs.forEach((c) => videoCodecs.add(c.value));

        // --- FIX: Also collect muxed audio codecs (common in HLS TS) ---
        if (t.muxedAudio && t.muxedAudio.codecs) {
            t.muxedAudio.codecs.forEach((c) => audioCodecs.add(c.value));
        }

        if (t.bandwidth > maxBandwidth) maxBandwidth = t.bandwidth;
        if (t.bandwidth < minBandwidth) minBandwidth = t.bandwidth;
        const res = t.resolutions[0]?.value.split('x');
        if (res?.length === 2) {
            const w = parseInt(res[0]);
            const h = parseInt(res[1]);
            if (w * h > maxResolution.w * maxResolution.h)
                maxResolution = { w, h };
        }
    });

    if (minBandwidth === Infinity) minBandwidth = 0;

    summary.audioTracks.forEach((t) => {
        t.codecs.forEach((c) => audioCodecs.add(c.value));
    });
    summary.textTracks.forEach((t) => {
        t.codecsOrMimeTypes.forEach((c) => textFormats.add(c.value));
    });

    const security = summary.security || { isEncrypted: false, systems: [] };
    const drmNames = security.systems.map((s) => getDrmSystemName(s.systemId));

    const domains = new Set();
    try {
        if (stream.baseUrl) domains.add(new URL(stream.baseUrl).origin);
        if (summary.general?.locations)
            summary.general.locations.forEach((l) =>
                domains.add(new URL(l).origin)
            );
        if (stream.drmAuth?.licenseServerUrl) {
            const urls =
                typeof stream.drmAuth.licenseServerUrl === 'string'
                    ? [stream.drmAuth.licenseServerUrl]
                    : Object.values(stream.drmAuth.licenseServerUrl);
            urls.forEach((u) => domains.add(new URL(u).origin));
        }
    } catch (_e) {
        /* ignore */
    }

    const badges = [];
    if (summary.lowLatency?.isLowLatency) badges.push('Low Latency');
    if (summary.hls?.iFramePlaylists > 0) badges.push('Trick Play');
    if (textFormats.size > 0) badges.push('Subtitles');
    if (summary.general.streamType.includes('Live')) badges.push('Live');
    else badges.push('VOD');

    const integrationCode = generateIntegrationCode(stream);

    // Determine Profile Label
    let profiles = 'N/A';
    if (summary.dash?.profiles) {
        profiles = summary.dash.profiles;
    } else if (summary.hls?.version) {
        profiles = `HLS v${summary.hls.version}`;
    }

    return {
        overview: {
            streamName: stream.name,
            protocol: stream.protocol.toUpperCase(),
            type: stream.manifest?.type === 'dynamic' ? 'LIVE' : 'VOD',
            maxResolution: `${maxResolution.w}x${maxResolution.h}`,
            maxBandwidth,
            minBandwidth,
            badges,
        },
        specs: {
            videoCodecs: Array.from(videoCodecs),
            audioCodecs: Array.from(audioCodecs),
            textFormats: Array.from(textFormats),
            profiles: profiles,
            drmSystems: drmNames,
            isEncrypted: security.isEncrypted,
            avgSegmentDuration:
                summary.hls?.mediaPlaylistDetails?.averageSegmentDuration ||
                summary.dash?.maxSegmentDuration ||
                0,
        },
        compatibility: checkCompatibility(videoCodecs, audioCodecs, drmNames),
        codeSnippets: integrationCode,
        domains: Array.from(domains),
        securityInfo: security,
    };
}
