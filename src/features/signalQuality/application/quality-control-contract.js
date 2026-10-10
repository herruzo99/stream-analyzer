import { redactPlayerText } from '@/features/playerSimulation/application/player-contract.js';

export const QUALITY_CONTROL_CONTRACT_LIMITS = Object.freeze({
    jobs: 8,
    streams: 8,
    issuesPerJob: 200,
    metricsPerJob: 32,
    layers: 32,
    label: 160,
    detail: 320,
});

/** @param {unknown} value @param {number} [limit] */
const text = (value, limit = QUALITY_CONTROL_CONTRACT_LIMITS.label) =>
    redactPlayerText(value, limit);
const finite = (value, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    Math.min(
        max,
        Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min)
    );
const timestamp = (value) =>
    Number.isFinite(Number(value)) ? Number(value) : null;

const projectTrack = (track, kind, index) =>
    Object.freeze({
        id: text(track?.id ?? `${kind}-${index + 1}`, 96),
        label: text(
            track?.label ??
                track?.lang ??
                track?.language ??
                `${kind} ${index + 1}`
        ),
    });

const projectStream = (stream) => {
    const videoTracks = stream?.manifest?.summary?.videoTracks ?? [];
    const audioTracks = stream?.manifest?.summary?.audioTracks ?? [];
    return Object.freeze({
        id: text(stream?.id, 96),
        label: text(stream?.name ?? 'Unnamed stream'),
        duration: finite(stream?.manifest?.duration, 0, 86400),
        videoTracks: Object.freeze(
            videoTracks
                .slice(0, 100)
                .map((track, index) => projectTrack(track, 'video', index))
        ),
        audioTracks: Object.freeze(
            audioTracks
                .slice(0, 100)
                .map((track, index) => projectTrack(track, 'audio', index))
        ),
    });
};

const metricRows = (job) => {
    const rows = [];
    const append = (key, value) => {
        if (
            rows.length >= QUALITY_CONTROL_CONTRACT_LIMITS.metricsPerJob ||
            !Number.isFinite(Number(value))
        )
            return;
        rows.push(
            Object.freeze({
                key: text(key, 96),
                label: text(
                    String(key)
                        .replace(/([a-z])([A-Z])/g, '$1 $2')
                        .replace(/[_.-]+/g, ' ')
                ),
                value: Number(value),
            })
        );
    };

    for (const [key, value] of Object.entries(job?.aggregateMetrics ?? {})) {
        if (value && typeof value === 'object') {
            for (const field of ['avg', 'min', 'max', 'p1Low', 'stdDev'])
                append(`${key}.${field}`, value[field]);
        } else {
            append(key, value);
        }
    }
    if (rows.length === 0) {
        const latest = job?.frameMetrics?.at?.(-1) ?? {};
        for (const [key, value] of Object.entries(latest)) append(key, value);
    }
    return Object.freeze(rows);
};

const projectIssue = (issue, index) =>
    Object.freeze({
        id: text(issue?.id ?? `issue-${index + 1}`, 96),
        type: text(issue?.type ?? 'quality finding', 96),
        detail: text(
            issue?.message ?? issue?.description ?? issue?.type ?? '',
            QUALITY_CONTROL_CONTRACT_LIMITS.detail
        ),
        start: finite(issue?.startTime ?? issue?.timestamp, 0, 86400),
        duration: finite(issue?.duration, 0, 86400),
    });

