// import { eventBus } from '@/application/event-bus';
// import { audioOfflineAnalyzer } from '@/features/signalQuality/domain/audio-offline-analyzer';
// import { getShaka } from '@/infrastructure/player/shaka'; // No longer needed
import { workerService } from '@/infrastructure/worker/workerService';
import { appLog } from '@/shared/utils/debug';
import { useAnalysisStore } from '@/state/analysisStore';
import { qualityActions } from '@/state/qualityStore';
// import { useSegmentCacheStore } from '@/state/segmentCacheStore';
// import { EVENTS } from '@/types/events';
import { SCAN_SPEEDS } from '../domain/analysis-config';
import { SceneChangeDetector } from '../domain/sceneChangeDetector';
import { WebCodecsVideoProvider } from './webCodecsVideoProvider';

// const SYNC_TIMEOUT_MS = 8000;
// const AUDIO_DECODE_CACHE_SIZE = 10;
// const LIVE_EDGE_SAFETY_BUFFER = 1.5;
// const DVR_SLIP_TOLERANCE = 4.0; // No longer needed
// const MAX_LIVE_WAIT_TIME = 30000;

// Defined at top level for module scope visibility
const MIN_DURATION = {
    freeze: 0.15,
    black: 0.1,
    silence: 0.1,
    default: 0.0,
};

class SimpleProfiler {
    constructor() {
        this.clientTimings = {
            seek_wait: 0,
            bitmap_extract: 0,
            audio_decode: 0,
            audio_lookup: 0,
            worker_rtt: 0,
            segment_load: 0,
            decode_time: 0,
        };
        this.workerTimings = {};
        this.counts = {
            frames: 0,
            audio_hits: 0,
            audio_misses: 0,
        };
        this.startTime = Date.now();
    }

    addClient(category, duration) {
        this.clientTimings[category] =
            (this.clientTimings[category] || 0) + duration;
    }

    ingestWorkerMetrics(metrics) {
        if (!metrics) return;
        for (const [key, val] of Object.entries(metrics)) {
            this.workerTimings[key] = (this.workerTimings[key] || 0) + val;
        }
    }

    incrementFrame() {
        this.counts.frames++;
    }

    markAudio(isHit) {
        if (isHit) this.counts.audio_hits++;
        else this.counts.audio_misses++;
    }

    getReport() {
        const frames = this.counts.frames || 1;
        const elapsed = (Date.now() - this.startTime) / 1000;
        const fps = (frames / elapsed).toFixed(2);

        const avg = (timings, key) =>
            timings[key] ? (timings[key] / frames).toFixed(2) : '0.00';

        const details = [];

        details.push({
            Category: 'Client (Main)',
            Metric: 'Segment Load',
            AvgMs: avg(this.clientTimings, 'segment_load'),
        });
        details.push({
            Category: 'Client (Main)',
            Metric: 'Decode Time',
            AvgMs: avg(this.clientTimings, 'decode_time'),
        });
        details.push({
            Category: 'Client (Main)',
            Metric: 'Bitmap Extract',
            AvgMs: avg(this.clientTimings, 'bitmap_extract'),
        });
        details.push({
            Category: 'Client (Main)',
            Metric: 'Audio Decode',
            AvgMs: avg(this.clientTimings, 'audio_decode'),
        });
        details.push({
            Category: 'Client (Main)',
            Metric: 'Worker RTT',
            AvgMs: avg(this.clientTimings, 'worker_rtt'),
        });

        Object.keys(this.workerTimings)
            .sort()
            .forEach((key) => {
                details.push({
                    Category: 'Worker (Thread)',
                    Metric: key,
                    AvgMs: avg(this.workerTimings, key),
                });
            });

        return { fps, details };
    }

    print() {
        if (this.counts.frames === 0) return;
        const report = this.getReport();
        // FORCE LOG: Use console directly to bypass debug flag for critical performance report
        console.group(
            `[Profiler] Analysis Performance (${this.counts.frames} frames @ ${report.fps} fps)`
        );
        console.table(report.details);
        console.groupEnd();
    }
}

import { WebCodecsAudioProvider } from './webCodecsAudioProvider';
import { randomId } from '@/shared/utils/random.js';

// ... (imports)

// Remove ParasiticAudioProvider class definition entirely.

class HeadlessJob {
    constructor(streamId, config, trackConfig) {
        this.streamId = streamId;
        this.config = config;
        this.trackConfig = trackConfig || {};
        this.abortController = new AbortController();
        this.isCancelled = false;
        this.activeAnomalies = new Map();
        this.issues = [];
        this.metricsAccumulator = {};
        this.metricsCount = {};
        this.metricValues = {}; // Store all values for advanced stats (min, max, percentile, variance)
        this.currentWorkerTask = null;
        this.pendingFrameMetrics = []; // Buffer for batching metrics updates

        // --- Profiler ---
        this.profiler = new SimpleProfiler();
        this.videoProvider = new WebCodecsVideoProvider(
            streamId,
            this.profiler
        );

        // If no audio track ID is provided, we'll let the provider try to find one,
        // or we could try to find one here from the store if we had access to the stream object.
        // But we don't have the stream object in constructor easily (it's in store).
        // Let's pass what we have. The provider has fallback logic, but it failed because it was looking for 'undefined'.
        // We should explicitly pass null if it's undefined to be cleaner, or handle it in provider.
        // Actually, let's try to find it in _execute where we have the stream, but we instantiate providers here.
        // Better: Instantiate providers in _execute or initialize them there.
        // For now, let's just keep it as is, but in _execute we can update the provider's trackId if needed.
        this.audioProvider = new WebCodecsAudioProvider(
            streamId,
            trackConfig.audioTrackId,
            this.profiler
        );

        // --- Audio Metrics History ---
        this.audioMetricsHistory = [];
        this.audioProvider.setMetricsCallback((metric) => {
            this.audioMetricsHistory.push(metric);
        });

        // --- Scene Change Detector ---
        this.sceneChangeDetector = new SceneChangeDetector({
            threshold: 0.3,
            fadeThreshold: 0.15,
            minSceneGap: 0.5,
            maxChanges: 500,
            useHistogram: true,
        });

        this.instanceId = Math.random().toString(36).substring(7);
        appLog(
            'HeadlessJob',
            'info',
            `[${this.instanceId}] Created HeadlessJob for stream ${streamId}`
        );
    }

