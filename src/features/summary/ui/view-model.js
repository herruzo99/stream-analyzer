import {
    findChildrenRecursive,
    getAttr,
} from '@/infrastructure/parsing/utils/recursive-parser.js';

/**
 * Prepares data for the reimagined summary dashboard.
 * @param {import('@/types').Stream} stream
 */
export function createSummaryViewModel(stream) {
    const summary = stream.manifest.summary;
    const isLive = stream.manifest.type === 'dynamic';
    const manifestIR = stream.manifest;
    const serializedManifest = stream.manifest.serializedManifest;

    // ... (Keep unused DASH data extraction: timingSource, metrics, etc. unchanged) ...
    // (This section is large but unchanged, abbreviated for clarity)
    let timingSource = null;
    let metrics = [];
    let serviceDescriptions = [];
    let popularityRates = [];
    let viewpoints = [];
    let ratings = [];
    let subsets = [];
    let extendedBandwidths = [];
    let failoverContents = [];

    if (stream.protocol === 'dash') {
        const utcTiming = findChildrenRecursive(
            serializedManifest,
            'UTCTiming'
        )[0];
        if (utcTiming) {
            timingSource = {
                scheme: getAttr(utcTiming, 'schemeIdUri'),
                value: getAttr(utcTiming, 'value'),
            };
        }
        // ... (rest of DASH extractions) ...
        const metricsEls = findChildrenRecursive(serializedManifest, 'Metrics');
        metrics = metricsEls.map((m) => ({
            metrics: getAttr(m, 'metrics'),
            ranges: findChildrenRecursive(m, 'Range').map((r) => ({
                starttime: getAttr(r, 'starttime'),
                duration: getAttr(r, 'duration'),
            })),
            reporting: findChildrenRecursive(m, 'Reporting').map((r) => ({
                schemeIdUri: getAttr(r, 'schemeIdUri'),
                value: getAttr(r, 'value'),
            })),
        }));

        // ContentPopularityRate (New)
        popularityRates = (manifestIR.contentPopularityRates || []).map(
            (pr) => ({
                source: pr.source,
                description: pr.source_description,
                count: pr.rates.length,
            })
        );

        // Gather Ratings, Viewpoints, ExtendedBandwidth from AdaptationSets
        manifestIR.periods.forEach((p) => {
            subsets.push(...p.subsets);
            p.adaptationSets.forEach((as) => {
                if (as.ratings) ratings.push(...as.ratings);
                if (as.viewpoints) viewpoints.push(...as.viewpoints);
                as.representations.forEach((rep) => {
                    if (rep.extendedBandwidth)
                        extendedBandwidths.push(rep.extendedBandwidth);
                    if (rep.failoverContent)
                        failoverContents.push(rep.failoverContent);
                });
            });
        });

        // Service Description
        const sdEls = findChildrenRecursive(
            serializedManifest,
            'ServiceDescription'
        );
        serviceDescriptions = sdEls.map((sd) => {
            const latencies = findChildrenRecursive(sd, 'Latency').map((l) => ({
                target: getAttr(l, 'target'),
                min: getAttr(l, 'min'),
                max: getAttr(l, 'max'),
            }));
            // ... (Other SD fields)
            const playbackRates = findChildrenRecursive(sd, 'PlaybackRate').map(
                (p) => ({
                    min: getAttr(p, 'min'),
                    max: getAttr(p, 'max'),
                })
            );
            const opQuality = findChildrenRecursive(sd, 'OperatingQuality').map(
                (o) => ({
                    mediaType: getAttr(o, 'mediaType'),
                    min: getAttr(o, 'min'),
                    max: getAttr(o, 'max'),
                    target: getAttr(o, 'target'),
                })
            );
            const opBandwidth = findChildrenRecursive(
                sd,
                'OperatingBandwidth'
            ).map((o) => ({
                mediaType: getAttr(o, 'mediaType'),
                min: getAttr(o, 'min'),
                max: getAttr(o, 'max'),
                target: getAttr(o, 'target'),
            }));
            return {
                id: getAttr(sd, 'id'),
                latencies,
                playbackRates,
                operatingQuality: opQuality,
                operatingBandwidth: opBandwidth,
            };
        });
    }

    let sessionData = [];
    let variables = [];
    let steering = null;

    if (stream.protocol === 'hls') {
        const tags = manifestIR.tags || [];
        sessionData = tags
            .filter((t) => t.name === 'EXT-X-SESSION-DATA')
            .map((t) => ({
                id: t.value['DATA-ID'],
                value: t.value['VALUE'] || t.value['URI'],
            }));
        if (manifestIR.hlsDefinedVariables) {
            manifestIR.hlsDefinedVariables.forEach((val, key) => {
                variables.push({
                    name: key,
                    value: val.value,
                    source: val.source,
                });
            });
        }
        const steeringTag = tags.find(
            (t) => t.name === 'EXT-X-CONTENT-STEERING'
        );
        if (steeringTag) {
            steering = {
                serverUri: steeringTag.value['SERVER-URI'],
                pathwayId: steeringTag.value['PATHWAY-ID'],
            };
        }
    }

    // --- 1. Hero Data ---
    const hero = {
        title: stream.name,
        url: stream.originalUrl,
        protocol: summary.general.protocol,
        type: isLive ? 'LIVE' : 'VOD',
        typeClass: isLive
            ? 'bg-red-500/20 text-red-400 border-red-500/50'
            : 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        isEncrypted: summary.security.isEncrypted,
        encryptionType:
            summary.security.hlsEncryptionMethod ||
            (summary.security.systems.length > 0 ? 'CENC' : 'Clear'),
        drmSystems: summary.security.systems.map((s) => s.systemId),
        timingSource,
        sessionData,
        steering,
    };

    // --- 2. Quick Stats ---
    const stats = [
        {
            label: 'Total Duration',
            value: summary.general.duration
                ? `${summary.general.duration.toFixed(2)}s`
                : isLive
                  ? 'Unknown (Live)'
                  : 'N/A',
            icon: 'timer',
        },
        {
            label: 'Avg. Seg Duration',
            value: summary.hls?.mediaPlaylistDetails?.averageSegmentDuration
                ? `${summary.hls.mediaPlaylistDetails.averageSegmentDuration.toFixed(
                      2
                  )}s`
                : summary.dash?.maxSegmentDuration
                  ? `~${summary.dash.maxSegmentDuration.toFixed(2)}s`
                  : 'N/A',
            icon: 'clock',
        },
        {
            label: 'Total Variants',
            value: summary.content.totalVideoTracks,
            icon: 'layers',
        },
        {
            label: 'Audio Tracks',
            value: summary.content.totalAudioTracks,
            icon: 'audioLines',
        },
    ];

    // --- 3. Feature Detection (Pills) ---
    const features = [];
    const videoCodecs = new Set(
        summary.videoTracks.flatMap((t) => t.codecs.map((c) => c.value))
    );
    videoCodecs.forEach((c) => {
        let name = c.split('.')[0];
        if (name.includes('avc')) name = 'H.264 (AVC)';
        if (name.includes('hvc') || name.includes('hev')) name = 'H.265 (HEVC)';
        if (name.includes('vp9')) name = 'VP9';
        features.push({ label: name, type: 'video' });
    });

    const ranges = new Set(
        summary.videoTracks.map((t) => t.videoRange).filter(Boolean)
    );
    ranges.forEach((r) => features.push({ label: r, type: 'quality' }));

    const audioCodecs = new Set(
        summary.audioTracks.flatMap((t) => t.codecs.map((c) => c.value))
    );
    audioCodecs.forEach((c) => {
        let name = c.split('.')[0];
        if (name.includes('mp4a')) name = 'AAC';
        if (name.includes('ac-3')) name = 'Dolby Digital';
        if (name.includes('ec-3')) name = 'Dolby Digital+';
        features.push({ label: name, type: 'audio' });
    });

    if (summary.lowLatency?.isLowLatency)
        features.push({ label: 'Low Latency', type: 'tech' });
    if (
        summary.hls?.iFramePlaylists > 0 ||
        summary.videoTracks.some((t) =>
            t.roles.some((r) => r.value === 'trick')
        )
    ) {
        features.push({ label: 'Trick Play', type: 'tech' });
    }
    if (summary.content.totalTextTracks > 0)
        features.push({ label: 'Subtitles', type: 'text' });
    if (summary.general.segmenting)
        features.push({ label: summary.general.segmenting, type: 'tech' });

    // --- 4. Ladder Data for Chart ---
    const ladderPoints = summary.videoTracks
        .map((t) => ({
            bandwidth: t.bandwidth,
            width: t.resolutions[0]?.value.split('x')[0] || 0,
            height: t.resolutions[0]?.value.split('x')[1] || 0,
            codecs: t.codecs.map((c) => c.value).join(', '),
        }))
        .sort((a, b) => a.bandwidth - b.bandwidth);

    const deduplicatedFeatures = Array.from(
        new Set(features.map((f) => JSON.stringify(f)))
    ).map((s) => JSON.parse(s));

    // --- ARCHITECTURAL UPDATE: Map previously hidden properties ---
    // For Video Tracks: Map 'scanType' (DASH) and 'HDCP-LEVEL' (HLS via serialized manifest)
    // Note: HDCP-LEVEL is on the variant in HLS. Our summary.videoTracks comes from representation state.
    // We need to reach back to the IR source for HDCP if available.

    const enrichedVideoTracks = summary.videoTracks.map((track) => {
        // HLS Variant lookup for HDCP
        let hdcpLevel = null;
        if (stream.protocol === 'hls' && manifestIR.variants) {
            // Try to match variant by ID or bandwidth
            const variant = manifestIR.variants.find(
                (v) =>
                    v.stableId === track.id ||
                    v.attributes.BANDWIDTH === track.bandwidth
            );
            if (variant) {
                hdcpLevel = variant.attributes['HDCP-LEVEL'];
            }
        }

        return {
            ...track,
            hdcpLevel: hdcpLevel,
            // scanType is already on the track object from DASH parser, just ensure it passes through
        };
    });

    return {
        hero,
        stats,
        features: deduplicatedFeatures,
        ladderPoints,
        videoTracks: enrichedVideoTracks,
        audioTracks: summary.audioTracks,
        textTracks: summary.textTracks,
        advanced: {
            variables,
            metrics,
            serviceDescriptions,
            popularityRates,
            viewpoints,
            ratings,
            subsets,
            extendedBandwidths,
            failoverContents,
        },
        cmafData: {
            status: stream.semanticData?.get('cmafValidationStatus') || 'idle',
            results: stream.semanticData?.get('cmafValidation') || [],
        },
    };
}
