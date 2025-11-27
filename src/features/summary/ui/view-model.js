/**
 * Prepares data for the reimagined summary dashboard.
 * @param {import('@/types').Stream} stream
 */
export function createSummaryViewModel(stream) {
    const summary = stream.manifest.summary;
    const isLive = stream.manifest.type === 'dynamic';

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
        drmSystems: summary.security.systems.map((s) => s.systemId), // Names resolved in UI
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
                ? `${summary.hls.mediaPlaylistDetails.averageSegmentDuration.toFixed(2)}s`
                : summary.dash?.maxSegmentDuration
                  ? `~${summary.dash.maxSegmentDuration}s`
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

    // Video Codecs
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

    // HDR / Video Range
    const ranges = new Set(
        summary.videoTracks.map((t) => t.videoRange).filter(Boolean)
    );
    ranges.forEach((r) => features.push({ label: r, type: 'quality' }));

    // Audio Codecs
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

    // Capabilities
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
    // Sort by bandwidth for chart
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

    return {
        hero,
        stats,
        features: deduplicatedFeatures,
        ladderPoints,
        videoTracks: summary.videoTracks,
        audioTracks: summary.audioTracks,
        textTracks: summary.textTracks,
    };
}
