export const ANALYSIS_LAYERS = {
    // --- Core Metrics (Continuous Measurement) ---
    METRIC_LUMA: {
        id: 'metric_luma',
        label: 'Luma / Brightness',
        description: 'Measure average luminance levels per frame.',
        default: true,
        cost: 'Low',
        speed: 'Fast',
        category: 'Metrics',
    },
    METRIC_SHARPNESS: {
        id: 'metric_sharpness',
        label: 'Sharpness (SI)',
        description: 'Calculate Spatial Information (edge energy).',
        default: false,
        cost: 'Medium',
        speed: 'Fast',
        category: 'Metrics',
    },
    METRIC_MOTION: {
        id: 'metric_motion',
        label: 'Motion (TI)',
        description: 'Calculate Temporal Information (frame difference).',
        default: true,
        cost: 'Low',
        speed: 'Fast',
        category: 'Metrics',
    },
    METRIC_AUDIO_LEVEL: {
        id: 'metric_audio_level',
        label: 'Audio Levels',
        description: 'Measure RMS and Peak dB levels. (Requires Playback)',
        default: true,
        cost: 'High',
        speed: 'Slow', // Marked as Slow
        category: 'Metrics',
    },

    // --- Anomaly Detection (Threshold Based) ---
    BLACK_FRAME: {
        id: 'black_frame',
        label: 'Black Screen Detection',
        description: 'Flag frames where luma is near zero.',
        default: false,
        cost: 'Low',
        speed: 'Fast',
        category: 'Anomalies',
    },
    FREEZE: {
        id: 'freeze',
        label: 'Freeze Frame',
        description: 'Flag static video (requires Motion metric).',
        default: false,
        cost: 'Low',
        speed: 'Fast',
        requiresSequential: true,
        category: 'Anomalies',
    },
    SILENCE: {
        id: 'silence',
        label: 'Audio Silence',
        description: 'Flag audio drops below -60dB.',
        default: false,
        cost: 'High',
        speed: 'Slow', // Marked as Slow
        category: 'Anomalies',
    },
    AUDIO_CLIPPING: {
        id: 'audio_clipping',
        label: 'Audio Clipping',
        description: 'Flag audio peaks hitting 0dB.',
        default: false,
        cost: 'High',
        speed: 'Slow', // Marked as Slow
        category: 'Anomalies',
    },
    AUDIO_PHASE: {
        id: 'phase_check',
        label: 'Audio Phase',
        description: 'Detect anti-phase issues.',
        default: false,
        cost: 'High',
        speed: 'Slow', // Marked as Slow
        category: 'Anomalies',
    },
    BROADCAST_SAFE: {
        id: 'broadcast_safe',
        label: 'Broadcast Legality',
        description: 'Check 16-235 limits and chroma bounds.',
        default: false,
        cost: 'Medium',
        speed: 'Moderate',
        category: 'Anomalies',
    },
    CONTRAST: {
        id: 'contrast_monitor',
        label: 'Contrast / Flat',
        description: 'Detect washed out or low dynamic range.',
        default: false,
        cost: 'Medium',
        speed: 'Moderate',
        category: 'Anomalies',
    },
    LETTERBOX: {
        id: 'letterbox',
        label: 'Active Picture Area',
        description: 'Detect black bars (letterbox/pillarbox).',
        default: false,
        cost: 'High',
        speed: 'Moderate',
        category: 'Anomalies',
    },
    ARTIFACTS: {
        id: 'artifacts',
        label: 'Blockiness',
        description: 'Detect compression artifacts (macroblocking).',
        default: false,
        cost: 'High',
        speed: 'Moderate',
        category: 'Anomalies',
    },
    BANDING: {
        id: 'banding',
        label: 'Banding',
        description: 'Detect color banding in gradients.',
        default: false,
        cost: 'High',
        speed: 'Moderate',
        category: 'Anomalies',
    },
    METRIC_PREDICTED_QUALITY: {
        id: 'metric_predicted_quality',
        label: 'Predicted Quality (VMAF Proxy)',
        description: 'Estimate perceptual quality (0-100) based on artifacts.',
        default: true,
        cost: 'Low', // It's just a calculation from other metrics
        speed: 'Fast',
        category: 'Metrics',
    },
};

export const LAYER_PRESETS = [
    {
        id: 'standard',
        label: 'Standard Audit',
        description: 'Basic video health and audio levels.',
        layers: [
            'metric_luma',
            'metric_motion',
            'metric_audio_level',
            'black_frame',
            'silence',
        ],
    },
    {
        id: 'broadcast',
        label: 'Broadcast Safe',
        description: 'Strict legality, blanking, and loudness.',
        layers: [
            'metric_luma',
            'metric_audio_level',
            'broadcast_safe',
            'letterbox',
            'audio_clipping',
        ],
    },
    {
        id: 'visual_qa',
        label: 'Visual Quality',
        description: 'Detect artifacts, freeze frames, and softness.',
        layers: [
            'metric_luma',
            'metric_sharpness',
            'metric_motion',
            'freeze',
            'artifacts',
            'contrast_monitor',
        ],
    },
    {
        id: 'audio_eng',
        label: 'Audio Engineer',
        description: 'Focus on audio dynamics, phase, and dropouts.',
        layers: [
            'metric_audio_level',
            'silence',
            'audio_clipping',
            'phase_check',
        ],
    },
    {
        id: 'full_diagnostic',
        label: 'Full Diagnostic',
        description: 'Enable all analyzers (CPU Intensive).',
        layers: Object.keys(ANALYSIS_LAYERS).map((k) => ANALYSIS_LAYERS[k].id),
    },
];

export const SCAN_SPEEDS = {
    DEEP: {
        id: 'deep',
        label: 'Deep Scan',
        interval: 1,
        description: 'Analyze every frame. Required for freeze detection.',
    },
    BALANCED: {
        id: 'balanced',
        label: 'Balanced',
        interval: 5,
        description: 'Skips frames to save CPU. Disables temporal checks.',
    },
    FAST: {
        id: 'fast',
        label: 'Fast Survey',
        interval: 15,
        description: 'Sparse sampling for quick spot-checks.',
    },
};

export const DEFAULT_THRESHOLDS = {
    blackLuma: 16,
    freezeDiff: 0.005,
    silenceDb: -60,
    clippingDb: -0.1,
    blockinessScore: 40,
    illegalPct: 2.0,
};
