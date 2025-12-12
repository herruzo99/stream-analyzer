import {
    calculateFrameDiff,
    calculateSpatialInformation,
    detectActivePictureArea,
    detectBlockiness,
    detectBanding,
    performUnifiedAnalysis,
} from '@/features/signalQuality/domain/pixel-analyzers.js';
import { appLog } from '../../../shared/utils/debug.js';

// Context storage for parallel stream processing
const streamContexts = new Map();

// Thresholds for alerting (Errors)
const THRESHOLDS = {
    BLOCKINESS: 40,
    FREEZE_MSE: 0.001,
    BLACK_LUMA: 16,
    ILLEGAL_PCT: 3.0,
    LETTERBOX_PCT: 5.0,
    FLAT_STDDEV: 20.0,
};

// Minimum duration (in seconds) for an anomaly to be considered valid.
const MIN_DURATION = {
    freeze: 0.15,
    black: 0.1,
    silence: 0.1,
    default: 0.0,
};

class PerformanceTracker {
    constructor() {
        this.metrics = {};
        this.startTimes = {};
    }

    start(label) {
        this.startTimes[label] = performance.now();
    }

    end(label) {
        if (this.startTimes[label] !== undefined) {
            const duration = performance.now() - this.startTimes[label];
            this.metrics[label] = (this.metrics[label] || 0) + duration;
        }
    }
}

function getOrCreateContext(streamId, width, height) {
    let ctx = streamContexts.get(streamId);

    // If context missing or resolution changed, re-initialize
    if (!ctx || ctx.width !== width || ctx.height !== height) {
        if (ctx) ctx = null;

        const canvas = new OffscreenCanvas(width, height);
        const context2d = canvas.getContext('2d', { willReadFrequently: true });

        ctx = {
            width,
            height,
            offscreenCanvas: canvas,
            offscreenCtx: context2d,
            prevFrameData: null,
            lastTimestamp: undefined,
            jobState: {
                metricsAccumulator: {},
                metricsCount: {},
                activeAnomalies: new Map(),
                issues: [],
            },
        };
        streamContexts.set(streamId, ctx);
    }
    return ctx;
}

