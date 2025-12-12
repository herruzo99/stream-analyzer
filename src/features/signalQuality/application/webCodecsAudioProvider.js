import { frameAccessService } from '@/features/signalQuality/infrastructure/frame-access-service';
import { audioOfflineAnalyzer } from '@/features/signalQuality/domain/audio-offline-analyzer';
import { appLog } from '@/shared/utils/debug';

const AUDIO_DECODE_CACHE_SIZE = 10;

export class WebCodecsAudioProvider {
    constructor(streamId, trackId, profiler) {
        this.streamId = streamId;
        this.trackId = trackId;
        this.profiler = profiler;
        this.segments = [];
        this.decodedCache = new Map();
        this.stream = null;
        this.logCounter = 0;
        this.lastContextTime = undefined;
        this.onMetrics = null; // Callback for push-based metrics
    }

    setMetricsCallback(callback) {
        this.onMetrics = callback;
    }

    async initialize(stream) {
        this.stream = stream;

        if (this.isExternalMode) {
            appLog(
                'WebCodecsAudioProvider',
                'info',
                'Skipping segment lookup in external mode (Muxed Audio)'
            );
            return;
        }

        // Find audio segments
        const stateMap =
            stream.protocol === 'dash'
                ? stream.dashRepresentationState
                : stream.hlsVariantState;

        // In DASH, trackId corresponds to RepId. In HLS, it might be the variant or audio group.
        // For now, let's try to find the state that matches the trackId or is an audio track.

        let targetState = null;

        if (stream.protocol === 'dash') {
            // Keys in DASH state map are often prefixed with Period ID (e.g., "periodId-repId")
            // Try direct lookup first
            targetState = stateMap.get(this.trackId);

            if (!targetState) {
                // Try to find a key that ends with the track ID
                for (const [key, state] of stateMap.entries()) {
                    if (
                        key === this.trackId ||
                        key.endsWith(`-${this.trackId}`)
                    ) {
                        targetState = state;
                        break;
                    }
                }
            }

            if (!targetState) {
                appLog(
                    'WebCodecsAudioProvider',
                    'warn',
                    `Track ID ${
                        this.trackId
                    } not found in DASH state map. Available keys: ${Array.from(
                        stateMap.keys()
                    ).join(', ')}`
                );
            }
        } else {
            // HLS: trackId might be a Variant ID or an Audio Group ID.

            // 1. Try direct lookup (Variant ID)
            targetState = stateMap.get(this.trackId);

            // 2. If not found, check for "audio-audio" placeholder or fuzzy match
            if (!targetState) {
                const isPlaceholder = this.trackId === 'audio-audio';

                for (const [key, state] of stateMap.entries()) {
                    // Check if the state ITSELF is the audio track
                    if (state.mediaType === 'audio') {
                        // If placeholder, take the first audio track we find
                        if (isPlaceholder) {
                            targetState = state;
                            appLog(
                                'WebCodecsAudioProvider',
                                'info',
                                `Resolved placeholder '${this.trackId}' to audio track '${key}'`
                            );
                            break;
                        }

                        // Fuzzy match: check if key contains trackId or vice versa (case-insensitive)
                        if (
                            key
                                .toLowerCase()
                                .includes(this.trackId.toLowerCase()) ||
                            this.trackId
                                .toLowerCase()
                                .includes(key.toLowerCase()) ||
                            state.groupId === this.trackId
                        ) {
                            targetState = state;
                            appLog(
                                'WebCodecsAudioProvider',
                                'info',
                                `Fuzzy matched '${this.trackId}' to audio track '${key}'`
                            );
                            break;
                        }
                    }
                }
            }

            if (!targetState) {
                appLog(
                    'WebCodecsAudioProvider',
                    'warn',
                    `Track ID ${
                        this.trackId
                    } not found in HLS state map. Available keys: ${Array.from(
                        stateMap.keys()
                    ).join(', ')}`
                );
            }
        }

        if (!targetState) {
            // Fallback: search for any state that looks like audio
            appLog(
                'WebCodecsAudioProvider',
                'info',
                'Attempting fallback search for audio state...'
            );
            for (const [key, state] of stateMap.entries()) {
                const isAudio =
                    state.mediaType === 'audio' ||
                    (state.segments &&
                        state.segments.length > 0 &&
                        state.segments[0].mimeType?.startsWith('audio'));
                if (isAudio) {
                    targetState = state;
                    appLog(
                        'WebCodecsAudioProvider',
                        'info',
                        `Fallback found audio state with key: ${key}`
                    );
                    break;
                }
            }
        }

        if (targetState && targetState.segments) {
            this.segments = targetState.segments
                .filter((s) => s.type === 'Media')
                .sort(
                    (a, b) =>
                        this._getSegmentStartTime(a) -
                        this._getSegmentStartTime(b)
                );

            // Also keep track of init segment
            this.initSegment =
                targetState.initSegment ||
                targetState.segments.find((s) => s.type === 'Init');

            if (this.segments.length > 0) {
                const first = this.segments[0];
                const last = this.segments[this.segments.length - 1];
                appLog(
                    'WebCodecsAudioProvider',
                    'info',
                    `Initialized with ${
                        this.segments.length
                    } segments. Range: ${this._getSegmentStartTime(
                        first
                    ).toFixed(
                        3
                    )}s to ${this._getSegmentStartTime(last).toFixed(3)}s`
                );
            } else {
                appLog(
                    'WebCodecsAudioProvider',
                    'warn',
                    `Target state found but has 0 media segments.`
                );
            }
        } else {
            appLog(
                'WebCodecsAudioProvider',
                'warn',
                `No segments found for audio track ${this.trackId}. Target state found: ${!!targetState}`
            );
        }
    }

