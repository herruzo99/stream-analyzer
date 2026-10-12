import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';

// ... (generateIntegrationCode & checkCompatibility helpers remain unchanged) ...

function generateIntegrationCode(stream) {
    const url = typeof stream.originalUrl === 'string' ? stream.originalUrl : '';
    const protocol = typeof stream.protocol === 'string' ? stream.protocol : '';
    const drm = stream.drmAuth || { licenseServerUrl: {}, headers: [] };
    const licenseServers =
        drm.licenseServerUrl && typeof drm.licenseServerUrl === 'object'
            ? drm.licenseServerUrl
            : {};
    const s = (str) => JSON.stringify(str);

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
} catch (e) {
  console.error('Error code', e.code, 'object', e);
}
`.trim();

    const hlsCode =
        protocol === 'hls'
            ? `
if (Hls.isSupported()) {
  const video = document.getElementById('video');
  const hls = new Hls({});
  hls.loadSource(${s(url)});
  hls.attachMedia(video);
}
`.trim()
            : '// HLS.js only works with HLS streams.';

    let dashDrmConfig = {};
    if (protocol === 'dash' && Object.keys(licenseServers).length > 0) {
        dashDrmConfig = Object.entries(licenseServers).reduce(
            (acc, [sys, url]) => {
                acc[sys] = { serverURL: url };
                return acc;
            },
            {}
        );
    }

    const dashCode =
        protocol === 'dash'
            ? `
const url = ${s(url)};
const player = dashjs.MediaPlayer().create();
player.initialize(document.querySelector("#video"), url, true);

${Object.keys(dashDrmConfig).length > 0 ? `player.setProtectionData(${JSON.stringify(dashDrmConfig, null, 2)});` : ''}
`.trim()
            : '// dash.js only works with MPEG-DASH streams.';

    const html5Code = `
<video id="video" controls autoplay>
    <source src="${url}" type="${protocol === 'dash' ? 'application/dash+xml' : 'application/x-mpegURL'}">