    run() {
        return this._execute();
    }

    async _execute() {
        this.startTime = performance.now();
        try {
            const stream = useAnalysisStore
                .getState()
                .streams.find((s) => s.id === this.streamId);
            if (!stream) throw new Error(`Stream ${this.streamId} not found.`);

            const { scanDuration, scanStartOffset, activeLayers, scanSpeed } =
                this.config;
            const speedConfig =
                SCAN_SPEEDS[this._normalizeSpeed(scanSpeed)] ||
                SCAN_SPEEDS.DEEP;

            const isLinearMode = speedConfig.id === 'deep';
            const stepSize = (1 / 30) * speedConfig.interval;
            const totalSteps = Math.ceil(scanDuration / stepSize);

            const configSnapshot = {
                ...this.config,
                activeLayers: Array.from(activeLayers),
            };

            appLog(
                'HeadlessJob',
                'info',
                `Job Config: Speed=${speedConfig.id}, Step=${stepSize.toFixed(3)}s, Steps=${totalSteps}, Linear=${isLinearMode}`
            );
            appLog(
                'HeadlessJob',
                'info',
                `Executing HeadlessJob for stream ${this.streamId}`,
                { config: configSnapshot, trackConfig: this.trackConfig }
            );

            // UI Init ...
            let videoLabel = 'Auto';
            let audioLabel = 'Default';
            // let targetProfile = null;

            if (this.trackConfig.videoTrackId) {
                const vTrack = stream.manifest?.summary?.videoTracks?.find(
                    (t) => t.id === this.trackConfig.videoTrackId
                );
                if (vTrack) {
                    videoLabel =
                        vTrack.resolutions?.[0]?.value ||
                        (vTrack.height ? `${vTrack.height}p` : 'Unknown');
                    // targetProfile = { height: vTrack.height, bandwidth: vTrack.bandwidth };
                }
            }

            // Resolve Audio Track ID if missing
            if (!this.trackConfig.audioTrackId) {
                // Try to find a default audio track from manifest summary
                const aTracks = stream.manifest?.summary?.audioTracks;
                if (aTracks && aTracks.length > 0) {
                    this.trackConfig.audioTrackId = aTracks[0].id;
                    this.audioProvider.trackId = this.trackConfig.audioTrackId; // Update provider
                    appLog(
                        'HeadlessJob',
                        'info',
                        `Auto-selected audio track: ${this.trackConfig.audioTrackId}`
                    );
                } else {
                    // Fallback to muxed audio if no explicit tracks found (common in TS/MP4)
                    this.trackConfig.audioTrackId = 'muxed-audio';
                    this.audioProvider.trackId = 'muxed-audio'; // Update provider
                    appLog(
                        'HeadlessJob',
                        'info',
                        `No explicit audio tracks found. Defaulting to 'muxed-audio'.`
                    );
                }
            }

            // Handle Muxed Audio
            if (this.trackConfig.audioTrackId === 'muxed-audio') {
                appLog(
                    'HeadlessJob',
                    'info',
                    'Configuring for Muxed Audio analysis'
                );
                this.videoProvider.enableAudioExtraction = true;
                if (this.audioProvider.setExternalMode) {
                    this.audioProvider.setExternalMode(true);
                }
            }

            if (this.trackConfig.audioTrackId) {
                audioLabel = this.trackConfig.audioTrackId.toUpperCase();
            }
            const trackDetails = { video: videoLabel, audio: audioLabel };

            this.runId = `qc-run-${Date.now().toString(36)}-${this.instanceId}`;
            this.runStartedAt = Date.now();
            qualityActions.initJob(this.streamId, totalSteps, configSnapshot, trackDetails, {
                runId: this.runId,
                startedAt: this.runStartedAt,
            });
            appLog(
                'HeadlessJob',
                'info',
                `Starting Analysis for ${stream.name} (Linear: ${isLinearMode})`
            );

            qualityActions.updateJobProgress(this.streamId, {
                progress: 5,
                statusMessage: 'Initializing Engines...',
            }, this.runId);

            await this.videoProvider.initialize(
                stream,
                this.trackConfig.videoTrackId
            );
            // Only initialize audio provider if NOT in external mode (or if it handles it gracefully)
            // If external mode, initialize might skip segment loading but set up decoder?
            await this.audioProvider.initialize(stream);

            if (this.isCancelled) return;

            const isLive = this.videoProvider.isLive();
            let currentTime = scanStartOffset;
            let framesProcessed = 0;
            let targetFrameCount = totalSteps;
            // Default safety buffer if suggestedPresentationDelay is not present
            const DEFAULT_LIVE_DELAY = 4.0;
            const suggestedDelay = stream.manifest?.suggestedPresentationDelay;
            const liveDelay =
                suggestedDelay !== undefined && suggestedDelay !== null
                    ? suggestedDelay
                    : DEFAULT_LIVE_DELAY;

            if (isLive) {
                const seekRange = this.videoProvider.getSeekRange();
                const dvrWindow = seekRange.end - seekRange.start;
                const effectiveDuration = Math.min(
                    scanDuration,
                    dvrWindow - liveDelay
                );
                if (effectiveDuration < scanDuration) {
                    appLog(
                        'HeadlessJob',
                        'warn',
                        `Clamping scan duration from ${scanDuration}s to ${effectiveDuration.toFixed(1)}s due to short DVR window.`
                    );
                    targetFrameCount = Math.ceil(effectiveDuration / stepSize);
                }
                let targetStart = seekRange.end - effectiveDuration - liveDelay;

                // Ensure we don't start before the beginning of the DVR window
                if (targetStart < seekRange.start)
                    targetStart = seekRange.start + 1;

                currentTime = targetStart;
                appLog(
                    'HeadlessJob',
                    'info',
                    `[Live] DVR: ${seekRange.start.toFixed(1)} - ${seekRange.end.toFixed(1)}. Starting at ${currentTime.toFixed(2)}s (Delay: ${liveDelay}s)`
                );
            } else {
                const seekRange = this.videoProvider.getSeekRange();
                if (currentTime < seekRange.start)
                    currentTime = seekRange.start;
                if (currentTime > seekRange.end) currentTime = seekRange.start;
                appLog(
                    'HeadlessJob',
                    'info',
                    `[VOD] Starting at ${currentTime.toFixed(2)}s`
                );
            }

            // Store the absolute start time in the job state so UI can render timeline correctly
            qualityActions.updateJobProgress(this.streamId, {
                mediaStartTime: currentTime,
            }, this.runId);

            // Initial seek
            await this.videoProvider.seek(currentTime);

            let lastProcessedTimestamp = -1;
            let initialSegmentNumber = null;
            let initialTimestamp = stream.initialAnalysisTimestamp || null;

            // If we have a stored initial timestamp, use it.
            // Otherwise, we will set it on the first frame.
            if (initialTimestamp !== null) {
                appLog(
                    'HeadlessJob',
                    'info',
                    `Using stored initial timestamp: ${initialTimestamp}`
                );
                // Also ensure the UI store reflects this as the analysis start time
                qualityActions.updateJobProgress(this.streamId, {
                    mediaStartTime: initialTimestamp,
                }, this.runId);
            }

            while (framesProcessed < targetFrameCount) {
                if (this.isCancelled) {
                    appLog(
                        'HeadlessJob',
                        'info',
                        `[${this.instanceId}] Loop cancelled`
                    );
                    break;
                }

                const taskStart = performance.now();

                // Fetch next frame from WebCodecs provider
                // This handles segment loading and decoding internally
                // appLog('HeadlessJob', 'debug', `Asking for frame ${framesProcessed + 1}/${targetFrameCount}`);
                const frame = await this.videoProvider.getNextFrame();

                if (this.isCancelled) {
                    if (frame) frame.close();
                    appLog(
                        'HeadlessJob',
                        'info',
                        `[${this.instanceId}] Frame received after cancel. Discarding.`
                    );
                    break;
                }

                if (!frame) {
                    // End of stream or error
                    appLog(
                        'HeadlessJob',
                        'warn',
                        'No more frames available. Stopping analysis.'
                    );
                    break;
                }

                const actualTimestamp = frame.timestamp / 1e6; // microseconds to seconds

                // Capture initial timestamp if not set
                if (initialTimestamp === null) {
                    initialTimestamp = actualTimestamp;
                    useAnalysisStore
                        .getState()
                        .setInitialAnalysisTimestamp(
                            this.streamId,
                            initialTimestamp
                        );

                    // Update UI store with the ACTUAL media start time to ensure seek alignment
                    qualityActions.updateJobProgress(this.streamId, {
                        mediaStartTime: initialTimestamp,
                    }, this.runId);

                    appLog(
                        'HeadlessJob',
                        'info',
                        `Captured initial timestamp: ${initialTimestamp}`
                    );
                }

                // Calculate relative timestamp for reporting
                // For VOD, we might want to keep absolute time or start from 0?
                // User request specifically mentions "live have an issue where times are big".
                // So let's apply this primarily for Live, or if initialTimestamp is set.
                const relativeTimestamp =
                    initialTimestamp !== null
                        ? actualTimestamp - initialTimestamp
                        : actualTimestamp;

                // Transfer Muxed Audio Chunks & Drive Buffer Processing
                if (
                    this.trackConfig.audioTrackId === 'muxed-audio' &&
                    this.videoProvider.getAudioChunks
                ) {
                    const audioChunks =
                        this.videoProvider.getAudioChunks() || [];

                    if (this.audioProvider.feedExternalChunks) {
                        if (audioChunks.length > 0) {
                            appLog(
                                'HeadlessJob',
                                'info',
                                `Transferring ${audioChunks.length} muxed audio chunks to audio provider`
                            );
                        }
                        // Always call this to allow provider to process its internal buffer based on current time
                        await this.audioProvider.feedExternalChunks(
                            audioChunks,
                            actualTimestamp
                        );

                        // Yield if we transferred chunks or if provider might be decoding
                        if (audioChunks.length > 0) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, 0)
                            );
                        }
                    }
                } else if (
                    this.trackConfig.audioTrackId &&
                    this.trackConfig.audioTrackId !== 'muxed-audio'
                ) {
                    // Non-muxed audio: Drive the provider to fetch/analyze
                    // appLog('HeadlessJob', 'debug', `Syncing audio provider at ${actualTimestamp}`);
                    await this.audioProvider.syncAudio(actualTimestamp);
                }

