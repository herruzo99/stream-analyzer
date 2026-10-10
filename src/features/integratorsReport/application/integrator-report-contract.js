import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';

export const INTEGRATOR_REPORT_VERSION = 'sa-integrator-report/1';
export const INTEGRATOR_EVIDENCE_VERSION = 'sa-integrator-evidence/1';
export const INTEGRATOR_REPORT_LIMITS = Object.freeze({
    tracks: 64,
    values: 32,
    domains: 32,
    text: 160,
    snippet: 12_000,
});

const SECRET_QUERY =
    /^(?:access_?token|api_?key|auth|authorization|key|secret|signature|sig|token)$/i;

const record = (value) =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? /** @type {Record<string, unknown>} */ (value)
        : {};

/** @param {unknown} value @param {number} [limit] */
const boundedText = (value, limit = INTEGRATOR_REPORT_LIMITS.text) =>
    Array.from(String(value ?? ''))
        .filter((character) => {
            const code = character.codePointAt(0) ?? 0;
            return character === '\n' || character === '\t' || code >= 32;
        })
        .join('')
        .slice(0, limit);

function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

const stableId = (prefix, value) => `${prefix}-${stableHash(value)}`;

function safeUrl(value) {
    try {
        const url = new URL(String(value));
        url.username = '';
        url.password = '';
        for (const key of [...url.searchParams.keys()]) {
            if (SECRET_QUERY.test(key)) url.searchParams.set(key, '[redacted]');
        }
        url.hash = '';
        return Object.freeze({
            valid: true,
            display: boundedText(url.href, 500),
            origin: url.origin,
        });
    } catch {
        return Object.freeze({
            valid: false,
            display: '[unavailable-url]',
            origin: '',
        });
    }
}

const boundedArray = (value) =>
    Array.isArray(value) ? value.slice(0, INTEGRATOR_REPORT_LIMITS.tracks) : [];

function collectValues(tracks, key) {
    const values = new Set();
    for (const rawTrack of boundedArray(tracks)) {
        const track = record(rawTrack);
        for (const rawValue of boundedArray(track[key])) {
            const value = boundedText(record(rawValue).value, 96);
            if (value) values.add(value);
            if (values.size >= INTEGRATOR_REPORT_LIMITS.values) break;
        }
        if (values.size >= INTEGRATOR_REPORT_LIMITS.values) break;
    }
    return Object.freeze([...values]);
}

function compatibility(videoCodecs, audioCodecs, drmSystems) {
    const has = (items, prefix) =>
        items.some((item) => item.startsWith(prefix));
    const encrypted = drmSystems.length > 0;
    const platforms = [
        {
            name: 'Chrome / Edge / Firefox',
            engine: 'Blink/Gecko',
            drm: 'Widevine',
            ac3: false,
            av1: true,
        },
        {
            name: 'Safari (macOS/iOS)',
            engine: 'WebKit',
            drm: 'FairPlay',
            ac3: true,
            av1: true,
        },
        {
            name: 'Android TV / Mobile',
            engine: 'ExoPlayer',
            drm: 'Widevine',
            ac3: true,
            av1: true,
        },
        {
            name: 'Smart TVs (Tizen/WebOS)',
            engine: 'Platform',
            drm: 'PlayReady',
            ac3: true,
            av1: false,
        },
    ];
    return Object.freeze(
        platforms.map(({ name, engine, drm, ac3, av1 }, index) => {
            const requirements = [];
            let status = 'supported';
            if (
                (has(videoCodecs, 'av01') && !av1) ||
                (has(audioCodecs, 'ac-3') && !ac3) ||
                (has(audioCodecs, 'ec-3') && !ac3)
            ) {
                status = 'unsupported';
                requirements.push('One or more codecs are unsupported.');
            }
            if (encrypted) {
                const ready = drmSystems.some((system) =>
                    system.toLowerCase().includes(drm.toLowerCase())
                );
                if (!ready && status !== 'unsupported') status = 'partial';
                requirements.push(
                    ready ? `${drm} ready.` : `${drm} must be verified.`
                );
            } else requirements.push('Clear content; no DRM required.');
            return Object.freeze({
                id: stableId(
                    'sa-integrator-platform',
                    `${index}:${name}:${engine}`
                ),
                name,
                engine,
                status,
                requirements: Object.freeze(requirements),
            });
        })
    );
}

