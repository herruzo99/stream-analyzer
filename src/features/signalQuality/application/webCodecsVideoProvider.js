import {
    frameAccessService,
    createVideoDecoder,
} from '@/features/signalQuality/infrastructure/frame-access-service';
// import { useAnalysisStore } from '@/state/analysisStore';
import { appLog } from '@/shared/utils/debug';

export class WebCodecsVideoProvider {
    constructor(streamId, profiler, enableAudioExtraction = false) {
        this.streamId = streamId;
        this.profiler = profiler;
        this.enableAudioExtraction = enableAudioExtraction;
        this.audioChunksQueue = [];
        this.frameQueue = [];
        this.currentSegmentIndex = -1;
        this.segments = [];
        this.isReady = false;
        this.stream = null;
        this.decoderConfig = null;
        this.videoTrackId = undefined;
        this.audioTrackId = undefined;
    }

    async initialize(stream, preferredTrackId = null) {
        appLog(
            'WebCodecsProvider',
            'info',
            `Initializing provider for stream ${stream.id}`,
            { preferredTrackId }
        );
        this.stream = stream;
        this._isLive = stream.isLive || stream.manifest?.type === 'dynamic';
        // Flatten segments from state
        const stateMap =
            stream.protocol === 'dash'
                ? stream.dashRepresentationState
                : stream.hlsVariantState;

        let targetState = null;

        // 0. Use preferred track ID if available
        if (preferredTrackId) {
            const state = stateMap.get(preferredTrackId);
            if (state && state.segments && state.segments.length > 0) {
                targetState = state;
                appLog(
                    'WebCodecsProvider',
                    'info',
                    `Using preferred video track: ${preferredTrackId}`
                );
            } else {
                appLog(
                    'WebCodecsProvider',
                    'warn',
                    `Preferred track ${preferredTrackId} not found or has no segments. Falling back to auto-selection.`
                );
            }
        }

        // 1. Try to find an explicit video track
        if (!targetState) {
            for (const state of stateMap.values()) {
                const isVideo =
                    state.mediaType === 'video' ||
                    (state.segments &&
                        state.segments.length > 0 &&
                        state.segments[0].mimeType?.startsWith('video'));

                if (isVideo && state.segments && state.segments.length > 0) {
                    targetState = state;
                    break;
                }
            }
        }

        // 2. Fallback: Find any track that is NOT audio
        if (!targetState) {
            for (const state of stateMap.values()) {
                const isAudio =
                    state.mediaType === 'audio' ||
                    (state.segments &&
                        state.segments.length > 0 &&
                        state.segments[0].mimeType?.startsWith('audio'));

                if (!isAudio && state.segments && state.segments.length > 0) {
                    targetState = state;
                    break;
                }
            }
        }

        // 3. Last Resort: First track with segments
        if (!targetState) {
            for (const state of stateMap.values()) {
                if (state.segments && state.segments.length > 0) {
                    targetState = state;
                    break;
                }
            }
        }

        if (!targetState) {
            throw new Error('No segments found for analysis.');
        }

        // Setup segments from targetState
        this.segments = targetState.segments
            .filter((s) => s.type === 'Media')
            .sort(
                (a, b) =>
                    this._getSegmentStartTime(a) - this._getSegmentStartTime(b)
            );

        let initSegment = targetState.initSegment;
        if (!initSegment) {
            const potentialInit = targetState.segments.find(
                (s) => s.type === 'Init'
            );
            if (potentialInit) initSegment = potentialInit;
        }

        if (this.segments.length > 0) {
            appLog(
                'WebCodecsProvider',
                'info',
                `Selected track for video analysis. First segment:`,
                this.segments[0]
            );
        }

        appLog(
            'WebCodecsProvider',
            'info',
            `Target State Codecs: ${targetState.codecs}`
        );

        // Load Init segment to configure decoder
        if (initSegment) {
            await this._loadInitSegment(initSegment, targetState.codecs);
        }

        this.isReady = true;
    }