                // Update UI with Segment Info

                if (
                    Math.abs(actualTimestamp - lastProcessedTimestamp) < 0.001
                ) {
                    // Duplicate frame?
                }
                lastProcessedTimestamp = actualTimestamp;

                const needsAudio =
                    activeLayers.has('metric_audio_level') ||
                    activeLayers.has('silence') ||
                    activeLayers.has('audio_clipping');
                let audioMetric = null;

                if (needsAudio) {
                    // Find the closest metric in our history
                    // Since we are pushing metrics, we might have many points.
                    // We want the one closest to actualTimestamp.
                    // Or better: we want to visualize the *range* covered by this frame?
                    // For the "current value" display, closest is fine.
                    // For the "sparkline" (history), we want all points.

                    // Optimization: Search from the end backwards if we assume time increases
                    // But history might be out of order if chunks arrive out of order?
                    // No, we push as we decode, and we sort buffer before decoding (in provider).
                    // So history should be roughly sorted.

                    // Let's find the closest metric
                    let minDiff = Infinity;
                    let bestMetric = null;

                    // Optimization: Start search from where we left off last time?
                    // For now, simple linear search from end is probably fast enough for < 2000 points.
                    for (
                        let i = this.audioMetricsHistory.length - 1;
                        i >= 0;
                        i--
                    ) {
                        const m = this.audioMetricsHistory[i];
                        const diff = Math.abs(m.timestamp - actualTimestamp);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestMetric = m;
                        } else if (diff > minDiff && diff > 1.0) {
                            // If diff starts growing and we are far away, stop.
                            // Assuming sorted-ish data.
                            break;
                        }
                    }