</video>
`.trim();

    return {
        shaka: shakaCode,
        hlsjs: hlsCode,
        dashjs: dashCode,
        html5: html5Code,
    };
}

function checkCompatibility(videoCodecs, audioCodecs, drmSystems) {
    const code = (c) => [...videoCodecs].some((vc) => vc.startsWith(c));
    const audio = (c) => [...audioCodecs].some((ac) => ac.startsWith(c));

    const isEncrypted = drmSystems.length > 0;
    const hasHevc = code('hvc1') || code('hev1');
    const hasAv1 = code('av01');
    const hasAc3 = audio('ac-3') || audio('ec-3');
    const hasVp9 = code('vp09');

    const checkPlatform = (
        name,
        engine,
        { drmType, hevcSupport, av1Support, ac3Support, vp9Support }
    ) => {
        const reqs = [];
        let status = 'supported';

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
        if (hasAc3 && !ac3Support) {
            status = 'unsupported';
            reqs.push({ label: 'Dolby', ok: false, msg: 'Codec unsupported' });
        }

        if (isEncrypted) {
            const hasSpecificDrm = drmSystems.some((s) =>
                s.toLowerCase().includes(drmType.toLowerCase())
            );
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
            hevcSupport: true,
            av1Support: true,
            vp9Support: true,
            ac3Support: false,
        }),
        checkPlatform('Safari (macOS/iOS)', 'WebKit', {
            drmType: 'FairPlay',
            hevcSupport: true,
            av1Support: true,
            vp9Support: true,
            ac3Support: true,
        }),
        checkPlatform('Android TV / Mobile', 'ExoPlayer', {
            drmType: 'Widevine',
            hevcSupport: true,
            av1Support: true,
            vp9Support: true,
            ac3Support: true,
        }),
        checkPlatform('Smart TVs (Tizen/WebOS)', 'Platform', {
            drmType: 'PlayReady',
            hevcSupport: true,
            av1Support: false,
            vp9Support: true,
            ac3Support: true,
        }),
    ];
}

export function createIntegratorsReportViewModel(stream) {
    if (!stream || typeof stream !== 'object') return null;
    const summary = stream.manifest?.summary;
    if (!summary || typeof summary !== 'object') return null;

    const videoTracks = Array.isArray(summary.videoTracks) ? summary.videoTracks : [];
    const audioTracks = Array.isArray(summary.audioTracks) ? summary.audioTracks : [];
    const textTracks = Array.isArray(summary.textTracks) ? summary.textTracks : [];

    const videoCodecs = new Set();
    const audioCodecs = new Set();
    const textFormats = new Set();
    let maxResolution = { w: 0, h: 0 };
    let maxBandwidth = 0;
    let minBandwidth = Infinity;

    videoTracks.forEach((t) => {
        if (!t || typeof t !== 'object') return;
        const codecs = Array.isArray(t.codecs) ? t.codecs : [];
        codecs.forEach((c) => {
            if (c?.value) videoCodecs.add(String(c.value));
        });
        const muxedCodecs = t.muxedAudio?.codecs;
        if (Array.isArray(muxedCodecs)) {
            muxedCodecs.forEach((c) => {
                if (c?.value) audioCodecs.add(String(c.value));
            });
        }
        const bandwidth = Number(t.bandwidth);
        if (Number.isFinite(bandwidth) && bandwidth >= 0) {
            if (bandwidth > maxBandwidth) maxBandwidth = bandwidth;
            if (bandwidth < minBandwidth) minBandwidth = bandwidth;
        }
        const resValue = t.resolutions?.[0]?.value;
        const res = typeof resValue === 'string' ? resValue.split('x') : null;
        if (res?.length === 2) {
            const w = parseInt(res[0], 10);
            const h = parseInt(res[1], 10);
            if (
                Number.isFinite(w) &&
                Number.isFinite(h) &&
                w * h > maxResolution.w * maxResolution.h
            )
                maxResolution = { w, h };
        }
    });

    if (minBandwidth === Infinity) minBandwidth = 0;

    audioTracks.forEach((t) => {
        const codecs = t && Array.isArray(t.codecs) ? t.codecs : [];
        codecs.forEach((c) => {
            if (c?.value) audioCodecs.add(String(c.value));
        });
    });
    textTracks.forEach((t) => {
        const formats = t && Array.isArray(t.codecsOrMimeTypes) ? t.codecsOrMimeTypes : [];
        formats.forEach((c) => {
            if (c?.value) textFormats.add(String(c.value));
        });
    });

    const security =
        summary.security && typeof summary.security === 'object'
            ? summary.security
            : { isEncrypted: false, systems: [] };
    const securitySystems = Array.isArray(security.systems) ? security.systems : [];
    const drmNames = securitySystems.map((s) => getDrmSystemName(s?.systemId));

    const domains = new Set();
    const addOrigin = (value) => {
        try {
            if (typeof value === 'string' && value)
                domains.add(new URL(value).origin);
        } catch {
            // Malformed URLs are skipped, not shown.
        }
    };
    addOrigin(stream.baseUrl);
    const locations = Array.isArray(summary.general?.locations)
        ? summary.general.locations
        : [];
    locations.forEach(addOrigin);
    if (stream.drmAuth?.licenseServerUrl) {
        const urls =
            typeof stream.drmAuth.licenseServerUrl === 'string'
                ? [stream.drmAuth.licenseServerUrl]
                : Object.values(stream.drmAuth.licenseServerUrl);
        urls.forEach(addOrigin);
    }

    const badges = [];
    if (summary.lowLatency?.isLowLatency) badges.push('Low Latency');
    if (Number(summary.hls?.iFramePlaylists) > 0) badges.push('Trick Play');
    if (textFormats.size > 0) badges.push('Subtitles');
    if (typeof summary.general?.streamType === 'string' && summary.general.streamType.includes('Live'))
        badges.push('Live');
    else badges.push('VOD');

    const protocol = typeof stream.protocol === 'string' ? stream.protocol : 'unknown';
    let profiles = 'N/A';
    const dashProfiles = summary.dash?.profiles;
    if (typeof dashProfiles === 'string' && dashProfiles) {
        profiles = dashProfiles;
    } else if (summary.hls?.version) {
        profiles = `HLS v${summary.hls.version}`;
    }

    // --- Smart Polling Data ---
    // Set by the monitor service on live streams; null when unknown.
    const pollingMs = Number(stream.smartPollingInterval);
    const smartPollingInterval =
        Number.isFinite(pollingMs) && pollingMs > 0 ? (pollingMs / 1000).toFixed(1) : null;

    const segmentDuration = () => {
        const candidates = [
            summary.hls?.mediaPlaylistDetails?.averageSegmentDuration,
            summary.dash?.maxSegmentDuration,
        ];
        for (const candidate of candidates) {
            const value = Number(candidate);
            if (Number.isFinite(value) && value >= 0) return value;
        }
        return 0;
    };

    return {
        overview: {
            streamName: typeof stream.name === 'string' && stream.name ? stream.name : 'Unnamed stream',
            protocol: protocol.toUpperCase(),
            type: stream.manifest?.type === 'dynamic' ? 'LIVE' : 'VOD',
            maxResolution: `${maxResolution.w}x${maxResolution.h}`,
            maxBandwidth,
            minBandwidth,
            badges,
            isLive: stream.manifest?.type === 'dynamic',
        },
        specs: {
            videoCodecs: Array.from(videoCodecs),
            audioCodecs: Array.from(audioCodecs),
            textFormats: Array.from(textFormats),
            profiles: profiles,
            drmSystems: drmNames,
            isEncrypted: security.isEncrypted === true,
            avgSegmentDuration: segmentDuration(),

            // Calculated smart interval, in seconds (string) or null.
            smartPollingInterval,
        },
        compatibility: checkCompatibility(videoCodecs, audioCodecs, drmNames),
        codeSnippets: generateIntegrationCode(stream),
        domains: Array.from(domains),
        securityInfo: security,
    };
}