const projectJob = (streamId, job, stream) => {
    const startedAt = timestamp(job?.startTime);
    const updatedAt = timestamp(job?.updatedAt) ?? startedAt;
    const runId = text(job?.runId ?? 'legacy-run', 96);
    const provenanceComplete =
        job?.contractVersion === 1 &&
        job?.runId &&
        startedAt !== null &&
        updatedAt !== null &&
        updatedAt >= startedAt;
    const status = ['running', 'complete', 'error', 'unsupported'].includes(
        job?.status
    )
        ? job.status
        : 'error';
    const issues = Object.freeze(
        (Array.isArray(job?.issues) ? job.issues : [])
            .slice(-QUALITY_CONTROL_CONTRACT_LIMITS.issuesPerJob)
            .map(projectIssue)
    );
    return Object.freeze({
        id: text(streamId, 96),
        streamLabel: text(stream?.name ?? streamId ?? 'Unknown stream'),
        runId,
        status,
        statusLabel:
            status === 'unsupported'
                ? 'Unsupported capability'
                : status.replace(/^./, (character) => character.toUpperCase()),
        detail: text(
            job?.statusMessage ??
                (status === 'unsupported'
                    ? 'Required media capability is unavailable.'
                    : '')
        ),
        progress: finite(job?.progress, 0, 100),
        currentFrame: finite(job?.currentFrame),
        totalFrames: finite(job?.totalFrames),
        issueCount: issues.length,
        issues,
        metrics: metricRows(job),
        truncated:
            (job?.issues?.length ?? 0) >
                QUALITY_CONTROL_CONTRACT_LIMITS.issuesPerJob ||
            Object.keys(job?.aggregateMetrics ?? {}).length >
                QUALITY_CONTROL_CONTRACT_LIMITS.metricsPerJob,
        provenance: Object.freeze({
            complete: Boolean(provenanceComplete),
            freshness:
                provenanceComplete && status === 'running'
                    ? 'current'
                    : provenanceComplete
                      ? 'recorded'
                      : 'legacy',
            startedAt,
            updatedAt,
            completedAt: timestamp(job?.completedAt),
            mediaStartTime: timestamp(job?.mediaStartTime),
            config: Object.freeze({
                duration: finite(job?.config?.scanDuration, 0, 86400),
                offset: finite(job?.config?.scanStartOffset, 0, 86400),
                speed: text(job?.config?.scanSpeed ?? 'deep', 32),
                layers: Object.freeze(
                    Array.from(job?.config?.activeLayers ?? [])
                        .slice(0, QUALITY_CONTROL_CONTRACT_LIMITS.layers)
                        .map((layer) => text(layer, 64))
                ),
            }),
            tracks: Object.freeze({
                video: text(job?.trackDetails?.video ?? 'default'),
                audio: text(job?.trackDetails?.audio ?? 'default'),
            }),
        }),
    });
};

export function createQualityControlModel(qualityState, analysisState) {
    const allStreams = (analysisState?.streams ?? []).filter(
        (stream) => stream?.originalUrl || stream?.patchedManifestUrl
    );
    const streams = Object.freeze(
        allStreams
            .slice(0, QUALITY_CONTROL_CONTRACT_LIMITS.streams)
            .map(projectStream)
    );
    const streamById = new Map(
        (analysisState?.streams ?? []).map((stream) => [stream.id, stream])
    );
    const allJobs = Array.from(qualityState?.jobs?.entries?.() ?? []);
    const jobs = Object.freeze(
        allJobs
            .slice(0, QUALITY_CONTROL_CONTRACT_LIMITS.jobs)
            .map(([streamId, job]) =>
                projectJob(streamId, job, streamById.get(streamId))
            )
    );
    return Object.freeze({
        schemaVersion: 1,
        streams,
        jobs,
        selectedJobId: text(qualityState?.selectedJobId ?? '', 96) || null,
        limits: QUALITY_CONTROL_CONTRACT_LIMITS,
        truncated:
            allStreams.length > QUALITY_CONTROL_CONTRACT_LIMITS.streams ||
            allJobs.length > QUALITY_CONTROL_CONTRACT_LIMITS.jobs,
        configuration: Object.freeze({
            duration: finite(qualityState?.scanDuration, 1, 86400),
            offset: finite(qualityState?.scanStartOffset, 0, 86400),
            speed: ['deep', 'balanced', 'fast'].includes(
                qualityState?.scanSpeed
            )
                ? qualityState.scanSpeed
                : 'deep',
            layers: Object.freeze(
                Array.from(qualityState?.activeLayers ?? [])
                    .slice(0, QUALITY_CONTROL_CONTRACT_LIMITS.layers)
                    .map((layer) => text(layer, 64))
            ),
        }),
    });
}