    _getSegmentStartTime(segment) {
        const timescale = segment.timescale || 1;
        // Use absolute presentation time (media time + PTO) to match VideoDecoder output
        // VideoDecoder outputs timestamps from the container, which are absolute.
        // segment.time is usually (mediaTime - PTO). So adding PTO gives back absolute mediaTime.
        return (
            (segment.time + (segment.presentationTimeOffset || 0)) / timescale
        );
    }

    _findSegment(time) {
        return this.segments.find((s) => {
            const start = this._getSegmentStartTime(s);
            const duration = s.duration / (s.timescale || 1);
            return time >= start && time < start + duration;
        });
    }

    setExternalMode(enabled) {
        this.isExternalMode = enabled;
        appLog(
            'WebCodecsAudioProvider',
            'info',
            `External mode set to ${enabled}`
        );
        if (enabled) {
            this.decodedCache.clear(); // Clear segment cache when switching to external mode
            this.externalDecoder = null; // Reset decoder
        } else {
            if (this.externalDecoder) {
                this.externalDecoder.close();
                this.externalDecoder = null;
            }
            this.decodedCache.clear(); // Clear external cache when switching back
        }
    }

    async feedExternalChunks(chunks, contextTime) {
        if (!this.isExternalMode) return;
        this.lastContextTime = contextTime;

        // Initialize buffer if needed
        if (!this.chunkBuffer) {
            this.chunkBuffer = [];
        }

        // Add new chunks to buffer
        this.chunkBuffer.push(...chunks);

        // Process buffer: Decode a batch of chunks to ensure steady progress without blocking
        // We process up to 50 chunks per frame.
        // AAC frame is ~21ms. 50 chunks ~= 1 second of audio.
        // At 30fps video, we can process 30 * 1s = 30s of audio per second of wall clock time.
        // This is plenty fast to catch up and stay ahead, while spreading load.

        const BATCH_SIZE = 50;
        const chunksToDecode = this.chunkBuffer.splice(0, BATCH_SIZE);

        if (chunksToDecode.length > 0) {
            for (const chunk of chunksToDecode) {
                // Split chunk into ADTS frames
                const adtsFrames = this._splitADTSFrames(chunk);

                if (adtsFrames.length === 0) {
                    // Fallback or just skip
                    continue;
                }

                // Extract config from first frame if needed
                if (!this.externalDecoder) {
                    const config = this._extractConfigFromData(adtsFrames[0]);
                    if (config) {
                        appLog(
                            'WebCodecsAudioProvider',
                            'info',
                            `Configuring external audio decoder: ${config.codec}, ${config.sampleRate}Hz, ${config.numberOfChannels}ch`
                        );
                        this.externalDecoder = new AudioDecoder({
                            output: (frame) => this._handleDecodedFrame(frame),
                            error: (e) =>
                                console.error(
                                    'External Audio Decoder Error',
                                    e
                                ),
                        });
                        this.externalDecoder.configure(config);
                        this.sampleRate = config.sampleRate; // Store for duration calc
                    }
                }

                if (
                    this.externalDecoder &&
                    this.externalDecoder.state === 'configured'
                ) {
                    let currentTimestamp = chunk.timestamp; // Start with chunk timestamp (microseconds)
                    const durationPerFrame =
                        (1024 / (this.sampleRate || 48000)) * 1000000; // microseconds

                    for (const frameData of adtsFrames) {
                        const encodedChunk = new EncodedAudioChunk({
                            type: 'key', // ADTS frames are self-contained
                            timestamp: currentTimestamp,
                            duration: durationPerFrame,
                            data: frameData,
                        });

                        this.externalDecoder.decode(encodedChunk);
                        currentTimestamp += durationPerFrame;
                    }
                }
            }
            // Yield once after batch if needed, but since batch is small, maybe not strictly necessary.
            // But HeadlessJob awaits us, so a small yield ensures UI responsiveness.
            await new Promise((r) => setTimeout(r, 0));
        }
    }

