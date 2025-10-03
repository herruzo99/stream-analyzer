/**
 * @typedef {import('../../../core/store.js').Manifest} Manifest
 */

const formatBitrate = (bps) => {
    if (!bps || isNaN(bps)) return 'N/A';
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    return `${(bps / 1000).toFixed(0)} kbps`;
};

/**
 * Creates a protocol-agnostic summary view-model from an HLS manifest.
 * @param {Manifest} manifestIR - The partially adapted manifest IR.
 * @returns {import('../../../core/store.js').ManifestSummary}
 */
export function generateHlsSummary(manifestIR) {
    const { serializedManifest: rawElement } = manifestIR;
    const isMaster = rawElement.isMaster;

    const videoTracks = [];
    const audioTracks = [];
    const textTracks = [];
    const protectionSchemes = new Set();
    const kids = new Set();
    let mediaPlaylistDetails = null;

    if (isMaster) {
        // Video tracks from variants
        rawElement.variants.forEach((v, i) => {
            const codecs = v.attributes.CODECS || '';
            if (
                codecs.includes('avc1') ||
                codecs.includes('hvc1') ||
                v.attributes.RESOLUTION
            ) {
                videoTracks.push({
                    id: v.attributes['STABLE-VARIANT-ID'] || `variant_${i}`,
                    profiles: null,
                    bitrateRange: formatBitrate(v.attributes.BANDWIDTH),
                    resolutions: v.attributes.RESOLUTION
                        ? [v.attributes.RESOLUTION]
                        : [],
                    codecs: [codecs],
                    scanType: null,
                    videoRange: v.attributes['VIDEO-RANGE'] || null,
                    roles: [], // Roles not standard on HLS variants
                });
            }
        });

        // Audio and Text tracks from media renditions
        rawElement.media.forEach((m, i) => {
            const trackId =
                m['STABLE-RENDITION-ID'] || `${m.TYPE.toLowerCase()}_${i}`;
            if (m.TYPE === 'AUDIO') {
                audioTracks.push({
                    id: trackId,
                    lang: m.LANGUAGE,
                    codecs: [], // Codecs are on variants in HLS, not media tags
                    channels: m.CHANNELS ? [m.CHANNELS] : [],
                    isDefault: m.DEFAULT === 'YES',
                    isForced: m.FORCED === 'YES',
                    roles: [],
                });
            } else if (m.TYPE === 'SUBTITLES' || m.TYPE === 'CLOSED-CAPTIONS') {
                textTracks.push({
                    id: trackId,
                    lang: m.LANGUAGE,
                    codecsOrMimeTypes: [],
                    isDefault: m.DEFAULT === 'YES',
                    isForced: m.FORCED === 'YES',
                    roles: [],
                });
            }
        });

        // Aggregate protection from session keys
        const sessionKey = rawElement.tags.find(
            (t) => t.name === 'EXT-X-SESSION-KEY'
        );
        if (sessionKey && sessionKey.value.METHOD !== 'NONE') {
            protectionSchemes.add(sessionKey.value.METHOD);
            if (
                sessionKey.value.KEYFORMAT ===
                    'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed' &&
                sessionKey.value.URI
            ) {
                // Attempt to extract KID from Widevine PSSH URI
                try {
                    const psshData = atob(sessionKey.value.URI.split(',')[1]);
                    const kid = psshData.slice(32, 48); // KID is at offset 32 in Widevine PSSH
                    kids.add(
                        Array.from(kid)
                            .map((c) =>
                                c.charCodeAt(0).toString(16).padStart(2, '0')
                            )
                            .join('')
                    );
                } catch (_e) {
                    /* ignore parse error */
                }
            }
        }
    } else {
        // Media playlist analysis
        const keyTag = rawElement.segments.find((s) => s.key)?.key;
        if (keyTag && keyTag.METHOD !== 'NONE') {
            protectionSchemes.add(keyTag.METHOD);
        }

        const segmentCount = rawElement.segments.length;
        const totalDuration = rawElement.segments.reduce(
            (sum, seg) => sum + seg.duration,
            0
        );

        mediaPlaylistDetails = {
            segmentCount: segmentCount,
            averageSegmentDuration:
                segmentCount > 0 ? totalDuration / segmentCount : 0,
            hasDiscontinuity: rawElement.segments.some((s) => s.discontinuity),
            isIFrameOnly: rawElement.tags.some(
                (t) => t.name === 'EXT-X-I-FRAMES-ONLY'
            ),
        };

        // For a media playlist, content tracks are 1 (the media itself), 0, 0.
    }

    const iFramePlaylists = rawElement.tags.filter(
        (t) => t.name === 'EXT-X-I-FRAME-STREAM-INF'
    ).length;

    /** @type {import('../../../core/store.js').ManifestSummary} */
    const summary = {
        general: {
            protocol: 'HLS',
            streamType:
                manifestIR.type === 'dynamic'
                    ? 'Live / Dynamic'
                    : 'VOD / Static',
            streamTypeColor:
                manifestIR.type === 'dynamic'
                    ? 'text-red-400'
                    : 'text-blue-400',
            duration: manifestIR.duration,
            segmentFormat: manifestIR.segmentFormat.toUpperCase(),
            title: null,
            locations: [],
            segmenting: 'Segment List',
        },
        dash: null,
        hls: {
            version: rawElement.version,
            targetDuration: rawElement.targetDuration,
            iFramePlaylists: iFramePlaylists,
            mediaPlaylistDetails,
        },
        lowLatency: {
            isLowLatency: !!rawElement.partInf,
            partTargetDuration: rawElement.partInf?.['PART-TARGET'] || null,
            partHoldBack: manifestIR.serverControl?.['PART-HOLD-BACK'] || null,
            canBlockReload:
                manifestIR.serverControl?.['CAN-BLOCK-RELOAD'] === 'YES',
            targetLatency: null,
            minLatency: null,
            maxLatency: null,
        },
        content: {
            periods: 1, // HLS is conceptually a single period
            videoTracks: videoTracks.length,
            audioTracks: audioTracks.length,
            textTracks: textTracks.length,
            mediaPlaylists: isMaster ? rawElement.variants.length : 1,
        },
        videoTracks,
        audioTracks,
        textTracks,
        security: {
            isEncrypted: protectionSchemes.size > 0,
            systems: Array.from(protectionSchemes),
            kids: Array.from(kids),
        },
    };

    return summary;
}