                    if (bestMetric && minDiff < 0.1) {
                        // 100ms tolerance
                        audioMetric = bestMetric;
                    } else {
                        // appLog('HeadlessJob', 'debug', `No close audio metric for ${actualTimestamp}. Min diff: ${minDiff}`);
                    }
                }

                // Create ImageBitmap from VideoFrame
                // This is more reliable than drawing VideoFrame directly to canvas in some environments
                const frameBitmap = await createImageBitmap(frame);
                frame.close(); // Close VideoFrame immediately

                let sceneDiffScore = 0;

                // Scene Change Detection (if enabled)
                if (activeLayers.has('scene_change')) {
                    // Extract pixel data for scene change analysis
                    // Use OffscreenCanvas if available for better performance/worker compatibility
                    const width = frameBitmap.width;
                    const height = frameBitmap.height;
                    let tempCtx;

                    if (typeof OffscreenCanvas !== 'undefined') {
                        const offscreen = new OffscreenCanvas(width, height);
                        tempCtx = offscreen.getContext('2d', {
                            alpha: false,
                            willReadFrequently: true,
                        });
                    } else {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = width;
                        tempCanvas.height = height;
                        tempCtx = tempCanvas.getContext('2d', {
                            alpha: false,
                            willReadFrequently: true,
                        });
                    }

                    // Draw bitmap to canvas
                    tempCtx.drawImage(frameBitmap, 0, 0);

                    const frameData = tempCtx.getImageData(
                        0,
                        0,
                        width,
                        height
                    ).data;

                    // Debug: Verify we have data
                    if (
                        frameData[0] === 0 &&
                        frameData[1] === 0 &&
                        frameData[2] === 0 &&
                        frameData[3] === 0
                    ) {
                        // Check a few more pixels to be sure
                        let hasData = false;
                        for (let i = 0; i < 100; i += 4) {
                            if (frameData[i + 3] !== 0) {
                                hasData = true;
                                break;
                            }
                        }
                        if (!hasData) {
                            appLog(
                                'HeadlessJob',
                                'warn',
                                `[SceneDetector] Frame data is empty/transparent! Bitmap: ${width}x${height}`
                            );
                        }
                    }

                    // Create a clean ImageBitmap from the canvas for the detector
                    // This fixes the corruption/stride issues for the thumbnails
                    const cleanBitmap = await createImageBitmap(tempCtx.canvas);

                    // Run scene change detection
                    const sceneResult = await this.sceneChangeDetector.detect(
                        cleanBitmap,
                        frameData,
                        relativeTimestamp
                    );

                    sceneDiffScore = sceneResult.diffScore || 0;

                    if (sceneResult.isSceneChange) {
                        appLog(
                            'HeadlessJob',
                            'info',
                            `Scene change detected at ${relativeTimestamp.toFixed(3)}s (type: ${sceneResult.sceneData.type}, confidence: ${sceneResult.sceneData.confidence}%)`
                        );

                        // Add to store
                        qualityActions.addSceneChanges(this.streamId, [
                            sceneResult.sceneData,
                        ], this.runId);
                    }
                }

                // const workerStart = performance.now();

                // Clone bitmap for worker to avoid neutering the one used by SceneChangeDetector
                // Note: SceneChangeDetector no longer uses the bitmap, but we still need a clone for the worker
                // because transferring it neuters it, and we might want to use it for other things (though currently we don't).
                // Actually, if we don't use frameBitmap after this, we can just transfer it directly!
                // BUT, we are inside a loop and logic might change. Safer to clone or just transfer if we are sure.
                // The workerService.postTask with transfer list will neuter it.
                // Let's create a bitmap for the worker.
                const workerBitmap = await createImageBitmap(frameBitmap);

                // We are done with the original frameBitmap now.
                frameBitmap.close();

                const task = workerService.postTask('analyze-frame-sequence', {
                    frameBitmap: workerBitmap, // Pass the clone
                    frameIndex: framesProcessed,
                    timestamp: relativeTimestamp, // Use relative timestamp for worker
                    isLast: framesProcessed === targetFrameCount - 1,
                    layers: Array.from(activeLayers),
                    streamId: this.streamId,
                    metrics: audioMetric
                        ? {
                            audioLevel: audioMetric.audioLevel,
                            peakAudioLevel: audioMetric.peak,
                        }
                        : {},
                });
                this.currentWorkerTask = task;
                const analysisResult = await task.promise;
                this.currentWorkerTask = null;

                // Ensure audio metrics are included in the result metrics for charting
                if (audioMetric) {
                    analysisResult.metrics = analysisResult.metrics || {};
                    analysisResult.metrics.audioLevel = audioMetric.audioLevel;
                    // analysisResult.metrics.peakAudioLevel = audioMetric.peak; // If we want to chart peak too
                }

                // Add scene change score to metrics
                if (activeLayers.has('scene_change')) {
                    analysisResult.metrics = analysisResult.metrics || {};
                    analysisResult.metrics.sceneChangeScore = sceneDiffScore;

                    // Debug Log: Verify score propagation
                    if (sceneDiffScore > 0.1 && Math.random() < 0.05) {
                        console.debug(
                            `[Headless] Scene Score: ${sceneDiffScore.toFixed(4)}`
                        );
                    }
                }

                this.profiler.ingestWorkerMetrics(
                    analysisResult.profiling || analysisResult.timings
                );
                this.profiler.addClient(
                    'worker_rtt',
                    performance.now() - taskStart
                ); // Use taskStart for RTT
                this.profiler.incrementFrame();

                if (
                    analysisResult.anomalies &&
                    analysisResult.anomalies.length > 0
                ) {
                    analysisResult.issues = analysisResult.issues || [];
                    analysisResult.issues.push(...analysisResult.anomalies);
                }

                // Check for Audio Anomalies using History (more robust than single point)
                if (needsAudio && this.audioMetricsHistory.length > 0) {
                    // Check recent history window (e.g. last 0.5s)
                    // This allows us to catch brief silence/clipping even if it falls between video frames
                    const windowStart = actualTimestamp - 0.1;
                    const windowEnd = actualTimestamp + 0.1;

                    const relevantMetrics = this.audioMetricsHistory.filter(
                        (m) =>
                            m.timestamp >= windowStart &&
                            m.timestamp <= windowEnd
                    );

                    // Aggregate metrics for this frame window
                    let minAudioLevel = Infinity;
                    let maxPeak = -Infinity;
                    let silenceDetected = false;
                    let clippingDetected = false;
                    let hasData = relevantMetrics.length > 0;
                    let hasLoudContent = false;

                    if (hasData) {
                        for (const m of relevantMetrics) {
                            // Check for loud content (non-silence)
                            // If any sample in the window is > -60dB, the frame is NOT silent.
                            if (m.audioLevel > -60) {
                                hasLoudContent = true;
                            }

                            if (
                                activeLayers.has('silence') &&
                                m.audioLevel < -60
                            ) {
                                // Candidate for silence, track min level
                                if (m.audioLevel < minAudioLevel)
                                    minAudioLevel = m.audioLevel;
                            }
                            if (
                                activeLayers.has('audio_clipping') &&
                                m.peak > -0.5
                            ) {
                                clippingDetected = true;
                                if (m.peak > maxPeak) maxPeak = m.peak;
                            }
                        }

                        // Only flag silence if we found silent samples AND no loud content
                        if (
                            activeLayers.has('silence') &&
                            !hasLoudContent &&
                            minAudioLevel < Infinity
                        ) {
                            silenceDetected = true;
                        }

                        // Update last known state
                        this.lastAudioState = {
                            silence: silenceDetected,
                            clipping: clippingDetected,
                            minAudioLevel: silenceDetected
                                ? minAudioLevel
                                : null,
                            maxPeak: clippingDetected ? maxPeak : null,
                            timestamp: actualTimestamp,
                        };
                    } else if (
                        this.lastAudioState &&
                        actualTimestamp - this.lastAudioState.timestamp < 0.5
                    ) {
                        // No data, but we have recent state (within 500ms). Hold it.
                        // This prevents fragmentation due to brief metric gaps or jitter.
                        if (needsAudio) {
                            appLog(
                                'HeadlessJob',
                                'debug',
                                `[${this.instanceId}] No audio metrics. Holding state. Silence: ${this.lastAudioState.silence}`
                            );
                        }
                        silenceDetected = this.lastAudioState.silence;
                        clippingDetected = this.lastAudioState.clipping;
                        if (silenceDetected)
                            minAudioLevel = this.lastAudioState.minAudioLevel;
                        if (clippingDetected)
                            maxPeak = this.lastAudioState.maxPeak;
                    }

                    if (
                        relevantMetrics.length === 0 &&
                        needsAudio &&
                        !this.lastAudioState
                    ) {
                        appLog(
                            'HeadlessJob',
                            'warn',
                            `[${this.instanceId}] No audio metrics found for window ${windowStart.toFixed(3)} - ${windowEnd.toFixed(3)} and no history.`
                        );
                    }

                    // Emit at most ONE issue per type for this frame
                    if (silenceDetected) {
                        analysisResult.issues = analysisResult.issues || [];
                        analysisResult.issues.push({
                            type: 'silence',
                            value: `${minAudioLevel.toFixed(1)} dB`,
                        });
                    }
                    if (clippingDetected) {
                        analysisResult.issues = analysisResult.issues || [];
                        analysisResult.issues.push({
                            type: 'clipping',
                            value: `${maxPeak.toFixed(2)} dB`,
                        });
                    }
                }

                // Accumulate metrics...
                this._accumulateMetrics(analysisResult.metrics);

                // Enrich metrics with metadata for CSV export (Always do this for every frame)
                if (analysisResult.metrics) {
                    analysisResult.metrics.frameIndex = framesProcessed;
                    analysisResult.metrics.timestamp = relativeTimestamp;
                    analysisResult.metrics.actualTimestamp = actualTimestamp;

                    // Calculate segment info for this frame
                    const freshStream = useAnalysisStore
                        .getState()
                        .streams.find((s) => s.id === this.streamId);
                    const segInfo = this._findSegmentByTime(
                        freshStream,
                        actualTimestamp
                    );
                    let currentSegmentNum = 'N/A';
                    if (segInfo) currentSegmentNum = segInfo.segment.number;

                    analysisResult.metrics.segment =
                        currentSegmentNum !== 'N/A' ? currentSegmentNum : null;

                    this.pendingFrameMetrics.push(analysisResult.metrics);
                }

                const delta = isLinearMode ? 1 / 30 : stepSize;
                const dirtyIssues = this._processFrameIssuesStateful(
                    analysisResult.issues || [],
                    relativeTimestamp,
                    delta
                );

                if (dirtyIssues.length > 0) {
                    qualityActions.upsertJobIssues(this.streamId, dirtyIssues, this.runId);
                }

                if (
                    framesProcessed % 10 === 0 ||
                    framesProcessed === targetFrameCount - 1
                ) {
                    // const uiStart = performance.now();
                    // Re-fetch stream info for UI update (in case it changed, though unlikely in loop)
                    const freshStream = useAnalysisStore
                        .getState()
                        .streams.find((s) => s.id === this.streamId);
                    const segInfo = this._findSegmentByTime(
                        freshStream,
                        actualTimestamp
                    );

                    let currentSegmentNum = 'N/A';
                    let segmentProgressObj = null;

                    if (segInfo) {
                        if (initialSegmentNumber === null)
                            initialSegmentNumber = segInfo.segment.number;
                        const currentSegmentFrame = Math.floor(
                            (actualTimestamp - segInfo.startTime) / stepSize
                        );
                        const totalSegmentFrames = Math.floor(
                            segInfo.duration / stepSize
                        );

                        currentSegmentNum = segInfo.segment.number;
                        // Ensure arithmetic is only on numbers
                        // const relativeNum = typeof currentSegmentNum === 'number' && typeof initialSegmentNumber === 'number'
                        //    ? currentSegmentNum - initialSegmentNumber
                        //    : 0;
                        segmentProgressObj = {
                            number: currentSegmentNum,
                            relativeNumber:
                                typeof currentSegmentNum === 'number' &&
                                    typeof initialSegmentNumber === 'number'
                                    ? currentSegmentNum - initialSegmentNumber
                                    : 0,
                            current: currentSegmentFrame,
                            total: totalSegmentFrames,
                        };
                    }

                    const totalFrames = this.config.duration
                        ? Math.ceil(this.config.duration * 30)
                        : targetFrameCount;
                    // Use totalFrames for progress calculation if available, otherwise targetFrameCount (which might be just the scan range)
                    // The user wants "0 frames to all frames", so totalFrames is better.
                    const progressPct =
                        (framesProcessed / (totalFrames || 1)) * 100;

                    // Send new audio metrics to store
                    const newAudioMetrics = this.audioMetricsHistory.slice(
                        this.lastSentAudioIndex || 0
                    );
                    this.lastSentAudioIndex = this.audioMetricsHistory.length;

                    // FIX: The analysisResult contains the single audio point for the current video frame's timestamp.
                    // This must be added to the newAudioMetrics array to be sent to the store.
                    // This fixes the data propagation for demuxed (non-muxed) audio.
                    if (
                        analysisResult.metrics &&
                        analysisResult.metrics.audioLevel !== undefined
                    ) {
                        newAudioMetrics.push({
                            timestamp: relativeTimestamp,
                            audioLevel: analysisResult.metrics.audioLevel,
                            peak: analysisResult.metrics.peakAudioLevel,
                        });
                    }

                    // Enrich metrics with metadata for CSV export
                    if (analysisResult.metrics) {
                        analysisResult.metrics.frameIndex = framesProcessed;
                        analysisResult.metrics.timestamp = relativeTimestamp;
                        analysisResult.metrics.actualTimestamp =
                            actualTimestamp;
                        analysisResult.metrics.segment =
                            currentSegmentNum !== 'N/A'
                                ? currentSegmentNum
                                : null;

                        // Add to pending buffer
                        this.pendingFrameMetrics.push(analysisResult.metrics);
                    }

                    qualityActions.updateJobProgress(this.streamId, {
                        frameIndex: framesProcessed,
                        progress: progressPct,
                        statusMessage: `Analyzing... ${relativeTimestamp.toFixed(2)}s`,
                        currentSegment: currentSegmentNum,
                        segmentProgress: segmentProgressObj,
                        metrics: analysisResult.metrics, // Keep sending current for live chart updates
                        metricsBatch: [...this.pendingFrameMetrics], // Send batch for history
                        audioMetrics: newAudioMetrics, // Send the chunk
                    }, this.runId);

                    // Clear buffer after sending
                    this.pendingFrameMetrics = [];
                }

                // If scan speed interval > 1, skip frames to maintain correct cadence throughout the duration
                if (speedConfig.interval > 1) {
                    await this.videoProvider.skipFrames(speedConfig.interval - 1);
                }

                framesProcessed++;

                // Advance time for audio provider or logging?
                currentTime = actualTimestamp;
            }

            const closedIssues = this._closeAllAnomalies(
                isLive && initialTimestamp !== null
                    ? currentTime - initialTimestamp
                    : currentTime
            );
            if (closedIssues.length > 0) {
                qualityActions.upsertJobIssues(this.streamId, closedIssues, this.runId);
            }

            if (!this.isCancelled) {
                // Calculate final stats
                const endTime = performance.now();
                const totalDuration = (endTime - this.startTime) / 1000;
                const processingSpeed =
                    totalDuration > 0
                        ? (lastProcessedTimestamp - (initialTimestamp || 0)) /
                        totalDuration
                        : 0;

                const debugStats = {
                    analysisStartTime: new Date(
                        this.startTime + performance.timeOrigin
                    ).toISOString(),
                    analysisDuration: totalDuration,
                    processingSpeed: processingSpeed,
                    initialVideoTimestamp: initialTimestamp,
                    finalVideoTimestamp: lastProcessedTimestamp,
                    framesProcessed: framesProcessed,
                };

                this._finalizeResults(debugStats);
            }
        } catch (e) {
            if (!this.isCancelled) {
                console.error('[HeadlessJob] Error:', e);
                qualityActions.failJob(this.streamId, e.message, this.runId);
            }
        } finally {
            this.profiler.print();
            this.cleanup();
        }
    }

    _accumulateMetrics(frameMetrics) {
        for (const [key, val] of Object.entries(frameMetrics)) {
            if (typeof val === 'number') {
                this.metricsAccumulator[key] =
                    (this.metricsAccumulator[key] || 0) + val;
                this.metricsCount[key] = (this.metricsCount[key] || 0) + 1;

                if (!this.metricValues[key]) this.metricValues[key] = [];
                this.metricValues[key].push(val);
            }
        }
    }

    _processFrameIssuesStateful(frameIssues, time, stepSize) {
        const frameIssueTypes = new Set(frameIssues.map((i) => i.type));
        const dirtyIssues = [];
        const CLOSE_GRACE_PERIOD = 0.05; // seconds

        // 1. Update existing anomalies
        for (const [type, anomaly] of this.activeAnomalies.entries()) {
            if (frameIssueTypes.has(type)) {
                // Issue continues
                anomaly.duration += stepSize;
                anomaly.graceTime = 0; // Reset grace timer

                // Update value if needed
                const currentIssue = frameIssues.find((i) => i.type === type);
                if (currentIssue) {
                    anomaly.value = currentIssue.value;
                }

                const threshold = MIN_DURATION[type] || MIN_DURATION.default;
                if (anomaly.duration >= threshold) {
                    dirtyIssues.push({ ...anomaly });
                }
            } else {
                // Issue missing from this frame - check grace period
                anomaly.graceTime = (anomaly.graceTime || 0) + stepSize;

                appLog(
                    'HeadlessJob',
                    'debug',
                    `[Grace] ${type} missing. Grace: ${anomaly.graceTime.toFixed(3)}/${CLOSE_GRACE_PERIOD}. Time: ${time.toFixed(3)} Duration: ${anomaly.duration.toFixed(3)}`
                );

                if (anomaly.graceTime < CLOSE_GRACE_PERIOD) {
                    // Keep open and extend duration (bridge the gap)
                    anomaly.duration += stepSize;
                    const threshold =
                        MIN_DURATION[type] || MIN_DURATION.default;
                    if (anomaly.duration >= threshold) {
                        dirtyIssues.push({ ...anomaly });
                    }
                } else {
                    // Grace period expired - close it
                    appLog(
                        'HeadlessJob',
                        'debug',
                        `[Grace] ${type} expired. Closing. Time: ${time.toFixed(3)} Duration: ${anomaly.duration.toFixed(3)}`
                    );
                    const threshold =
                        MIN_DURATION[type] || MIN_DURATION.default;

                    if (anomaly.duration >= threshold) {
                        this.issues.push(anomaly);
                        dirtyIssues.push(anomaly); // Final update
                    }
                    this.activeAnomalies.delete(type);
                }
            }
        }

        // 2. Create new anomalies
        frameIssues.forEach((issue) => {
            if (!this.activeAnomalies.has(issue.type)) {
                appLog(
                    'HeadlessJob',
                    'debug',
                    `[Stateful] New ${issue.type} started at ${time.toFixed(3)}`
                );
                const newAnomaly = {
                    id: randomId(),
                    type: issue.type,
                    startTime: time,
                    duration: stepSize,
                    value: issue.value,
                    severity: 'warning',
                    graceTime: 0,
                };
                this.activeAnomalies.set(issue.type, newAnomaly);

                const threshold =
                    MIN_DURATION[issue.type] || MIN_DURATION.default;
                if (stepSize >= threshold) {
                    dirtyIssues.push({ ...newAnomaly });
                }
            }
        });

        return dirtyIssues;
    }

    _closeAllAnomalies(endTime) {
        const closed = [];
        for (const [type, anomaly] of this.activeAnomalies.entries()) {
            const threshold = MIN_DURATION[type] || MIN_DURATION.default;
            if (anomaly.duration >= threshold) {
                this.issues.push(anomaly);
                closed.push(anomaly);
            }
        }
        this.activeAnomalies.clear();
        return closed;
    }

    _finalizeResults(debugStats) {
        const results = {};

        for (const key in this.metricValues) {
            const values = this.metricValues[key];
            if (values.length === 0) continue;

            // 1. Basic Stats
            const sum = this.metricsAccumulator[key];
            const count = this.metricsCount[key];
            const avg = sum / count;

            // 2. Min / Max
            let min = values[0];
            let max = values[0];
            for (let i = 1; i < values.length; i++) {
                if (values[i] < min) min = values[i];
                if (values[i] > max) max = values[i];
            }

            // 3. Variance / StdDev
            // Welford's algorithm is better for running, but we have all values
            let sumDiffSq = 0;
            for (const v of values) {
                const diff = v - avg;
                sumDiffSq += diff * diff;
            }
            const variance = sumDiffSq / count;
            const stdDev = Math.sqrt(variance);

            // 4. 1% Low (1st Percentile)
            // We need to sort. Copy first to avoid mutating if we needed order (we don't, but safe practice)
            // For performance on large arrays, maybe just partial sort?
            // Full sort is O(N log N). For 1 hour @ 30fps = 100k frames. JS sort is fast enough.
            const sorted = [...values].sort((a, b) => a - b);
            const p1Index = Math.floor(values.length * 0.01);
            const p1Low = sorted[p1Index];

            // Store as object
            results[key] = {
                avg,
                min,
                max,
                variance,
                stdDev,
                p1Low,
                count,
            };

            // Backwards compatibility for code expecting just the number (if any)
            // JS objects can't be primitives, but we can add a valueOf?
            // No, better to update consumers. But for now, let's keep the structure clean.
        }

        // Calculate Quality Score using the new object structure
        let score = 100;
        // Access .avg for calculations
        if (results.luma?.avg < 16) score -= 15;
        if (results.blockiness?.avg > 40) score -= 10;
        if (results.audioLevel?.avg && results.audioLevel.avg < -50)
            score -= 20;

        // Add quality score to results as a full object too
        results.qualityScore = {
            avg: Math.max(0, score),
            val: Math.max(0, score),
        };

        qualityActions.completeJob(this.streamId, results, this.runId);
    }

    _normalizeSpeed(speed) {
        return (speed || 'deep').toUpperCase();
    }

    _findSegmentByTime(stream, time) {
        if (!stream) return null;

        const findInState = (stateMap) => {
            for (const state of stateMap.values()) {
                const seg = state.segments.find((s) => {
                    const timescale = s.timescale || 1;
                    const start = (s.periodStart || 0) + s.time / timescale;
                    const duration = s.duration / timescale;
                    return time >= start && time < start + duration;
                });
                if (seg) {
                    const timescale = seg.timescale || 1;
                    return {
                        segment: seg,
                        startTime:
                            (seg.periodStart || 0) + seg.time / timescale,
                        duration: seg.duration / timescale,
                    };
                }
            }
            return null;
        };

        let result = findInState(stream.dashRepresentationState);
        if (!result) result = findInState(stream.hlsVariantState);

        return result;
    }

    cancel() {
        appLog('HeadlessJob', 'info', `[${this.instanceId}] Cancel called`);
        this.isCancelled = true;
        this.cleanup();
    }

    cleanup() {
        if (this.currentWorkerTask) {
            this.currentWorkerTask.cancel();
            this.currentWorkerTask = null;
        }
        if (this.abortController) this.abortController.abort();
        if (this.videoProvider) this.videoProvider.destroy();
        if (this.audioProvider) this.audioProvider.destroy();
    }
}