    _splitADTSFrames(chunk) {
        const chunks = [];
        const buffer = new ArrayBuffer(chunk.byteLength);
        chunk.copyTo(buffer);
        const data = new Uint8Array(buffer);

        let offset = 0;
        // let frameCount = 0;

        while (offset < data.length) {
            // Check for ADTS sync word (0xFFF)
            if (data[offset] !== 0xff || (data[offset + 1] & 0xf0) !== 0xf0) {
                // appLog('WebCodecsAudioProvider', 'warn', `Invalid ADTS sync word at offset ${offset}`);
                break;
            }

            // Parse frame length
            // Frame length is 13 bits starting at bit 30
            // Byte 3 (bits 24-31): xxxxxxxL
            // Byte 4 (bits 32-39): LLLLLLLL
            // Byte 5 (bits 40-47): LLLxxxxx
            const frameLength =
                ((data[offset + 3] & 0x03) << 11) |
                (data[offset + 4] << 3) |
                ((data[offset + 5] & 0xe0) >> 5);

            if (frameLength <= 0 || offset + frameLength > data.length) {
                // appLog('WebCodecsAudioProvider', 'warn', `Invalid ADTS frame length ${frameLength} at offset ${offset}`);
                break;
            }

            // Create new EncodedAudioChunk for this frame
            // We need to calculate the timestamp for this frame.
            // Assuming constant sample rate and frame size (1024 samples for AAC-LC)
            // But we don't know the duration of previous frames exactly without parsing config.
            // However, the input `chunk` has a timestamp.
            // If the input chunk is a PES packet, the timestamp applies to the first frame (PTS).
            // Subsequent frames should have timestamp = prev + duration.
            // Duration = 1024 / sampleRate * 1000000 (microseconds).

            // For now, let's just extract the data. We'll handle timestamp in the loop below.

            const frameData = data.slice(offset, offset + frameLength);
            chunks.push(frameData);

            offset += frameLength;
            // frameCount++;
        }

        // appLog('WebCodecsAudioProvider', 'debug', `Split chunk into ${frameCount} ADTS frames`);
        return chunks;
    }

    _extractConfigFromData(data) {
        if (data.length < 7) return null;

        if (data[0] === 0xff && (data[1] & 0xf0) === 0xf0) {
            // ADTS
            // const profile = (data[2] >> 6) & 0x03;
            const freqIdx = (data[2] >> 2) & 0x0f;
            const channelCfg =
                ((data[2] & 0x01) << 2) | ((data[3] >> 6) & 0x03);

            const frequencies = [
                96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000,
                12000, 11025, 8000, 7350, -1, -1, -1,
            ];
            const sampleRate = frequencies[freqIdx];

            if (sampleRate > 0) {
                return {
                    codec: 'mp4a.40.2', // Assume AAC LC for now
                    sampleRate: sampleRate,
                    numberOfChannels: channelCfg,
                };
            }
        }
        return null;
    }

