/**
 * A curated list of public DASH & HLS streams for testing and demonstration purposes.
 * @typedef {'dash' | 'hls'} Protocol
 * @typedef {'vod' | 'live'} StreamType
 * @typedef {object} ExampleStream
 * @property {string} name
 * @property {string} url
 * @property {Protocol} protocol
 * @property {StreamType} type
 * @property {string} source - The original source of the stream.
 */

/** @type {ExampleStream[]} */
export const exampleStreams = [
    // --- DASH VOD (Source: dashif.org) ---
    {
        name: '[DASH-IF] Big Buck Bunny, onDemand',
        url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'dashif.org',
    },
    {
        name: '[DASH-IF] SegmentBase, onDemand',
        url: 'https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'dashif.org',
    },
    {
        name: '[DASH-IF] Multi-period, 2 periods',
        url: 'https://dash.akamaized.net/dash264/TestCases/5a/nomor/1.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'dashif.org',
    },
    {
        name: '[DASH-IF] Envivio, SegmentTemplate/Number',
        url: 'https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'dashif.org',
    },
    {
        name: '[Axinom] H.264, CMAF, Clear',
        url: 'https://media.axprod.net/TestVectors/v7-Clear/Manifest.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'Axinom',
    },
    {
        name: '[Axinom] Multi-key, Widevine/PlayReady DRM',
        url: 'https://media.axprod.net/TestVectors/v7-MultiDRM-MultiKey/Manifest.mpd',
        protocol: 'dash',
        type: 'vod',
        source: 'Axinom',
    },
    // --- DASH Live (Source: dashif.org) ---
    {
        name: '[DASH-IF] Live Sim (SegmentTemplate)',
        url: 'https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'dashif.org',
    },
    {
        name: '[DASH-IF] Live Sim (SegmentTimeline)',
        url: 'https://livesim.dashif.org/livesim/segtimeline_1/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'dashif.org',
    },
    {
        name: '[DASH-IF] Live Sim (SCTE-35 Events)',
        url: 'https://livesim.dashif.org/livesim/scte35_2/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'dashif.org',
    },
    {
        name: '[DASH-IF] Live Sim (Low-Latency Chunked)',
        url: 'https://livesim.dashif.org/livesim-chunked/testpic_2s/Manifest.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'dashif.org',
    },
    {
        name: '[AWS] Live w/ Ad Breaks',
        url: 'https://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_wide/master.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'AWS',
    },
    {
        name: '[Unified Streaming] Live w/ SCTE-35 markers',
        url: 'https://demo.unified-streaming.com/k8s/live/scte35.isml/.mpd',
        protocol: 'dash',
        type: 'live',
        source: 'Unified Streaming',
    },

    // --- HLS VOD ---
    {
        name: '[HLS.js] Big Buck Bunny, Adaptive',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[HLS.js] Big Buck Bunny, 480p',
        url: 'https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_hq_7.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[HLS.js] fMP4, Multiple Audio Tracks',
        url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[HLS.js] AES-128 Encrypted',
        url: 'https://playertest.longtailvideo.com/adaptive/oceans_aes/oceans_aes.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[HLS.js] AES-128 Encrypted, TS main with AAC',
        url: 'https://playertest.longtailvideo.com/adaptive/aes-with-tracks/master.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[HLS.js] Ad-insertion in Event Stream',
        url: 'https://test-streams.mux.dev/dai-discontinuity-deltatre/manifest.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[HLS.js] Subtitles/Captions',
        url: 'https://playertest.longtailvideo.com/adaptive/captions/playlist.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[HLS.js] ARTE China, ABR',
        url: 'https://test-streams.mux.dev/test_001/stream.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[HLS.js] MP3 VOD',
        url: 'https://playertest.longtailvideo.com/adaptive/vod-with-mp3/manifest.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[HLS.js] DK Turntable, PTS shifted',
        url: 'https://test-streams.mux.dev/pts_shift/master.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'hls.js',
    },
    {
        name: '[Apple] Bip-Bop, Advanced HEVC+AVC',
        url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Apple',
    },
    {
        name: '[JW Player] FDR, CDN packaged',
        url: 'https://cdn.jwplayer.com/manifests/pZxWPRg4.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'JW Player',
    },
    {
        name: '[Bitmovin] fMP4',
        url: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s-fmp4/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Bitmovin',
    },
    {
        name: '[Shaka] Angel One, Widevine DRM (fMP4)',
        url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine-hls/hls.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Shaka',
    },
    {
        name: "[Wowza] Elephant's Dream, Alt Audio + VTT",
        url: 'https://playertest.longtailvideo.com/adaptive/elephants_dream_v4/index.m3u8',
        protocol: 'hls',
        type: 'vod',
        source: 'Wowza',
    },

    // --- HLS Live ---
    {
        name: '[Mux] Low-Latency HLS (fMP4)',
        url: 'https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8',
        protocol: 'hls',
        type: 'live',
        source: 'Mux',
    },
    {
        name: '[Unified Streaming] Tears of Steel',
        url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        protocol: 'hls',
        type: 'live',
        source: 'Unified Streaming',
    },
];