    async _loadInitSegment(segment, codecOverride = null) {
        const url = segment.resolvedUrl || segment.url;
        if (!url) return;
        const initUniqueId = segment.uniqueId || url;
        appLog(
            'WebCodecsProvider',
            'info',
            `Loading Init segment (${url}) with codec override: ${codecOverride}`
        );
        try {
            const buffer = await frameAccessService.fetchSegment(
                url,
                segment.range,
                initUniqueId,
                this.streamId
            );
            const mime = url.endsWith('.ts') ? 'video/mp2t' : 'video/mp4';
            const timescale = segment.timescale || 1;
            const result = frameAccessService.demux(buffer, mime, timescale, {
                extractAudio: this.enableAudioExtraction,
                codec: codecOverride,
            });
            let {
                config,
                timescale: resultTimescale,
                videoTrackId,
                audioTrackId,
            } = result;

            appLog(
                'WebCodecsProvider',
                'info',
                `Demux result for Init segment:`,
                { config, resultTimescale, videoTrackId, audioTrackId }
            );

            // Capture timescale from Init segment if available
            if (resultTimescale && resultTimescale !== 1) {
                appLog(
                    'WebCodecsProvider',
                    'info',
                    `Updating provider timescale from Init segment to ${resultTimescale}`
                );
                this.timescale = resultTimescale;
            }

            // Capture Track IDs
            if (videoTrackId) this.videoTrackId = videoTrackId;
            if (audioTrackId) this.audioTrackId = audioTrackId;

            if (config) {
                this.decoderConfig = config;

                // Check support
                try {
                    let support = await VideoDecoder.isConfigSupported(config);
                    appLog(
                        'WebCodecsProvider',
                        'info',
                        `VideoDecoder support check (with description):`,
                        support
                    );

                    if (!support.supported) {
                        console.warn(
                            `[WebCodecs] Config not supported: ${config.codec}. Retrying without description...`
                        );

                        // Try without description (sometimes works if codec string is enough)
                        const configNoDesc = { ...config };
                        delete configNoDesc.description;
                        const supportNoDesc =
                            await VideoDecoder.isConfigSupported(configNoDesc);

                        if (supportNoDesc.supported) {
                            console.log(
                                '[WebCodecs] Supported without description!'
                            );
                            this.decoderConfig = configNoDesc;
                            config = configNoDesc;
                        } else {
                            // If still not supported, throw a specific error
                            throw new Error(
                                `Browser WebCodecs API does not support codec: ${config.codec}. This is common on Linux/Windows without HEVC extensions. Try Chrome on macOS or install OS media extensions.`
                            );
                        }
                    }
                } catch (e) {
                    appLog(
                        'WebCodecsProvider',
                        'error',
                        `VideoDecoder support check failed`,
                        e
                    );
                    throw e;
                }

                appLog(
                    'WebCodecsProvider',
                    'info',
                    `Creating VideoDecoder with config:`,
                    config
                );
                this.decoder = createVideoDecoder(
                    config,
                    (frame) => {
                        this.frameQueue.push(frame);
                    },
                    (e) => {
                        console.error('Decoder error', e);
                    }
                );
            } else {
                const msg = `No codec config found in Init segment. Analysis cannot proceed.`;
                appLog('WebCodecsProvider', 'error', msg);
                throw new Error(msg);
            }

            // Check if the codec indicates encryption (encv/enca)
            if (
                config &&
                (config.codec.startsWith('encv') ||
                    config.codec.startsWith('enca'))
            ) {
                const msg = `Encrypted stream detected (${config.codec}). WebCodecs analysis does not support DRM/Encryption. Please use a clear stream.`;
                appLog('WebCodecsProvider', 'error', msg);
                throw new Error(msg);
            }
        } catch (e) {
            console.error('Init segment load failed', e);
            throw e; // Rethrow to stop initialization
        }
    }

    _getSegmentStartTime(segment) {
        if (typeof segment.startTime === 'number') return segment.startTime;
        const timescale = segment.timescale || 1;
        return (segment.periodStart || 0) + segment.time / timescale;
    }

    async seek(time) {
        appLog('WebCodecsProvider', 'info', `Seeking to ${time}`);
        // Find segment containing time
        const index = this.segments.findIndex((s) => {
            const start = this._getSegmentStartTime(s);
            const duration = s.duration / (s.timescale || 1);
            // appLog('WebCodecsProvider', 'debug', `Checking segment ${s.number}: start=${start}, end=${start+duration}`);
            return time >= start && time < start + duration;
        });

        if (index === -1) {
            appLog(
                'WebCodecsProvider',
                'warn',
                `No segment found for time ${time}`
            );
            // If time is before first segment, start at 0
            if (
                this.segments.length > 0 &&
                time < this._getSegmentStartTime(this.segments[0])
            ) {
                this.currentSegmentIndex = 0;
            } else {
                return false; // End of stream
            }
        } else {
            this.currentSegmentIndex = index;
        }

        appLog(
            'WebCodecsProvider',
            'info',
            `Found segment index ${this.currentSegmentIndex}`
        );

        this.frameQueue = [];
        await this._loadCurrentSegment();

        // Skip frames until time
        let skipped = 0;
        while (this.frameQueue.length > 0) {
            const frame = this.frameQueue[0];
            if (frame.timestamp >= time * 1000000) {
                // timestamp is in microseconds
                break;
            }
            const f = this.frameQueue.shift();
            f.close();
            skipped++;
        }
        appLog(
            'WebCodecsProvider',
            'info',
            `Skipped ${skipped} frames to reach ${time}`
        );

        return true;
    }

    async getNextFrame() {
        // appLog('WebCodecsProvider', 'debug', `getNextFrame called. Queue size: ${this.frameQueue.length}`);
        while (this.frameQueue.length === 0) {
            // Load next segment
            this.currentSegmentIndex++;
            if (this.currentSegmentIndex >= this.segments.length) {
                appLog('WebCodecsProvider', 'info', 'End of segments reached');
                return null; // EOS
            }
            await this._loadCurrentSegment();
        }

        return this.frameQueue.shift();
    }

