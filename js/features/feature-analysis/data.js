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
        desc: 'Defines if the stream is live (`dynamic`) or on-demand (`static`). This is the most fundamental property of a manifest.',
        isoRef: 'Clause 5.3.1.2',
    },
    {
        name: 'Multi-Period Content',
        category: 'Core Streaming',
        desc: 'The presentation is split into multiple, independent periods. Commonly used for Server-Side Ad Insertion (SSAI) or chaptering.',
        isoRef: 'Clause 5.3.2',
    },
    {
        name: 'Content Protection (DRM)',
        category: 'Core Streaming',
        desc: 'Indicates that the content is encrypted using one or more DRM schemes like Widevine, PlayReady, or FairPlay.',
        isoRef: 'Clause 5.8.4.1',
    },
    {
        name: 'CMAF Compatibility',
        category: 'Core Streaming',
        desc: 'Content is structured according to the Common Media Application Format (CMAF), enhancing compatibility across players.',
        isoRef: 'Clause 8.12',
    },
    {
        name: 'Segment Templates',
        category: 'Timeline & Segment Management',
        desc: 'Segment URLs are generated using a template, typically with $Number$ or $Time$ placeholders.',
        isoRef: 'Clause 5.3.9.4',
    },
    {
        name: 'Segment Timeline',
        category: 'Timeline & Segment Management',
        desc: 'Provides explicit timing and duration for each segment via <S> elements, allowing for variable segment sizes.',
        isoRef: 'Clause 5.3.9.6',
    },
    {
        name: 'Segment List',
        category: 'Timeline & Segment Management',
        desc: 'Segment URLs are listed explicitly in the manifest. Common for VOD content.',
        isoRef: 'Clause 5.3.9.3',
    },
    {
        name: 'Low Latency Streaming',
        category: 'Live & Dynamic',
        desc: 'The manifest includes features for low-latency playback, like chunked transfer hints and latency targets.',
        isoRef: 'Annex K.3.2',
    },
    {
        name: 'Manifest Patch Updates',
        category: 'Live & Dynamic',
        desc: 'Allows efficient manifest updates by sending only the changed parts of the manifest.',
        isoRef: 'Clause 5.15',
    },
    {
        name: 'UTC Timing Source',
        category: 'Live & Dynamic',
        desc: 'Provides a source for clients to synchronize their wall-clock time, crucial for live playback.',
        isoRef: 'Clause 5.8.4.11',
    },
    {
        name: 'Dependent Representations (SVC/MVC)',
        category: 'Advanced Content',
        desc: 'Uses Representations that depend on others for decoding, enabling scalable video coding (SVC) or multi-view coding (MVC).',
        isoRef: 'Clause 5.3.5.2',
    },
    {
        name: 'Trick Mode Tracks',
        category: 'Advanced Content',
        desc: 'Provides special, low-framerate or I-Frame only tracks to enable efficient fast-forward and rewind.',
        isoRef: 'Clause 5.3.6',
    },
    {
        name: 'Subtitles & Captions',
        category: 'Accessibility & Metadata',
        desc: 'Provides text-based tracks for subtitles, closed captions, or other timed text information.',
        isoRef: 'Clause 5.3.3',
    },
    {
        name: 'Role Descriptors',
        category: 'Accessibility & Metadata',
        desc: 'Uses <Role> descriptors to semantically describe the purpose of a track (e.g., main, alternate, commentary, dub).',
        isoRef: 'Clause 5.8.4.2',
    },
];