export async function handleAnalyzeFrameSequence(
    payload,
    signal,
    postProgress
) {
    const tracker = new PerformanceTracker();
    tracker.start('total_frame_time');

    const { frameBitmap, frameIndex, isLast, layers, streamId } = payload;
    const timestamp = payload.timestamp;

    if (!streamId && streamId !== 0) {
        throw new Error('streamId is required for frame analysis.');
    }

    const width = frameBitmap.width;
    const height = frameBitmap.height;

    // 1. Get Context
    tracker.start('ctx_init');
    const ctx = getOrCreateContext(streamId, width, height);

    // Calculate step size based on timestamp delta
    let stepSize = 0.04; // Default ~25fps fallback
    if (ctx.lastTimestamp !== undefined && timestamp > ctx.lastTimestamp) {
        stepSize = timestamp - ctx.lastTimestamp;
    }
    ctx.lastTimestamp = timestamp;
    tracker.end('ctx_init');

    // 2. Draw and Extract Data
    tracker.start('gpu_readback');
    ctx.offscreenCtx.drawImage(frameBitmap, 0, 0);
    const imageData = ctx.offscreenCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    frameBitmap.close();
    tracker.end('gpu_readback');

    const metrics = { timestamp };
    const currentFrameIssues = [];
    const activeLayers = new Set(layers);

    // Pass-through existing metrics
    Object.assign(metrics, payload.metrics || {});

    // --- 3. Conditional Analysis ---

    // A. Unified Luma/Color Stats
    const needsUnified =
        activeLayers.has('metric_luma') ||
        activeLayers.has('black_frame') ||
        activeLayers.has('broadcast_safe') ||
        activeLayers.has('contrast_monitor');

    if (needsUnified) {
        tracker.start('calc_unified');
        const unifiedStats = performUnifiedAnalysis(data, 4); // Stride 4
        tracker.end('calc_unified');

        if (
            activeLayers.has('metric_luma') ||
            activeLayers.has('black_frame')
        ) {
            metrics.luma = unifiedStats.avgLuma;
        }

        if (activeLayers.has('contrast_monitor')) {
            metrics.contrastStdDev = unifiedStats.contrastStdDev;
        }

        if (activeLayers.has('broadcast_safe')) {
            metrics.illegalBlack = unifiedStats.illegalBlackPct;
            metrics.illegalWhite = unifiedStats.illegalWhitePct;
            metrics.illegalChroma = unifiedStats.illegalChromaPct;
        }
    }

    // B. Spatial Information (Sharpness)
    if (activeLayers.has('metric_sharpness')) {
        tracker.start('calc_spatial');
        metrics.sharpness = calculateSpatialInformation(data, width, height);
        tracker.end('calc_spatial');
    }

    // C. Temporal Information (Motion/Freeze)
    const needsTemporal =
        activeLayers.has('metric_motion') || activeLayers.has('freeze');

    if (needsTemporal) {
        tracker.start('calc_temporal');
        let diff = 0;
        if (ctx.prevFrameData) {
            diff = calculateFrameDiff(data, ctx.prevFrameData);
        }
        // Clone data for next frame comparison
        ctx.prevFrameData = new Uint8ClampedArray(data);

        if (activeLayers.has('metric_motion')) {
            metrics.temporalDiff = diff * 100;
        }
        if (activeLayers.has('freeze')) {
            metrics.freezeDiff = diff;
        }
        tracker.end('calc_temporal');
    } else {
        ctx.prevFrameData = null;
    }

    // D. Blockiness / Artifacts
    if (activeLayers.has('artifacts')) {
        tracker.start('calc_artifacts');
        const blockScore = detectBlockiness(data, width, height);
        metrics.blockiness = blockScore;
        tracker.end('calc_artifacts');
    }

    // E. Letterboxing
    if (activeLayers.has('letterbox')) {
        tracker.start('calc_letterbox');
        const dims = detectActivePictureArea(data, width, height);
        metrics.letterboxPad = Math.max(dims.topPadding, dims.leftPadding);
        tracker.end('calc_letterbox');
    }

    // F. Banding
    if (
        activeLayers.has('banding') ||
        activeLayers.has('metric_predicted_quality')
    ) {
        tracker.start('calc_banding');
        // Only run if explicitly requested or needed for quality score
        // (If strictly for quality score, we might want to skip if CPU is tight, but let's run it)
        const bandingScore = detectBanding(data, width, height);
        metrics.banding = bandingScore;
        tracker.end('calc_banding');
    }

    // G. Predicted Quality Score (Pseudo-VMAF)
    if (activeLayers.has('metric_predicted_quality')) {
        // Base score 100
        let score = 100;

        // Penalties
        const blockPenalty = (metrics.blockiness || 0) * 0.5; // Blockiness is 0-100
        const bandingPenalty = (metrics.banding || 0) * 0.5; // Banding is 0-100

        // Contrast penalty (too flat)
        let contrastPenalty = 0;
        if (
            metrics.contrastStdDev !== undefined &&
            metrics.contrastStdDev < 20
        ) {
            contrastPenalty = (20 - metrics.contrastStdDev) * 2; // Max 40 penalty
        }

        // Luma penalty (too dark/bright)
        let lumaPenalty = 0;
        if (metrics.luma !== undefined) {
            if (metrics.luma < 30) lumaPenalty = 30 - metrics.luma;
            if (metrics.luma > 220) lumaPenalty = metrics.luma - 220;
        }

        score =
            score -
            blockPenalty -
            bandingPenalty -
            contrastPenalty -
            lumaPenalty;
        metrics.predictedQuality = Math.max(0, Math.min(100, score));
    }

    // --- 4. Anomaly Detection (Thresholding) ---
    tracker.start('logic_anomalies');

    if (activeLayers.has('black_frame') && metrics.luma !== undefined) {
        if (metrics.luma < THRESHOLDS.BLACK_LUMA) {
            currentFrameIssues.push({
                type: 'black',
                value: `Luma: ${metrics.luma.toFixed(1)}`,
            });
        }
    }

    if (activeLayers.has('freeze') && metrics.freezeDiff !== undefined) {
        if (frameIndex > 0 && metrics.freezeDiff < THRESHOLDS.FREEZE_MSE) {
            currentFrameIssues.push({
                type: 'freeze',
                value: `Diff: ${(metrics.freezeDiff * 100).toFixed(4)}%`,
            });
        }
    }

    if (
        activeLayers.has('broadcast_safe') &&
        metrics.illegalBlack !== undefined
    ) {
        if (metrics.illegalBlack > THRESHOLDS.ILLEGAL_PCT) {
            currentFrameIssues.push({
                type: 'illegal',
                value: `Crushed Blacks: ${metrics.illegalBlack.toFixed(1)}%`,
            });
        }
        if (metrics.illegalWhite > THRESHOLDS.ILLEGAL_PCT) {
            currentFrameIssues.push({
                type: 'illegal',
                value: `Clipped Whites: ${metrics.illegalWhite.toFixed(1)}%`,
            });
        }
        if (metrics.illegalChroma > THRESHOLDS.ILLEGAL_PCT) {
            currentFrameIssues.push({
                type: 'illegal',
                value: `Unsafe Chroma: ${metrics.illegalChroma.toFixed(1)}%`,
            });
        }
    }

    if (activeLayers.has('artifacts') && metrics.blockiness !== undefined) {
        if (metrics.blockiness > THRESHOLDS.BLOCKINESS) {
            currentFrameIssues.push({
                type: 'blocky',
                value: `Score: ${metrics.blockiness.toFixed(0)}`,
            });
        }
    }

    if (activeLayers.has('letterbox') && metrics.letterboxPad !== undefined) {
        if (metrics.letterboxPad > THRESHOLDS.LETTERBOX_PCT) {
            currentFrameIssues.push({
                type: 'letterbox',
                value: `Padding: ${metrics.letterboxPad.toFixed(0)}%`,
            });
        }
    }

    if (
        activeLayers.has('contrast_monitor') &&
        metrics.contrastStdDev !== undefined
    ) {
        if (
            metrics.contrastStdDev < THRESHOLDS.FLAT_STDDEV &&
            metrics.luma > 30 &&
            metrics.luma < 200
        ) {
            currentFrameIssues.push({
                type: 'flat',
                value: `StdDev: ${metrics.contrastStdDev.toFixed(1)} (Washed Out)`,
            });
        }
    }

    if (activeLayers.has('banding') && metrics.banding !== undefined) {
        if (metrics.banding > 15) {
            // Threshold for visible banding
            currentFrameIssues.push({
                type: 'banding',
                value: `Score: ${metrics.banding.toFixed(0)}`,
            });
        }
    }
    tracker.end('logic_anomalies');

    // Helper adapter for stateful logic
    const statefulHelper = {
        metricsAccumulator: ctx.jobState.metricsAccumulator,
        metricsCount: ctx.jobState.metricsCount,
        activeAnomalies: ctx.jobState.activeAnomalies,
        issues: ctx.jobState.issues,
    };

    tracker.start('state_update');
    _accumulateMetrics(metrics, statefulHelper);

    // Process issues using the calculated stepSize and current timestamp
    const newIssues = _processFrameIssuesStateful(
        currentFrameIssues,
        timestamp,
        stepSize,
        statefulHelper
    );

    if (isLast) {
        const closed = _closeAllAnomalies(timestamp, statefulHelper);
        newIssues.push(...closed);
        streamContexts.delete(streamId);
        appLog(
            'QcHandler',
            'info',
            `Batch analysis finished for stream ${streamId}. Context cleared.`
        );
    }
    tracker.end('state_update');

    tracker.end('total_frame_time');

    return {
        streamId,
        frameIndex,
        metrics,
        issues: newIssues,
        profiling: tracker.metrics, // Return detailed timings
    };
}

