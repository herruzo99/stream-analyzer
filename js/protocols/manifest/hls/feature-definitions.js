/**
 * @typedef {import('../dash/feature-definitions.js').Feature} Feature
 */

/** @type {Feature[]} */
export const hlsFeatureDefinitions = [
    {
        name: 'Presentation Type',
        category: 'Core Streaming',
        desc: 'Defines if the stream is live (`EVENT`) or on-demand (`VOD`).',
        isoRef: 'HLS: 4.3.3.5',
    },
    {
        name: 'Master Playlist',
        category: 'Core Streaming',
        desc: 'The manifest is an HLS master playlist that references multiple variant streams at different bitrates.',
        isoRef: 'HLS: 4.3.4.2',
    },
    {
        name: 'Discontinuity',
        category: 'Core Streaming',
        desc: 'The presentation contains discontinuity tags, commonly used for Server-Side Ad Insertion (SSAI).',
        isoRef: 'HLS: 4.3.2.3',
    },
    {
        name: 'Content Protection',
        category: 'Core Streaming',
        desc: 'Indicates that the content is encrypted using AES-128 or SAMPLE-AES.',
        isoRef: 'HLS: 4.3.2.4',
    },
    {
        name: 'Session Keys',
        category: 'Core Streaming',
        desc: 'Allows encryption keys to be specified in the Master Playlist via #EXT-X-SESSION-KEY, enabling clients to preload keys for faster startup.',
        isoRef: 'HLS: 4.3.4.5',
    },
    {
        name: 'Fragmented MP4 Segments',
        category: 'Core Streaming',
        desc: 'Content is structured using fMP4 segments instead of MPEG-2 Transport Stream (TS), indicated by #EXT-X-MAP.',
        isoRef: 'HLS: 4.3.2.5',
    },
    {
        name: 'Independent Segments',
        category: 'Timeline & Segment Management',
        desc: 'The playlist uses #EXT-X-INDEPENDENT-SEGMENTS, indicating that all media samples in a segment can be decoded without information from other segments.',
        isoRef: 'HLS: 4.3.5.1',
    },
    {
        name: 'Date Ranges / Timed Metadata',
        category: 'Live & Dynamic',
        desc: 'The manifest includes timed metadata via #EXT-X-DATERANGE, typically used for ad insertion signaling (SCTE-35).',
        isoRef: 'HLS: 4.3.2.7',
    },
    {
        name: 'Low-Latency HLS',
        category: 'Live & Dynamic',
        desc: 'Uses modern HLS features for reduced latency, such as Partial Segments (EXT-X-PART), Preload Hinting (EXT-X-PRELOAD-HINT), and Server Control.',
        isoRef: 'HLS 2nd Ed: 4.4.3.7, 4.4.3.8, 4.4.4.9, 4.4.5.3',
    },
    {
        name: 'Playlist Delta Updates',
        category: 'Live & Dynamic',
        desc: 'The server can provide partial playlist updates using the #EXT-X-SKIP tag, reducing download size for live streams.',
        isoRef: 'HLS 2nd Ed: 4.4.5.2, 6.2.5.1',
    },
    {
        name: 'Variable Substitution',
        category: 'Live & Dynamic',
        desc: 'Uses #EXT-X-DEFINE to create playlist variables, allowing for dynamic generation of URIs and attributes.',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    {
        name: 'Content Steering',
        category: 'Live & Dynamic',
        desc: 'Provides a mechanism for servers to steer clients to alternate servers for redundancy and load balancing.',
        isoRef: 'HLS 2nd Ed: 4.4.6.6',
    },
    {
        name: 'I-Frame Playlists',
        category: 'Advanced Content',
        desc: 'Provides special, I-Frame only playlists to enable efficient fast-forward and rewind.',
        isoRef: 'HLS: 4.3.4.3',
    },
    {
        name: 'Advanced Metadata & Rendition Selection',
        category: 'Advanced Content',
        desc: 'Utilizes advanced attributes (e.g., SCORE, VIDEO-RANGE, STABLE-VARIANT-ID) and semantic tags (e.g., Interstitials) to provide richer context for client ABR and UI logic.',
        isoRef: 'HLS 2nd Ed: Appendices D, G',
    },
    {
        name: 'Session Data',
        category: 'Client Guidance & Optimization',
        desc: 'The master playlist carries arbitrary session data using #EXT-X-SESSION-DATA, which can be used for things like analytics or custom configuration.',
        isoRef: 'HLS: 4.3.4.4',
    },
    {
        name: 'Start Offset',
        category: 'Client Guidance & Optimization',
        desc: 'The playlist uses #EXT-X-START to indicate a preferred starting point, for example to start playback closer to the live edge.',
        isoRef: 'HLS: 4.3.5.2',
    },
    {
        name: 'Alternative Renditions',
        category: 'Accessibility & Metadata',
        desc: 'Uses #EXT-X-MEDIA to provide alternative tracks for language, commentary, or camera angles.',
        isoRef: 'HLS: 4.3.4.1',
    },
    {
        name: 'Subtitles & Captions',
        category: 'Accessibility & Metadata',
        desc: 'Provides text-based tracks for subtitles or closed captions via #EXT-X-MEDIA.',
        isoRef: 'HLS: 4.3.4.1',
    },
];