class HeadlessAnalysisService {
    constructor() {
        this.activeJobs = new Map();
    }

    async startBatchAnalysis(streams, config, trackSelections = new Map()) {
        for (const stream of streams) {
            this.stopAnalysis(stream.id);
            // Use String(stream.id) to match Map keys which are strings
            const trackConfig = trackSelections.get(String(stream.id));
            const job = new HeadlessJob(stream.id, config, trackConfig);
            this.activeJobs.set(stream.id, job);

            job.run().then(() => {
                if (this.activeJobs.get(stream.id) === job) {
                    this.activeJobs.delete(stream.id);
                    // Analysis finished. The stream poller arbitration logic in
                    // primaryStreamMonitorService will naturally see the QC job is gone
                    // and resume the analyzer polling if applicable.
                }
            });
        }
    }

    stopAnalysis(streamId) {
        const job = this.activeJobs.get(streamId);
        if (job) {
            job.cancel();
            this.activeJobs.delete(streamId);
            qualityActions.removeJob(streamId);
        }
    }

    stopAll() {
        const ids = Array.from(this.activeJobs.keys());
        appLog(
            'HeadlessAnalysisService',
            'info',
            `Stopping all ${ids.length} active jobs.`
        );
        for (const id of ids) {
            this.stopAnalysis(id);
        }
    }
}

export const headlessAnalysisService = new HeadlessAnalysisService();
