/**
 * @typedef {object} Feature
 * @property {string} name
 * @property {'Core Streaming' | 'Timeline & Segment Management' | 'Live & Dynamic' | 'Advanced Content' | 'Client Guidance & Optimization' | 'Accessibility & Metadata'} category
 * @property {string} desc
 * @property {string} isoRef
 */

/** @type {Feature[]} */
export const dashFeatureDefinitions = [
    {
        name: 'Presentation Type',
        category: 'Core Streaming',
        desc: 'Defines if the stream is live (`dynamic`) or on-demand (`static`).',
        isoRef: 'DASH: 5.3.1.2',
    },
    {
        name: 'Multi-Period',
        category: 'Core Streaming',
        desc: 'The presentation is split into multiple, independent periods. Commonly used for Server-Side Ad Insertion (SSAI).',
        isoRef: 'DASH: 5.3.2',
    },
    {
        name: 'Content Protection',
        category: 'Core Streaming',
        desc: 'Indicates that the content is encrypted using one or more schemes like CENC.',
        isoRef: 'DASH: 5.8.4.1',
    },
    {
        name: 'Segment Templates',
        category: 'Timeline & Segment Management',
        desc: 'Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders.',
        isoRef: 'DASH: 5.3.9.4',
    },
    {
        name: 'Segment Timeline',
        category: 'Timeline & Segment Management',
        desc: 'Provides explicit timing and duration for each segment via <S> elements, allowing for variable segment sizes.',
        isoRef: 'DASH: 5.3.9.6',
    },
    {
        name: 'Segment List',
        category: 'Timeline & Segment Management',
        desc: 'Segment URLs are listed explicitly in the manifest. Common for VOD content.',
        isoRef: 'DASH: 5.3.9.3',
    },
    {
        name: 'MPD Chaining',
        category: 'Timeline & Segment Management',
        desc: 'The manifest indicates that another MPD should be played after this one concludes, allowing for programmatic playlists of presentations.',
        isoRef: 'DASH: 5.11',
    },
    {
        name: 'Low Latency Streaming',
        category: 'Live & Dynamic',
        desc: 'The manifest includes features for low-latency playback, such as chunked transfer hints or specific service descriptions.',
        isoRef: 'DASH: Annex K.3.2',
    },
    {
        name: 'Manifest Patch Updates',
        category: 'Live & Dynamic',
        desc: 'Allows efficient manifest updates by sending only the changed parts of the manifest.',
        isoRef: 'DASH: 5.15',
    },
    {
        name: 'MPD Events',
        category: 'Live & Dynamic',
        desc: 'The manifest contains one or more <EventStream> elements, allowing timed metadata to be communicated to the client via the MPD.',
        isoRef: 'DASH: 5.10.2',
    },
    {
        name: 'Inband Events',
        category: 'Live & Dynamic',
        desc: 'The manifest signals that event messages ("emsg" boxes) are present within the media segments themselves, allowing for tightly synchronized metadata.',
        isoRef: 'DASH: 5.10.3',
    },
    {
        name: 'Producer Reference Time',
        category: 'Live & Dynamic',
        desc: 'Provides a mapping between media timestamps and a wall-clock production time, enabling latency measurement and control.',
        isoRef: 'DASH: 5.12',
    },
    {
        name: 'UTC Timing Source',
        category: 'Live & Dynamic',
        desc: 'Provides a source for clients to synchronize their wall-clock time, crucial for live playback.',
        isoRef: 'DASH: 5.8.4.11',
    },
    {
        name: 'Dependent Representations',
        category: 'Advanced Content',
        desc: 'Uses Representations that depend on others for decoding, enabling scalable video coding (SVC) or multi-view coding (MVC).',
        isoRef: 'DASH: 5.3.5.2',
    },
    {
        name: 'Trick Modes',
        category: 'Advanced Content',
        desc: 'Provides special tracks (e.g. I-Frame only) to enable efficient fast-forward and rewind.',
        isoRef: 'DASH: 5.3.6',
    },
    {
        name: 'Service Description',
        category: 'Client Guidance & Optimization',
        desc: 'Provides guidance to the client on latency targets, playback rates, and quality/bandwidth constraints for the service.',
        isoRef: 'DASH: Annex K',
    },
    {
        name: 'Role Descriptors',
        category: 'Accessibility & Metadata',
        desc: 'Uses Role Descriptors to provide alternative tracks for language, commentary, or camera angles.',
        isoRef: 'DASH: 5.8.4.2',
    },
    {
        name: 'Subtitles & Captions',
        category: 'Accessibility & Metadata',
        desc: 'Provides text-based tracks for subtitles, closed captions, or other timed text information.',
        isoRef: 'DASH: 5.3.3',
    },
];

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
        name: 'I-Frame Playlists',
        category: 'Advanced Content',
        desc: 'Provides special, I-Frame only playlists to enable efficient fast-forward and rewind.',
        isoRef: 'HLS: 4.3.4.3',
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