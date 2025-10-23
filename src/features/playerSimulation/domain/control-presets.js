/**
 * Defines preset configurations for ABR strategy, offering simplified user choices
 * that map to complex underlying technical parameters.
 */
export const ABR_STRATEGY_PRESETS = [
    {
        id: 'balanced',
        label: 'Balanced (Default)',
        description: 'Standard Shaka Player defaults. Good for most scenarios.',
        config: {
            bandwidthUpgradeTarget: 0.85,
            bandwidthDowngradeTarget: 0.95,
        },
    },
    {
        id: 'aggressive',
        label: 'Quality First (Aggressive)',
        description: 'Upgrades quality quickly, holds onto high quality longer. Higher risk of rebuffering.',
        config: {
            bandwidthUpgradeTarget: 0.7,
            bandwidthDowngradeTarget: 0.7,
        },
    },
    {
        id: 'conservative',
        label: 'Stability First (Conservative)',
        description: 'Requires significant bandwidth headroom to upgrade, downgrades quickly to avoid stalls.',
        config: {
            bandwidthUpgradeTarget: 0.95,
            bandwidthDowngradeTarget: 0.98,
        },
    },
];

/**
 * Defines preset configurations for Buffering, catering to different network environments.
 */
export const BUFFERING_PRESETS = [
    {
        id: 'standard',
        label: 'Standard (Default)',
        description: 'Balanced settings suitable for typical VOD and live streams.',
        config: {
            rebufferingGoal: 2,
            bufferingGoal: 10,
            bufferBehind: 30,
        },
    },
    {
        id: 'low-latency',
        label: 'Low Latency',
        description: 'Smaller buffers to stay closer to the live edge. Higher risk of stalls on unstable networks.',
        config: {
            rebufferingGoal: 0.5,
            bufferingGoal: 3,
            bufferBehind: 10,
        },
    },
    {
        id: 'stable',
        label: 'High Stability (Travel)',
        description: 'Large buffers to survive network drops (e.g., tunnels). Increases start-up time and latency.',
        config: {
            rebufferingGoal: 5,
            bufferingGoal: 30,
            bufferBehind: 60,
        },
    },
];

/**
 * Defines preset configurations for Resolution Restrictions.
 */
export const RESOLUTION_PRESETS = [
    {
        id: 'unlimited',
        label: 'Unlimited (Auto)',
        description: 'Use all available qualities based on bandwidth.',
        config: {
            maxWidth: Infinity,
            maxHeight: Infinity,
        },
    },
    {
        id: '1080p',
        label: 'Full HD (1080p Max)',
        description: 'Cap quality at 1080p (1920x1080).',
        config: {
            maxWidth: 1920,
            maxHeight: 1080,
        },
    },
    {
        id: '720p',
        label: 'HD (720p Max)',
        description: 'Cap quality at 720p (1280x720). Good for data saving.',
        config: {
            maxWidth: 1280,
            maxHeight: 720,
        },
    },
    {
        id: '480p',
        label: 'SD (480p Max)',
        description: 'Cap quality at 480p (854x480). Low bandwidth usage.',
        config: {
            maxWidth: 854,
            maxHeight: 480,
        },
    },
];