function snippets(protocol, sourceUrl, licenseServers) {
    const url = JSON.stringify(sourceUrl);
    const servers = JSON.stringify(licenseServers, null, 2);
    const values = {
        shaka: `const player = new shaka.Player(document.getElementById('video'));
player.configure({ drm: { servers: ${servers} } });
await player.load(${url});`,
        hlsjs:
            protocol === 'hls'
                ? `const hls = new Hls();
hls.loadSource(${url});
hls.attachMedia(document.getElementById('video'));`
                : '// HLS.js is available only for HLS streams.',
        dashjs:
            protocol === 'dash'
                ? `const player = dashjs.MediaPlayer().create();
player.initialize(document.getElementById('video'), ${url}, true);`
                : '// dash.js is available only for MPEG-DASH streams.',
        html5: `<video id="video" controls>
  <source src=${url} type="${protocol === 'dash' ? 'application/dash+xml' : 'application/x-mpegURL'}">
</video>`,
    };
    return Object.freeze(
        Object.fromEntries(
            Object.entries(values).map(([key, value]) => [
                key,
                boundedText(value, INTEGRATOR_REPORT_LIMITS.snippet),
            ])
        )
    );
}

/**
 * Builds the bounded, immutable, application-owned Integrator Report.
 * @param {import('@/types').Stream | null | undefined} stream
 */
