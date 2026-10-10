import { createStore } from 'zustand/vanilla';

export const QUALITY_CONTROL_STORE_LIMITS = Object.freeze({
    jobs: 8,
    issuesPerJob: 200,
    frameMetricsPerJob: 50000,
    audioMetricsPerJob: 100000,
});

const matchesRun = (job, runId) => !runId || job.runId === runId;

const createInitialState = () => ({
    // Map of streamId -> JobState
    jobs: new Map(),

    // Global Configuration
    activeLayers: new Set([
        'metric_luma',
        'metric_motion',
        'metric_audio_level',
        'black_frame',
        'silence',
    ]),
    scanDuration: 30, // seconds
    scanStartOffset: 0, // seconds from start (or live edge)
    scanSpeed: 'deep', // 'deep' | 'balanced' | 'fast'

    // UI State
    selectedJobId: null, // If set, shows details for this streamId
});

export const useQualityStore = createStore((set, get) => ({
    ...createInitialState(),

    // --- Configuration Actions ---
    setLayerActive: (layerId, isActive) =>
        set((state) => {
            const newSet = new Set(state.activeLayers);
            if (isActive) newSet.add(layerId);
            else newSet.delete(layerId);
            return { activeLayers: newSet };
        }),

    setBulkLayersActive: (layerIds, isActive) =>
        set((state) => {
            const newSet = new Set(state.activeLayers);
            layerIds.forEach((id) => {
                if (isActive) newSet.add(id);
                else newSet.delete(id);
            });
            return { activeLayers: newSet };
        }),

    setConfig: (config) => set(config),

    setSelectedJobId: (streamId) => set({ selectedJobId: streamId }),

    // --- Job Management ---
    initJob: (
        streamId,
        totalFrames,
        config,
        trackDetails = null,
        metadata = {}
    ) =>
        set((state) => {
            const newJobs = new Map(state.jobs);
            if (
                !newJobs.has(streamId) &&
                newJobs.size >= QUALITY_CONTROL_STORE_LIMITS.jobs
            )
                return {};
            const startedAt = Number.isFinite(metadata.startedAt)
                ? metadata.startedAt
                : Date.now();
            newJobs.set(streamId, {
                runId: metadata.runId || null,
                contractVersion: 1,
                status: 'running', // 'running', 'complete', 'error', 'unsupported'
                progress: 0,
                statusMessage: 'Initializing...',
                currentFrame: 0,
                totalFrames,
                issues: [],
                sceneChanges: [], // Scene change detections
                frameMetrics: [],
                audioHistory: [], // High-resolution audio metrics
                aggregateMetrics: null,
                error: null,
                startTime: startedAt,
                updatedAt: startedAt,
                completedAt: null,
                mediaStartTime: null, // Absolute media timestamp where analysis started
                config, // Store the snapshot of configuration used for this job
                trackDetails, // Store resolution/audio track info { video: '1080p', audio: 'ENG' }
            });
            return { jobs: newJobs };
        }),

    updateJobProgress: (streamId, frameData, runId = null) =>
        set((state) => {
            const jobs = new Map(state.jobs);
            const job = jobs.get(streamId);
            if (!job || !matchesRun(job, runId)) return {};

            // Defensive Progress Calculation
            let progress = job.progress;
            let currentFrame = job.currentFrame;

            if (typeof frameData.progress === 'number') {
                progress = frameData.progress;
            } else if (
                typeof frameData.frameIndex === 'number' &&
                job.totalFrames > 0
            ) {
                progress = Math.min(
                    100,
                    (frameData.frameIndex / job.totalFrames) * 100
                );
            }

            if (typeof frameData.frameIndex === 'number') {
                currentFrame = frameData.frameIndex;
            }

            const updatedJob = {
                ...job,
                progress,
                currentFrame,
                updatedAt: Date.now(),
            };

            if (frameData.statusMessage) {
                updatedJob.statusMessage = frameData.statusMessage;
            }

            if (frameData.metrics) {
                // Keep last 50000 frames for CSV export
                updatedJob.frameMetrics = [
                    ...job.frameMetrics,
                    frameData.metrics,
                ].slice(-QUALITY_CONTROL_STORE_LIMITS.frameMetricsPerJob);
            }

            if (
                frameData.metricsBatch &&
                Array.isArray(frameData.metricsBatch)
            ) {
                // Append batch of metrics
                updatedJob.frameMetrics = [
                    ...job.frameMetrics,
                    ...frameData.metricsBatch,
                ].slice(-QUALITY_CONTROL_STORE_LIMITS.frameMetricsPerJob);
            }

            if (
                frameData.audioMetrics &&
                Array.isArray(frameData.audioMetrics)
            ) {
                // Append new audio metrics and keep last 100000 points (high density)
                updatedJob.audioHistory = [
                    ...job.audioHistory,
                    ...frameData.audioMetrics,
                ].slice(-QUALITY_CONTROL_STORE_LIMITS.audioMetricsPerJob);
            }

            if (frameData.segmentProgress) {
                updatedJob.segmentProgress = frameData.segmentProgress;
            }

            if (frameData.mediaStartTime !== undefined) {
                updatedJob.mediaStartTime = frameData.mediaStartTime;
            }

            jobs.set(streamId, updatedJob);
            return { jobs };
        }),

    addJobIssues: (streamId, newIssues, runId = null) =>
        set((state) => {
            const jobs = new Map(state.jobs);
            const job = jobs.get(streamId);
            if (!job || !matchesRun(job, runId)) return {};

            jobs.set(streamId, {
                ...job,
                issues: [...job.issues, ...newIssues].slice(
                    -QUALITY_CONTROL_STORE_LIMITS.issuesPerJob
                ),
                updatedAt: Date.now(),
            });
            return { jobs };
        }),

    // NEW: Supports updating existing issues (e.g. extending duration) or adding new ones
    upsertJobIssues: (streamId, updatedIssues, runId = null) =>
        set((state) => {
            const jobs = new Map(state.jobs);
            const job = jobs.get(streamId);
            if (!job || !matchesRun(job, runId)) return {};

            const existingIssuesMap = new Map(job.issues.map((i) => [i.id, i]));
            updatedIssues.forEach((issue) =>
                existingIssuesMap.set(issue.id, issue)
            );

            jobs.set(streamId, {
                ...job,
                issues: Array.from(existingIssuesMap.values())
                    .sort((a, b) => a.startTime - b.startTime)
                    .slice(-QUALITY_CONTROL_STORE_LIMITS.issuesPerJob),
                updatedAt: Date.now(),
            });
            return { jobs };
        }),

    addSceneChanges: (streamId, newSceneChanges, runId = null) =>
        set((state) => {
            const jobs = new Map(state.jobs);
            const job = jobs.get(streamId);
            if (!job || !matchesRun(job, runId)) return {};
            jobs.set(streamId, {
                ...job,
                sceneChanges: [...job.sceneChanges, ...newSceneChanges].sort(
                    (a, b) => a.timestamp - b.timestamp
                ),
            });
            return { jobs };
        }),

    completeJob: (streamId, aggregates, runId = null) =>
        set((state) => {
            const jobs = new Map(state.jobs);
            const job = jobs.get(streamId);
            if (!job || !matchesRun(job, runId)) return {};
            const completedAt = Date.now();

            jobs.set(streamId, {
                ...job,
                status: 'complete',
                progress: 100,
                statusMessage: 'Analysis Complete',
                aggregateMetrics: aggregates,
                updatedAt: completedAt,
                completedAt,
            });
            return { jobs };
        }),

    failJob: (streamId, error, runId = null, outcome = 'error') =>
        set((state) => {
            const jobs = new Map(state.jobs);
            const job = jobs.get(streamId);
            if (!job || !matchesRun(job, runId)) return {};
            const completedAt = Date.now();

            jobs.set(streamId, {
                ...job,
                status: outcome === 'unsupported' ? 'unsupported' : 'error',
                error,
                statusMessage: error, // Use the error message directly for UI visibility
                updatedAt: completedAt,
                completedAt,
            });
            return { jobs };
        }),

    removeJob: (streamId, runId = null) =>
        set((state) => {
            const jobs = new Map(state.jobs);
            const job = jobs.get(streamId);
            if (job && !matchesRun(job, runId)) return {};
            jobs.delete(streamId);
            return {
                jobs,
                selectedJobId:
                    state.selectedJobId === streamId
                        ? null
                        : state.selectedJobId,
            };
        }),

    resetAll: () => set(createInitialState()),
}));

export const qualityActions = useQualityStore.getState();
