import * as icons from '@/ui/icons';

/**
 * @typedef {Object} TestableProperty
 * @property {string} path - The internal dot-notation path.
 * @property {string} label - Human readable label.
 * @property {'number' | 'string' | 'boolean'} type - Data type.
 * @property {string} category - Grouping category.
 * @property {string} [unit] - Unit suffix.
 * @property {string} [icon] - Icon name.
 * @property {string[]} [keywords] - For search filtering.
 */

export const PROPERTY_CATEGORIES = {
    general: {
        label: 'General & Manifest',
        color: 'text-slate-300',
        bg: 'bg-slate-500/10',
        icon: icons.fileText,
    },
    video: {
        label: 'Video Track',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        icon: icons.clapperboard,
    },
    audio: {
        label: 'Audio Track',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        icon: icons.audioLines,
    },
    security: {
        label: 'DRM & Security',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        icon: icons.lockClosed,
    },
    timing: {
        label: 'Timing & Latency',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        icon: icons.timer,
    },
    network: {
        label: 'Network Health',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        icon: icons.network,
    },
};

/** @type {TestableProperty[]} */
export const TESTABLE_PROPERTIES = [
    // --- General ---
    {
        path: 'manifest.type',
        label: 'Stream Type',
        type: 'string',
        category: 'general',
        icon: 'server',
        keywords: ['live', 'vod', 'static', 'dynamic'],
    },
    {
        path: 'stream.protocol',
        label: 'Protocol',
        type: 'string',
        category: 'general',
        icon: 'link',
        keywords: ['dash', 'hls'],
    },
    {
        path: 'summary.content.totalPeriods',
        label: 'Period Count',
        type: 'number',
        category: 'general',
        icon: 'layers',
    },
    {
        path: 'summary.content.representationCount',
        label: 'Total Representations',
        type: 'number',
        category: 'general',
        icon: 'list',
    },
    {
        path: 'stream.name',
        label: 'Stream Name',
        type: 'string',
        category: 'general',
        icon: 'tag',
    },

    // --- Video ---
    {
        path: 'summary.content.totalVideoTracks',
        label: 'Video Track Count',
        type: 'number',
        category: 'video',
        icon: 'clapperboard',
    },
    {
        path: 'summary.videoTracks.0.codecs.0.value',
        label: 'Primary Video Codec',
        type: 'string',
        category: 'video',
        icon: 'cpu',
        keywords: ['avc', 'hevc', 'av1'],
    },
    {
        path: 'summary.videoTracks.0.bandwidth',
        label: 'Lowest Bitrate',
        type: 'number',
        unit: 'bps',
        category: 'video',
        icon: 'trendingDown',
    },
    {
        path: 'summary.videoTracks.length',
        label: 'Rendition Count',
        type: 'number',
        category: 'video',
        icon: 'list',
    },
    {
        path: 'summary.videoTracks.0.width.value',
        label: 'Min Width',
        type: 'number',
        unit: 'px',
        category: 'video',
        icon: 'maximize',
    },
    {
        path: 'summary.videoTracks.0.height.value',
        label: 'Min Height',
        type: 'number',
        unit: 'px',
        category: 'video',
        icon: 'maximize',
    },

    // --- Audio ---
    {
        path: 'summary.content.totalAudioTracks',
        label: 'Audio Track Count',
        type: 'number',
        category: 'audio',
        icon: 'audioLines',
    },
    {
        path: 'summary.audioTracks.0.lang',
        label: 'Primary Language',
        type: 'string',
        category: 'audio',
        icon: 'users',
    },
    {
        path: 'summary.audioTracks.0.codecs.0.value',
        label: 'Audio Codec',
        type: 'string',
        category: 'audio',
        icon: 'cpu',
    },
    {
        path: 'summary.audioTracks.0.channels',
        label: 'Channels',
        type: 'string',
        category: 'audio',
        icon: 'volumeUp',
    },

    // --- Security ---
    {
        path: 'security.isEncrypted',
        label: 'Is Encrypted',
        type: 'boolean',
        category: 'security',
        icon: 'lockClosed',
    },
    {
        path: 'security.systems.length',
        label: 'DRM System Count',
        type: 'number',
        category: 'security',
        icon: 'shieldCheck',
    },
    {
        path: 'security.licenseServerUrls.length',
        label: 'License URL Count',
        type: 'number',
        category: 'security',
        icon: 'link',
    },

    // --- Timing ---
    {
        path: 'manifest.duration',
        label: 'Total Duration',
        type: 'number',
        unit: 's',
        category: 'timing',
        icon: 'clock',
    },
    {
        path: 'summary.hls.targetDuration',
        label: 'Target Duration (HLS)',
        type: 'number',
        unit: 's',
        category: 'timing',
        icon: 'target',
    },
    {
        path: 'summary.dash.minBufferTime',
        label: 'Min Buffer Time',
        type: 'number',
        unit: 's',
        category: 'timing',
        icon: 'buffer',
    },
    {
        path: 'summary.lowLatency.isLowLatency',
        label: 'Low Latency Mode',
        type: 'boolean',
        category: 'timing',
        icon: 'zap',
    },
    {
        path: 'summary.hls.dvrWindow',
        label: 'DVR Window',
        type: 'number',
        unit: 's',
        category: 'timing',
        icon: 'history',
    },

    // --- Network (Synthesized) ---
    {
        path: 'stream.manifestUpdates.length',
        label: 'Update Count',
        type: 'number',
        category: 'network',
        icon: 'refresh',
    },
];

export const OPERATORS_BY_TYPE = {
    string: [
        { value: 'equals', label: 'is exactly' },
        { value: 'notEquals', label: 'is not' },
        { value: 'includes', label: 'contains' },
        { value: 'exists', label: 'exists' },
    ],
    number: [
        { value: 'gt', label: 'greater than (>)' },
        { value: 'lt', label: 'less than (<)' },
        { value: 'equals', label: 'equals (=)' },
        { value: 'gte', label: 'at least (>=)' },
        { value: 'lte', label: 'at most (<=)' },
    ],
    boolean: [{ value: 'equals', label: 'is' }],
};