export function createIntegratorReport(stream) {
    if (!stream?.manifest)
        return Object.freeze({
            contractVersion: INTEGRATOR_REPORT_VERSION,
            state: 'unavailable',
            reason: 'Analyze a stream to create an integrator report.',
        });

    const summary = record(stream.manifest.summary);
    if (Object.keys(summary).length === 0)
        return Object.freeze({
            contractVersion: INTEGRATOR_REPORT_VERSION,
            state: 'error',
            reason: 'The selected analysis has no usable summary.',
        });

    const videoTracks = boundedArray(summary.videoTracks);
    const audioTracks = boundedArray(summary.audioTracks);
    const textTracks = boundedArray(summary.textTracks);
    const malformed =
        !Array.isArray(summary.videoTracks) ||
        !Array.isArray(summary.audioTracks) ||
        !Array.isArray(summary.textTracks);
    const truncated = [
        summary.videoTracks,
        summary.audioTracks,
        summary.textTracks,
    ].some(
        (value) =>
            Array.isArray(value) &&
            value.length > INTEGRATOR_REPORT_LIMITS.tracks
    );
    const videoCodecs = collectValues(videoTracks, 'codecs');
    const audioCodecs = new Set(collectValues(audioTracks, 'codecs'));
    for (const rawTrack of videoTracks) {
        const muxed = record(record(rawTrack).muxedAudio);
        for (const value of collectValues([muxed], 'codecs'))
            audioCodecs.add(value);
    }
    const boundedAudioCodecs = Object.freeze(
        [...audioCodecs].slice(0, INTEGRATOR_REPORT_LIMITS.values)
    );
    const textFormats = collectValues(textTracks, 'codecsOrMimeTypes');

    let maxPixels = 0;
    let maxResolution = '0x0';
    let minBandwidth = Infinity;
    let maxBandwidth = 0;
    for (const rawTrack of videoTracks) {
        const track = record(rawTrack);
        const bandwidth = Number(track.bandwidth);
        if (Number.isFinite(bandwidth) && bandwidth >= 0) {
            minBandwidth = Math.min(minBandwidth, bandwidth);
            maxBandwidth = Math.max(maxBandwidth, bandwidth);
        }
        const resolution = boundedText(
            record(boundedArray(track.resolutions)[0]).value,
            32
        );
        const match = /^(\d+)x(\d+)$/.exec(resolution);
        if (match) {
            const pixels = Number(match[1]) * Number(match[2]);
            if (pixels > maxPixels) {
                maxPixels = pixels;
                maxResolution = resolution;
            }
        }
    }
    if (minBandwidth === Infinity) minBandwidth = 0;

    const security = record(summary.security);
    const systems = boundedArray(security.systems)
        .map((item) => boundedText(record(item).systemId, 96))
        .filter(Boolean);
    const drmSystems = Object.freeze(
        systems
            .slice(0, INTEGRATOR_REPORT_LIMITS.values)
            .map((system) => boundedText(getDrmSystemName(system), 96))
    );

    const originalUrl = safeUrl(stream.originalUrl);
    const licenseValue = stream.drmAuth?.licenseServerUrl;
    const rawLicenseServers =
        typeof licenseValue === 'string'
            ? [['default', licenseValue]]
            : Object.entries(record(licenseValue));
    /** @type {Array<[string, string]>} */
    const projectedLicenseServers = [];
    const candidateUrls = [
        stream.baseUrl,
        ...boundedArray(record(summary.general).locations),
    ];
    for (const [system, value] of rawLicenseServers.slice(
        0,
        INTEGRATOR_REPORT_LIMITS.domains
    )) {
        const projected = safeUrl(value);
        projectedLicenseServers.push([
            boundedText(system, 64) || 'unknown',
            projected.display,
        ]);
        candidateUrls.push(value);
    }
    const domains = new Set();
    let invalidUrlCount = originalUrl.valid ? 0 : 1;
    for (const value of candidateUrls.slice(
        0,
        INTEGRATOR_REPORT_LIMITS.domains * 2
    )) {
        if (!value) continue;
        const projected = safeUrl(value);
        if (projected.valid) domains.add(projected.origin);
        else invalidUrlCount += 1;
        if (domains.size >= INTEGRATOR_REPORT_LIMITS.domains) break;
    }

    const general = record(summary.general);
    const type = stream.manifest.type === 'dynamic' ? 'LIVE' : 'VOD';
    const protocol = boundedText(stream.protocol, 16).toLowerCase();
    const badges = [];
    if (record(summary.lowLatency).isLowLatency) badges.push('Low Latency');
    if (Number(record(summary.hls).iFramePlaylists) > 0)
        badges.push('Trick Play');
    if (textFormats.length > 0) badges.push('Subtitles');
    badges.push(
        boundedText(general.streamType, 32).includes('Live') ? 'Live' : type
    );
    const profiles = boundedText(
        record(summary.dash).profiles ||
            (record(summary.hls).version
                ? `HLS v${record(summary.hls).version}`
                : 'N/A'),
        160
    );
    const segmentDuration = Number(
        record(record(summary.hls).mediaPlaylistDetails)
            .averageSegmentDuration ||
            record(summary.dash).maxSegmentDuration ||
            0
    );
    const polling = Number(stream.smartPollingInterval);
    const state =
        malformed || truncated || invalidUrlCount > 0 ? 'partial' : 'complete';
    const streamId = boundedText(stream.id, 96);
    const sourceIdentity = stableId(
        'sa-integrator-source',
        `${streamId}:${stream.originalUrl}:${stream.activeManifestUpdateId ?? ''}`
    );
    const identitySeed = [
        INTEGRATOR_REPORT_VERSION,
        sourceIdentity,
        protocol,
        type,
        maxResolution,
        minBandwidth,
        maxBandwidth,
        videoCodecs.join(','),
        boundedAudioCodecs.join(','),
        drmSystems.join(','),
    ].join(':');

    return Object.freeze({
        contractVersion: INTEGRATOR_REPORT_VERSION,
        evidenceVersion: INTEGRATOR_EVIDENCE_VERSION,
        reportId: stableId('sa-integrator-report', identitySeed),
        evidenceId: stableId('sa-integrator-evidence', identitySeed),
        sourceIdentity,
        deterministic: true,
        state,
        reason:
            state === 'partial'
                ? 'Some source values were invalid or exceeded report bounds.'
                : '',
        truncated,
        invalidUrlCount,
        streamId,
        streamLabel: boundedText(stream.name || 'Unnamed stream'),
        protocol: protocol.toUpperCase(),
        type,
        overview: Object.freeze({
            maxResolution,
            minBandwidth,
            maxBandwidth,
            badges: Object.freeze(badges),
        }),
        specs: Object.freeze({
            profiles,
            videoCodecs,
            audioCodecs: boundedAudioCodecs,
            textFormats,
            drmSystems,
            isEncrypted: Boolean(security.isEncrypted),
            averageSegmentDuration:
                Number.isFinite(segmentDuration) && segmentDuration >= 0
                    ? segmentDuration
                    : 0,
            pollingSeconds:
                Number.isFinite(polling) && polling > 0 ? polling / 1000 : null,
        }),
        compatibility: compatibility(
            videoCodecs,
            boundedAudioCodecs,
            drmSystems
        ),
        codeSnippets: snippets(
            protocol,
            originalUrl.display,
            Object.fromEntries(projectedLicenseServers)
        ),
        domains: Object.freeze([...domains]),
    });
}