    _extractConfigFromChunk(chunk) {
        const buffer = new ArrayBuffer(chunk.byteLength);
        chunk.copyTo(buffer);
        return this._extractConfigFromData(new Uint8Array(buffer));
    }

    _handleDecodedFrame(frame) {
        // Calculate metrics
        const metrics = audioOfflineAnalyzer.calculateMetrics(frame);

        // Cache metrics
        // Use frame timestamp (microseconds) converted to seconds
        const time = frame.timestamp / 1000000;

        let driftInfo = '';
        if (this.lastContextTime !== undefined) {
            const drift = time - this.lastContextTime;
            driftInfo = ` | Chart: ${this.lastContextTime.toFixed(
                3
            )}s | Drift: ${drift.toFixed(3)}s`;
        }

        if (this.logCounter++ % 50 === 0) {
            appLog(
                'WebCodecsAudioProvider',
                'debug',
                `Decoded audio frame at ${time.toFixed(3)}s${driftInfo}. Level: ${metrics.audioLevel.toFixed(1)}dB`
            );
        }
        this.decodedCache.set(time, metrics);

        // Emit metrics if callback is registered
        if (this.onMetrics) {
            this.onMetrics({
                timestamp: time,
                audioLevel: metrics.audioLevel,
                peak: metrics.peak,
            });
        }

        // Prune cache
        if (this.decodedCache.size > 2000) {
            // Increased cache size to handle full segments
            const keys = Array.from(this.decodedCache.keys()).sort(
                (a, b) => a - b
            );
            if (keys.length > 500) {
                // Prune a chunk at a time
                for (let i = 0; i < 100; i++) {
                    this.decodedCache.delete(keys[i]);
                }
            }
        }

        frame.close();
    }

    async getMetricsAt(time) {
        if (this.isExternalMode) {
            // Find closest metric in cache
            // Since we push chunks, they might be slightly ahead or behind.
            // We look for a metric within a tolerance.
            const tolerance = 0.1; // 100ms
            let bestTime = -1;
            let minDiff = Infinity;

            for (const t of this.decodedCache.keys()) {
                const diff = Math.abs(t - time);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestTime = t;
                }
            }

            if (bestTime !== -1 && minDiff <= tolerance) {
                return this.decodedCache.get(bestTime);
            } else {
                appLog(
                    'WebCodecsAudioProvider',
                    'debug',
                    `Audio metric miss for ${time.toFixed(
                        3
                    )}. Closest: ${bestTime.toFixed(3)} (diff: ${minDiff.toFixed(3)})`
                );
            }
            return null;
        }
        // 1. Find segment
        const segment = this._findSegment(time);
        if (!segment) {
            if (this.segments.length > 0) {
                const first = this._getSegmentStartTime(this.segments[0]);
                const lastSeg = this.segments[this.segments.length - 1];
                const last =
                    this._getSegmentStartTime(lastSeg) +
                    lastSeg.duration / (lastSeg.timescale || 1);
                appLog(
                    'WebCodecsAudioProvider',
                    'warn',
                    `No audio segment found for time ${time.toFixed(
                        3
                    )}. Available range: ${first.toFixed(3)} - ${last.toFixed(3)}`
                );
            } else {
                appLog(
                    'WebCodecsAudioProvider',
                    'warn',
                    `No audio segment found for time ${time.toFixed(
                        3
                    )}. No segments available.`
                );
            }
            return null;
        }

        // --- Aggressive Prefetch: Fire-and-forget load for NEXT audio segment ---
        const currentIndex = this.segments.indexOf(segment);
        if (currentIndex !== -1 && currentIndex + 1 < this.segments.length) {
            const nextSeg = this.segments[currentIndex + 1];
            const nextUrl = nextSeg.resolvedUrl || nextSeg.url;
            if (nextUrl) {
                // appLog('WebCodecsAudioProvider', 'debug', `Prefetching audio segment ${nextSeg.number}`);
                frameAccessService
                    .fetchSegment(
                        nextUrl,
                        nextSeg.range,
                        nextSeg.uniqueId,
                        this.streamId,
                        { isPrefetch: true }
                    )
                    .catch(() => {
                        // Ignore prefetch errors
                    });
            }
        }

