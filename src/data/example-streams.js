/**
 * A curated list of public DASH & HLS streams for testing and demonstration purposes.
 * Verified as of late 2025.
 * @typedef {'dash' | 'hls'} Protocol
 * @typedef {'vod' | 'live'} StreamType
 * @typedef {object} ExampleStream
 * @property {string} name - A descriptive name for the stream.
 * @property {string} url - The manifest URL.
 * @property {Protocol} protocol - The streaming protocol.
 * @property {StreamType} type - The stream type (VOD or Live).
 * @property {string} source - The provider of the stream.
 * @property {string} category - A sub-category for better organization.
 */

/** @type {ExampleStream[]} */
export const exampleStreams = [
    // --- DASH VOD ---
    {
        name: 'Big Buck Bunny (4K, VOD)',
        url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'DASH-IF',
        category: 'Basic VOD',
    },
    {
        name: 'Art of Motion (WEBM, VP9)',
        url: 'https://storage.googleapis.com/shaka-demo-assets/art-of-motion-vp9/mpd.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'Shaka Player',
        category: 'Basic VOD',
    },
    {
        name: 'Sintel (Multi-period)',
        url: 'https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'Shaka Player',
        category: 'Advanced VOD',
    },
    {
        name: 'Multi-key Widevine/PlayReady DRM',
        url: 'https://media.axprod.net/TestVectors/v7-MultiDRM-MultiKey/Manifest.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'Axinom',
        category: 'DRM',
    },
    {
        name: 'AC-4 Immersive Audio',
        url: 'https://dash.dolby.com/Content/AC4_Com_A_IMD/stream.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'Dolby',
        category: 'Advanced VOD',
    },

    // --- DASH Live ---
    {
        name: 'Live Simulation (SegmentTemplate)',
        url: 'https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'DASH-IF',
        category: 'Live',
    },
    {
        name: 'Live Simulation (SegmentTimeline)',
        url: 'https://livesim.dashif.org/livesim/segtimeline_1/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'DASH-IF',
        category: 'Live',
    },
    {
        name: 'Low-Latency (Chunked CMAF)',
        url: 'https://livesim.dashif.org/livesim-chunked/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'DASH-IF',
        category: 'Low-Latency',
    },
    {
        name: 'SCTE-35 Events',
        url: 'https://livesim.dashif.org/livesim/scte35_2/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'DASH-IF',
        category: 'Ad Insertion',
    },
    {
        name: 'Live w/ Ad Breaks (AWS)',
        url: 'https://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_wide/master.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'AWS',
        category: 'Ad Insertion',
    },

    // --- HLS VOD ---
    {
        name: 'Big Buck Bunny (fMP4)',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Mux',
        category: 'Basic VOD',
    },
    {
        name: 'Bip-Bop (HEVC + AVC)',
        url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Apple',
        category: 'Basic VOD',
    },
    {
        name: 'Multiple Audio & Subtitle Tracks',
        url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Shaka Player',
        category: 'Advanced VOD',
    },
    {
        name: 'FairPlay DRM (fMP4)',
        url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-fairplay/hls.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Shaka Player',
        category: 'DRM',
    },
    {
        name: 'AES-128 Encrypted (TS)',
        url: 'https://playertest.longtailvideo.com/adaptive/oceans_aes/oceans_aes.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'JW Player',
        category: 'DRM',
    },

    // --- HLS Live ---
    {
        name: 'Low-Latency HLS (LL-HLS)',
        url: 'https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8',
        protocol: 'hls',
        type: 'live',
        source: 'Mux',
        category: 'Low-Latency',
    },
    {
        name: 'Tears of Steel (Live)',
        url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        protocol: 'hls',
        type: 'live',
        source: 'Unified Streaming',
        category: 'Live',
    },
    {
        name: 'Live w/ DATERANGE & SCTE-35',
        url: 'https://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_wide/master.m3u8',
        protocol: 'hls',
        type: 'live',
        source: 'AWS',
        category: 'Ad Insertion',
    },
    {
        name: 'Content Steering',
        url: 'https://demo.unified-streaming.com/k8s/live/stable/scte35.isml/.m3u8?hls.content_steering=https://demo.unified-streaming.com/k8s/steering/master.json',
        protocol: 'hls',
        type: 'live',
        source: 'Unified Streaming',
        category: 'Advanced Live',
    },
];