    async _loadCurrentSegment() {
        if (
            this.currentSegmentIndex < 0 ||
            this.currentSegmentIndex >= this.segments.length
        )
            return;
        const segment = this.segments[this.currentSegmentIndex];
        const url = segment.resolvedUrl || segment.url;
        if (!url) {
            console.error('Segment has no URL', segment);
            return;
        }

        // --- Aggressive Prefetch: Fire-and-forget load for NEXT segment ---
        // We rely on FrameAccessService/SegmentCacheStore to deduplicate the request
        // when we actually get to loading this segment.
        const nextIndex = this.currentSegmentIndex + 1;
        if (nextIndex < this.segments.length) {
            const nextSeg = this.segments[nextIndex];
            const nextUrl = nextSeg.resolvedUrl || nextSeg.url;
            if (nextUrl) {
                // appLog('WebCodecsProvider', 'debug', `Prefetching segment ${nextSeg.number}`);
                frameAccessService
                    .fetchSegment(
                        nextUrl,
                        nextSeg.range,
                        nextSeg.uniqueId,
                        this.streamId,
                        { isPrefetch: true }
                    )
                    .catch((e) => {
                        // Ignore prefetch errors, they will be caught when actually loading
                        // appLog('WebCodecsProvider', 'warn', `Prefetch failed for ${nextSeg.number}`, e);
                    });
            }
        }
        appLog(
            'WebCodecsProvider',
            'info',
            `Loading segment ${segment.number} (${url}) timescale=${segment.timescale}`
        );

        try {
            // Load current segment (will hit cache if already prefetched/in-progress)
            const buffer = await frameAccessService.fetchSegment(
                url,
                segment.range,
                segment.uniqueId,
                this.streamId
            );

            const mime = url.endsWith('.ts') ? 'video/mp2t' : 'video/mp4';
            const timescaleToUse = this.timescale || segment.timescale || 1;

            // Pass extractAudio option and Track IDs
            const result = frameAccessService.demux(
                buffer,
                mime,
                timescaleToUse,
                {
                    extractAudio: this.enableAudioExtraction,
                    videoTrackId: this.videoTrackId,
                    audioTrackId: this.audioTrackId,
                    baseTimeOffset: this._getSegmentStartTime(segment),
                }
            );
            const {
                chunks,
                config,
                audioChunks,
                timescale: resultTimescale,
            } = result;

            // Store audio chunks if any
            if (audioChunks && audioChunks.length > 0) {
                this.audioChunksQueue.push(...audioChunks);
            }

            // If we found a valid timescale in the segment (e.g. Init segment), store it
            if (resultTimescale && resultTimescale !== 1) {
                if (this.timescale !== resultTimescale) {
                    appLog(
                        'WebCodecsProvider',
                        'info',
                        `Updating provider timescale to ${resultTimescale}`
                    );
                    this.timescale = resultTimescale;
                }
            }

            if (config) {
                // Reconfigure if needed (e.g. resolution change or description change)
                if (
                    !this.decoderConfig ||
                    this.decoderConfig.codedWidth !== config.codedWidth ||
                    this.decoderConfig.codedHeight !== config.codedHeight ||
                    this.decoderConfig.description?.byteLength !==
                        config.description?.byteLength
                ) {
                    // Simple check for description change

                    this.decoderConfig = config;
                    if (this.decoder) {
                        if (this.decoder.state !== 'closed')
                            this.decoder.close(); // Close existing decoder before reconfiguring
                    }
                    this.decoder = createVideoDecoder(
                        config,
                        (frame) => {
                            this.frameQueue.push(frame);
                            this.frameQueue.sort(
                                (a, b) => a.timestamp - b.timestamp
                            );
                        },
                        (e) => {
                            console.error('Decoder error', e);
                        }
                    );
                }
            }

            for (const chunk of chunks) {
                if (this.decoder && this.decoder.state === 'configured') {
                    this.decoder.decode(chunk);
                }
            }

            if (this.decoder && this.decoder.state === 'configured') {
                await this.decoder.flush();
            }
        } catch (e) {
            console.error('Segment load failed', e);
            throw e;
        }
    }

    destroy() {
        if (this.frameQueue) {
            this.frameQueue.forEach((f) => f.close());
            this.frameQueue = [];
        }
        if (this.decoder) {
            if (this.decoder.state !== 'closed') this.decoder.close();
            this.decoder = null;
        }
    }

    isLive() {
        return this._isLive;
    }

    getSeekRange() {
        if (!this.segments || this.segments.length === 0)
            return { start: 0, end: 0 };
        const first = this.segments[0];
        const last = this.segments[this.segments.length - 1];
        const start = this._getSegmentStartTime(first);
        const end =
            this._getSegmentStartTime(last) +
            last.duration / (last.timescale || 1);
        return { start, end };
    }

    getAudioChunks() {
        const chunks = this.audioChunksQueue;
        this.audioChunksQueue = [];
        return chunks;
    }
}