        const uniqueId = segment.uniqueId || segment.url;

        // Check cache
        if (this.decodedCache.has(uniqueId)) {
            return this._lookupMetric(this.decodedCache.get(uniqueId), time);
        }
        const analysisStart = performance.now();
        // Fetch and Decode
        try {
            const url = segment.resolvedUrl || segment.url;
            // appLog('WebCodecsAudioProvider', 'info', `Fetching audio segment ${segment.number} for time ${time}`);
            const buffer = await frameAccessService.fetchSegment(
                url,
                segment.range,
                uniqueId,
                this.streamId
            );

            const buffersToDecode = [];

            if (this.initSegment && !url.endsWith('.ts')) {
                if (!this.initSegmentBuffer) {
                    const initUrl =
                        this.initSegment.resolvedUrl || this.initSegment.url;
                    const initUniqueId = this.initSegment.uniqueId || initUrl;
                    this.initSegmentBuffer =
                        await frameAccessService.fetchSegment(
                            initUrl,
                            this.initSegment.range,
                            initUniqueId,
                            this.streamId
                        );
                }
                buffersToDecode.push(this.initSegmentBuffer);
            }

            buffersToDecode.push(buffer);

            const analysis =
                await audioOfflineAnalyzer.analyze(buffersToDecode);

            this.profiler.addClient(
                'audio_decode',
                performance.now() - analysisStart
            );
            if (!analysis || !analysis.metrics || analysis.metrics.size === 0) {
                appLog(
                    'WebCodecsAudioProvider',
                    'warn',
                    `Audio analysis returned empty metrics for segment ${segment.number}`
                );
            } else {
                appLog(
                    'WebCodecsAudioProvider',
                    'info',
                    `Audio analysis success for segment ${segment.number}. Metrics count: ${analysis.metrics.size}`
                );
            }

            const start = this._getSegmentStartTime(segment);

            // Emit metrics for this segment (Push Model)
            if (this.onMetrics && analysis && analysis.metrics) {
                let emittedCount = 0;
                for (const [relTime, metric] of analysis.metrics.entries()) {
                    const absTime = start + relTime;
                    this.onMetrics({
                        timestamp: absTime,
                        audioLevel: metric.audioLevel,
                        peak: metric.peak,
                    });
                    emittedCount++;
                }
                appLog(
                    'WebCodecsAudioProvider',
                    'debug',
                    `Emitted ${emittedCount} audio metrics for segment ${segment.number}`
                );
            }

            const result = {
                startTime: start,
                metrics: analysis.metrics,
            };

            // Update cache
            if (this.decodedCache.size >= AUDIO_DECODE_CACHE_SIZE) {
                const firstKey = this.decodedCache.keys().next().value;
                this.decodedCache.delete(firstKey);
            }
            this.decodedCache.set(uniqueId, result);

            return this._lookupMetric(result, time);
        } catch (e) {
            this.profiler.addClient(
                'audio_decode_fail',
                performance.now() - (analysisStart || performance.now())
            );
            console.error('Audio processing failed', e);
            return null;
        }
    }

    async syncAudio(time) {
        // Wrapper to ensure audio at 'time' is loaded and analyzed.
        // The actual metrics are emitted via the callback in getMetricsAt.
        // appLog('WebCodecsAudioProvider', 'debug', `Syncing audio for time ${time}`);
        await this.getMetricsAt(time);
    }

    _lookupMetric(analysisData, time) {
        if (!analysisData) return null;
        const relativeTime = time - analysisData.startTime;
        const bucketKey = Math.round(relativeTime * 25) / 25;
        // Search neighborhood for sync issues
        return (
            analysisData.metrics.get(bucketKey) ||
            analysisData.metrics.get(bucketKey - 0.04) ||
            analysisData.metrics.get(bucketKey + 0.04) ||
            analysisData.metrics.get(bucketKey - 0.08)
        );
    }

    destroy() {
        this.decodedCache.clear();
        this.segments = [];
    }
}