function _accumulateMetrics(frameMetrics, state) {
    for (const [key, val] of Object.entries(frameMetrics)) {
        if (typeof val === 'number') {
            state.metricsAccumulator[key] =
                (state.metricsAccumulator[key] || 0) + val;
            state.metricsCount[key] = (state.metricsCount[key] || 0) + 1;
        }
    }
}

function _processFrameIssuesStateful(frameIssues, time, stepSize, state) {
    const frameIssueTypes = new Set(frameIssues.map((i) => i.type));
    const dirtyIssues = [];

    // 1. Update existing anomalies or create new ones
    frameIssues.forEach((issue) => {
        if (state.activeAnomalies.has(issue.type)) {
            const active = state.activeAnomalies.get(issue.type);
            active.duration += stepSize;

            // Only report update if it meets minimum duration (reduces noise)
            const threshold = MIN_DURATION[issue.type] || MIN_DURATION.default;
            if (active.duration >= threshold) {
                dirtyIssues.push({ ...active });
            }
        } else {
            const newAnomaly = {
                id: crypto.randomUUID(),
                type: issue.type,
                startTime: time,
                duration: stepSize,
                value: issue.value,
                severity: 'warning',
            };
            state.activeAnomalies.set(issue.type, newAnomaly);

            // Don't emit immediately if we have a threshold > 0
            const threshold = MIN_DURATION[issue.type] || MIN_DURATION.default;
            if (stepSize >= threshold) {
                dirtyIssues.push({ ...newAnomaly });
            }
        }
    });

    // 2. Close anomalies that ended
    for (const [type, anomaly] of state.activeAnomalies.entries()) {
        if (!frameIssueTypes.has(type)) {
            const threshold = MIN_DURATION[type] || MIN_DURATION.default;

            // Only finalize if it met the duration threshold
            if (anomaly.duration >= threshold) {
                state.issues.push(anomaly);
                dirtyIssues.push(anomaly);
            }
            state.activeAnomalies.delete(type);
        }
    }

    return dirtyIssues;
}

function _closeAllAnomalies(endTime, state) {
    const closed = [];
    for (const [type, anomaly] of state.activeAnomalies.entries()) {
        const threshold = MIN_DURATION[type] || MIN_DURATION.default;
        if (anomaly.duration >= threshold) {
            state.issues.push(anomaly);
            closed.push(anomaly);
        }
    }
    state.activeAnomalies.clear();
    return closed;
}

// Bind functions for export usage (simulating class methods if needed by test suite)
handleAnalyzeFrameSequence._accumulateMetrics = _accumulateMetrics;
handleAnalyzeFrameSequence._processFrameIssuesStateful =
    _processFrameIssuesStateful;
handleAnalyzeFrameSequence._closeAllAnomalies = _closeAllAnomalies;
