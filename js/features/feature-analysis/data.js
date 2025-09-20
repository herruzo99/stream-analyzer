/**
 * @typedef {object} Feature
 * @property {string} name
 * @property {'Core Streaming' | 'Timeline & Segment Management' | 'Live & Dynamic' | 'Advanced Content' | 'Client Guidance & Optimization' | 'Accessibility & Metadata'} category
 * @property {string} desc
 * @property {string} isoRef
 */

/** @type {Feature[]} */
export const featureDefinitions = [
    {
        name: 'Presentation Type',
        category: 'Core Streaming',
        desc: 'Defines if the stream is live (`dynamic`/`EVENT`) or on-demand (`static`/`VOD`).',
        isoRef: 'DASH: 5.3.1.2 / HLS: 4.3.3.5',
    },
    {
        name: 'Master Playlist (HLS)',
        category: 'Core Streaming',
        desc: 'The manifest is an HLS master playlist that references multiple variant streams at different bitrates.',
        isoRef: 'HLS: 4.3.4.2',
    },
    {
        name: 'Multi-Period (DASH) / Discontinuity (HLS)',
        category: 'Core Streaming',
        desc: 'The presentation is split into multiple, independent periods (DASH) or contains discontinuity tags (HLS). Commonly used for Server-Side Ad Insertion (SSAI).',
        isoRef: 'DASH: 5.3.2 / HLS: 4.3.2.3',
    },
    {
        name: 'Content Protection',
        category: 'Core Streaming',
        desc: 'Indicates that the content is encrypted using one or more schemes like CENC (DASH) or AES-128/SAMPLE-AES (HLS).',
        isoRef: 'DASH: 5.8.4.1 / HLS: 4.3.2.4',
    },
    {
        name: 'Fragmented MP4 Segments',
        category: 'Core Streaming',
        desc: 'Content is structured using fMP4 segments instead of MPEG-2 Transport Stream (TS). Indicated by #EXT-X-MAP in HLS.',
        isoRef: 'HLS: 4.3.2.5',
    },
    {
        name: 'Segment Templates (DASH)',
        category: 'Timeline & Segment Management',
        desc: 'Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders. (DASH-specific).',
        isoRef: 'DASH: 5.3.9.4',
    },
    {
        name: 'Segment Timeline (DASH)',
        category: 'Timeline & Segment Management',
        desc: 'Provides explicit timing and duration for each segment via <S> elements, allowing for variable segment sizes. (DASH-specific).',
        isoRef: 'DASH: 5.3.9.6',
    },
    {
        name: 'Segment List (DASH)',
        category: 'Timeline & Segment Management',
        desc: 'Segment URLs are listed explicitly in the manifest. Common for VOD content. (DASH-specific).',
        isoRef: 'DASH: 5.3.9.3',
    },
    {
        name: 'Low Latency Streaming',
        category: 'Live & Dynamic',
        desc: 'The manifest includes features for low-latency playback. HLS low-latency is a separate specification from the DASH features shown here.',
        isoRef: 'DASH: Annex K.3.2',
    },
    {
        name: 'Manifest Patch Updates (DASH)',
        category: 'Live & Dynamic',
        desc: 'Allows efficient manifest updates by sending only the changed parts of the manifest. (DASH-specific).',
        isoRef: 'DASH: 5.15',
    },
    {
        name: 'Date Ranges / Timed Metadata',
        category: 'Live & Dynamic',
        desc: 'The manifest includes timed metadata, such as HLS #EXT-X-DATERANGE, typically used for ad insertion signaling (SCTE-35).',
        isoRef: 'HLS: 4.3.2.7',
    },
    {
        name: 'UTC Timing Source (DASH)',
        category: 'Live & Dynamic',
        desc: 'Provides a source for clients to synchronize their wall-clock time, crucial for live playback. (DASH-specific).',
        isoRef: 'DASH: 5.8.4.11',
    },
    {
        name: 'Dependent Representations (DASH)',
        category: 'Advanced Content',
        desc: 'Uses Representations that depend on others for decoding, enabling scalable video coding (SVC) or multi-view coding (MVC). (DASH-specific).',
        isoRef: 'DASH: 5.3.5.2',
    },
    {
        name: 'I-Frame Playlists / Trick Modes',
        category: 'Advanced Content',
        desc: 'Provides special, I-Frame only playlists or tracks to enable efficient fast-forward and rewind.',
        isoRef: 'DASH: 5.3.6 / HLS: 4.3.4.3',
    },
    {
        name: 'Alternative Renditions / Roles',
        category: 'Accessibility & Metadata',
        desc: 'Uses #EXT-X-MEDIA (HLS) or Role Descriptors (DASH) to provide alternative tracks for language, commentary, or camera angles.',
        isoRef: 'DASH: 5.8.4.2 / HLS: 4.3.4.1',
    },
    {
        name: 'Subtitles & Captions',
        category: 'Accessibility & Metadata',
        desc: 'Provides text-based tracks for subtitles, closed captions, or other timed text information.',
        isoRef: 'DASH: 5.3.3 / HLS: 4.3.4.1',
    },
];