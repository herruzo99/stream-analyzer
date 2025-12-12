import { eventBus } from '@/application/event-bus';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { EVENTS } from '@/types/events';
import { appLog } from '@/shared/utils/debug';
import {
    extractPesFromTs,
    // stripPesHeaders,
    parsePesPackets,
} from '@/infrastructure/parsing/ts/demuxer.js';
import { parseAnnexBNalUnits } from '@/infrastructure/parsing/video/nal-parser.js';
import { parseISOBMFF } from '@/infrastructure/parsing/isobmff/parser.js';
import { parseSPS } from '@/infrastructure/parsing/video/sps.js';

/**
 * Service to handle manual segment loading, demuxing, and decoding
 * for frame-accurate analysis using WebCodecs.
 */
export class FrameAccessService {
    constructor() {
        this.decoder = null;
        this.outputCallback = null;
        this.errorCallback = null;
        this.pendingFrames = [];
        this.config = null;
    }

    /**
     * Fetches a segment, leveraging the application's central caching and network pipeline.
     * @param {string} url The URL of the resource.
     * @param {string | null} range Optional byte range.
     * @param {string} uniqueId A unique identifier for this segment request.
     * @param {number} streamId The ID of the parent stream for context.
     * @returns {Promise<ArrayBuffer>}
     */
    fetchSegment(url, range, uniqueId, streamId, options = {}) {
        const id = uniqueId || (range ? `${url}@media@${range}` : url);
        const { get, set } = useSegmentCacheStore.getState();

        return new Promise((resolve, reject) => {
            const cachedEntry = get(id);
            if (cachedEntry?.data) {
                return resolve(cachedEntry.data);
            }

            const onSegmentLoaded = ({ uniqueId: loadedId, entry }) => {
                if (loadedId === id) {
                    unsubscribe();
                    if (entry.status === 200 && entry.data) {
                        resolve(entry.data);
                    } else {
                        reject(
                            new Error(
                                `Failed to load segment ${id} (HTTP ${entry.status || 'Error'
                                })`
                            )
                        );
                    }
                }
            };
            const unsubscribe = eventBus.subscribe(
                EVENTS.SEGMENT.LOADED,
                onSegmentLoaded
            );

            if (!cachedEntry || cachedEntry.status !== -1) {
                const logMsg = options.isPrefetch
                    ? `Prefetching ${id} for stream ${streamId}`
                    : `Cache miss. Fetching ${id} for stream ${streamId}`;

                appLog('FrameAccessService', 'info', logMsg);

                set(id, { status: -1, data: null, parsedData: null });
                eventBus.dispatch(EVENTS.SEGMENT.FETCH, {
                    uniqueId: id,
                    streamId,
                    format: null, // Let worker infer
                    context: {},
                    options: { background: true },
                });
            }
        });
    }

    demux(buffer, mimeType, timescale = 1, optionsOrUniqueId) {
        appLog(
            'FrameAccessService',
            'info',
            `Demuxing ${buffer.byteLength} bytes with mime ${mimeType}`
        );

        let options = {};
        if (typeof optionsOrUniqueId === 'string') {
            options = { uniqueId: optionsOrUniqueId };
        } else if (
            typeof optionsOrUniqueId === 'object' &&
            optionsOrUniqueId !== null
        ) {
            options = optionsOrUniqueId;
        }

        appLog('FrameAccessService', 'info', `Demux options:`, options);

        let result;
        if (mimeType.includes('mp4')) {
            result = this._demuxMp4(buffer, timescale, options);
        } else if (
            mimeType.includes('mpegurl') ||
            mimeType.includes('ts') ||
            this._isTs(buffer)
        ) {
            result = this._demuxTs(buffer, mimeType, timescale, options);
        } else {
            throw new Error(`Unsupported MIME type: ${mimeType}`);
        }

        if (options.uniqueId) {
            const { set, get } = useSegmentCacheStore.getState();
            const existing = get(options.uniqueId);
            if (existing) {
                set(options.uniqueId, {
                    ...existing,
                    parsedData: {
                        ...result,
                    },
                });
            }
        }
        return result;
    }

    _isTs(buffer) {
        if (buffer.byteLength < 188) return false;
        const view = new DataView(buffer);
        return view.getUint8(0) === 0x47 && view.getUint8(188) === 0x47;
    }

    _demuxTs(buffer, mime, timescale, options = {}) {
        const { videoPid, audioPid } = this._findPids(buffer);
        appLog(
            'FrameAccessService',
            'info',
            `TS Scan: VideoPID=${videoPid}, AudioPID=${audioPid}`
        );

        if (videoPid === -1) {
            throw new Error('No video PID found in TS segment');
        }

        const pesData = extractPesFromTs(new Uint8Array(buffer), videoPid);
        const pesPackets = parsePesPackets(pesData);

        if (pesPackets.length === 0) {
            throw new Error('Failed to extract PES packets from TS');
        }

        const encodedChunks = [];
        let config = null;
        let sps = null;
        let pps = null;

        let totalLen = 0;
        const ptsMap = [];
        for (const packet of pesPackets) {
            ptsMap.push({ offset: totalLen, pts: packet.pts, dts: packet.dts });
            totalLen += packet.data.length;
        }

        const esData = new Uint8Array(totalLen);
        let offset = 0;
        for (const packet of pesPackets) {
            esData.set(packet.data, offset);
            offset += packet.data.length;
        }

        const nalUnits = parseAnnexBNalUnits(esData, 'avc');
        let currentAu = [];
        const accessUnits = [];

        for (let i = 0; i < nalUnits.length; i++) {
            const nal = nalUnits[i];
            const isAud = nal.type === 9;
            if (isAud && currentAu.length > 0) {
                accessUnits.push(currentAu);
                currentAu = [];
            } else if (
                nal.isIdr &&
                currentAu.length > 0 &&
                !currentAu.some((n) => n.type === 9)
            ) {
                accessUnits.push(currentAu);
                currentAu = [];
            }
            currentAu.push(nal);
            if (nal.type === 7)
                sps = esData.subarray(nal.offset, nal.offset + nal.length);
            if (nal.type === 8)
                pps = esData.subarray(nal.offset, nal.offset + nal.length);
        }
        if (currentAu.length > 0) accessUnits.push(currentAu);

        for (const au of accessUnits) {
            if (au.length === 0) continue;
            const firstNal = au[0];
            const auOffset = firstNal.offset;
            let bestPts = 0;
            for (let i = 0; i < ptsMap.length; i++) {
                if (ptsMap[i].offset <= auOffset) {
                    bestPts = ptsMap[i].pts;
                } else {
                    break;
                }
            }
            const isKey = au.some((n) => n.isIdr);
            let totalChunkLen = 0;
            const chunkParts = [];
            for (const nal of au) {
                const nalData = esData.subarray(
                    nal.offset,
                    nal.offset + nal.length
                );
                const lenHeader = new Uint8Array(4);
                new DataView(lenHeader.buffer).setUint32(0, nal.length, false);
                chunkParts.push(lenHeader);
                chunkParts.push(nalData);
                totalChunkLen += 4 + nal.length;
            }
            const chunkData = new Uint8Array(totalChunkLen);
            let chunkOffset = 0;
            for (const part of chunkParts) {
                chunkData.set(part, chunkOffset);
                chunkOffset += part.length;
            }
            encodedChunks.push(
                new EncodedVideoChunk({
                    type: isKey ? 'key' : 'delta',
                    timestamp: (bestPts / 90000) * 1000000,
                    duration: 0,
                    data: chunkData,
                })
            );
        }

        if (sps && pps) {
            const spsInfo = parseSPS(sps);
            if (spsInfo) {
                const avcC = this._buildAvcC(sps, pps);
                config = {
                    codec: 'avc1.42001e',
                    description: avcC,
                    codedWidth: spsInfo.width,
                    codedHeight: spsInfo.height,
                };
                const profile = sps[1].toString(16).padStart(2, '0');
                const compat = sps[2].toString(16).padStart(2, '0');
                const level = sps[3].toString(16).padStart(2, '0');
                config.codec = `avc1.${profile}${compat}${level}`;
            }
        }

        const audioChunks = [];
        if (options.extractAudio && audioPid !== -1) {
            const audioPes = extractPesFromTs(new Uint8Array(buffer), audioPid);
            const audioPackets = parsePesPackets(audioPes);
            for (const pkt of audioPackets) {
                audioChunks.push(
                    new EncodedAudioChunk({
                        type: 'key',
                        timestamp: (pkt.pts / 90000) * 1000000,
                        duration: 0,
                        data: pkt.data,
                    })
                );
            }
            if (audioChunks.length === 0) {
                appLog(
                    'FrameAccessService',
                    'warn',
                    `No audio chunks extracted from TS. AudioPID=${audioPid}`
                );
            }
        }

        return {
            chunks: encodedChunks,
            audioChunks,
            config,
            format: 'ts',
            mediaInfo: {
                video: config
                    ? {
                        codec: config.codec,
                        resolution: `${config.codedWidth}x${config.codedHeight}`,
                    }
                    : undefined,
            },
            timescale: 90000,
            videoTrackId: videoPid,
            audioTrackId: audioPid,
            samples: [],
            data: null,
        };
    }

    _demuxMp4(buffer, timescale, options = {}) {
        const parsed = parseISOBMFF(buffer);
        const samples = parsed.samples || [];

        const moov = this._findBox(parsed.data.boxes, 'moov');
        if (moov) {
            const trak = this._findBox(moov.children, 'trak');
            if (trak) {
                const mdia = this._findBox(trak.children, 'mdia');
                if (mdia) {
                    const mdhd = this._findBox(mdia.children, 'mdhd');
                    if (mdhd && mdhd.details && mdhd.details.timescale) {
                        const internalTimescale = mdhd.details.timescale.value;
                        if (
                            internalTimescale &&
                            internalTimescale !== timescale
                        ) {
                            appLog(
                                'FrameAccessService',
                                'info',
                                `Overriding manifest timescale (${timescale}) with MP4 mdhd timescale (${internalTimescale})`
                            );
                            timescale = internalTimescale;
                        }
                    }
                }
            }
        }

        let videoTrackId =
            options.videoTrackId != null ? options.videoTrackId : undefined;
        let audioTrackId =
            options.audioTrackId != null ? options.audioTrackId : undefined;

        if (moov) {
            const traks = moov.children.filter((b) => b.type === 'trak');
            for (const trak of traks) {
                const tkhd = this._findBox(trak.children, 'tkhd');
                const trackId = tkhd?.details.track_ID?.value;

                const mdia = this._findBox(trak.children, 'mdia');
                const minf = this._findBox(mdia?.children, 'minf');
                const stbl = this._findBox(minf?.children, 'stbl');
                const stsd = this._findBox(stbl?.children, 'stsd');

                if (stsd && stsd.children) {
                    for (const entry of stsd.children) {
                        if (
                            ['avc1', 'avc3', 'hvc1', 'hev1', 'encv'].includes(entry.type)
                        ) {
                            videoTrackId = trackId;
                        } else if (
                            ['mp4a', 'enca', 'samr'].includes(entry.type)
                        ) {
                            audioTrackId = trackId;
                        }
                    }
                }
            }
            if (videoTrackId)
                appLog(
                    'FrameAccessService',
                    'info',
                    `Identified Video Track ID: ${videoTrackId}`
                );
            if (audioTrackId)
                appLog(
                    'FrameAccessService',
                    'info',
                    `Identified Audio Track ID: ${audioTrackId}`
                );
        }

        let avc1 = this._findBox(parsed.data.boxes, 'avc1');
        const hvc1 =
            this._findBox(parsed.data.boxes, 'hvc1') ||
            this._findBox(parsed.data.boxes, 'hev1');

        // Check for encrypted video (encv) if avc1/hvc1 not found
        let encv = null;
        let isEncrypted = false;
        if (!avc1 && !hvc1) {
            encv = this._findBox(parsed.data.boxes, 'encv');
            if (encv) {
                isEncrypted = true;
                // Check if encv contains avcC (H.264)
                if (this._findBox(encv.children, 'avcC')) {
                    avc1 = encv; // Treat encv as avc1 for config extraction
                }
                // Future: Check for hvcC (H.265) inside encv if needed
            }
        }

        let config = null;

        if (avc1) {
            const avcC = this._findBox(avc1.children, 'avcC');
            if (avcC) {
                const offset = avcC.contentOffset;
                const size = avcC.size - avcC.headerSize;
                const description = buffer.slice(offset, offset + size);
                const view = new DataView(description);
                const profile = view.getUint8(1);
                const compat = view.getUint8(2);
                const level = view.getUint8(3);
                config = {
                    codec: isEncrypted ? 'encv' : `avc1.${this._toHex(profile)}${this._toHex(
                        compat
                    )}${this._toHex(level)}`,
                    originalCodec: `avc1.${this._toHex(profile)}${this._toHex(
                        compat
                    )}${this._toHex(level)}`,
                    description: description,
                    codedWidth: avc1.details.width?.value || 0,
                    codedHeight: avc1.details.height?.value || 0,
                };
                appLog(
                    'FrameAccessService',
                    'info',
                    `Found AVC config: ${config.codec}`
                );
            } else {
                appLog(
                    'FrameAccessService',
                    'warn',
                    'avc1 box found but no avcC child'
                );
            }
        } else if (hvc1) {
            const hvcC =
                this._findBox(hvc1.children, 'hvcC') ||
                this._findBox(hvc1.children, 'hevC');
            if (hvcC) {
                const offset = hvcC.contentOffset;
                const size = hvcC.size - hvcC.headerSize;
                const description = buffer.slice(offset, offset + size);

                // Consume the codec string generated by the hvcC parser.
                // Fallback to manifest-provided codec if parser fails.
                const codec = options.codec || hvcC.details.codecString?.value;

                config = {
                    codec: codec,
                    description: description,
                    codedWidth: hvc1.details.width?.value || 0,
                    codedHeight: hvc1.details.height?.value || 0,
                };
                appLog(
                    'FrameAccessService',
                    'info',
                    `Found HEVC config: ${config.codec} ${options.codec ? '(from manifest)' : '(parsed)'}`,
                    { hvcCDetails: hvcC.details, optionsCodec: options.codec }
                );
            } else {
                appLog(
                    'FrameAccessService',
                    'warn',
                    'hvc1/hev1 box found but no hvcC/hevC child'
                );
            }
        } else {
            if (samples.length === 0) {
                appLog(
                    'FrameAccessService',
                    'warn',
                    'No codec config found in potential Init segment. Box structure:'
                );
                this._logBoxStructure(parsed.data.boxes);
            }
        }

        const chunks = [];
        const audioChunks = [];

        let currentBaseTime = 0;

        samples.forEach((s, i) => {
            // Initialize currentBaseTime from the first sample's TFDT or fallback
            if (i === 0) {
                let baseTime = s.baseMediaDecodeTime;

                if ((baseTime === undefined || baseTime === 0) && options.baseTimeOffset !== undefined) {
                    if (options.baseTimeOffset > 0.1) {
                        baseTime = options.baseTimeOffset * timescale;
                    } else {
                        baseTime = 0;
                    }
                } else {
                    baseTime = baseTime || 0;
                }
                currentBaseTime = baseTime;
            }

            const cto = s.compositionTimeOffset || 0;
            const rawTimestamp = currentBaseTime + cto;
            const timestamp = (rawTimestamp / timescale) * 1000000;

            // Advance base time for next sample
            currentBaseTime += s.duration;

            let isKey = false;
            if (s.is_sync) {
                isKey = true;
            } else if (s.sampleFlags) {
                if (s.sampleFlags.sample_depends_on === 2) {
                    isKey = true;
                } else if (s.sampleFlags.sample_is_non_sync_sample === 0) {
                    isKey = true;
                }
            }
            isKey =
                s.is_sync ||
                s.sampleFlags?.sample_depends_on === 2 ||
                (s.sampleFlags && !s.sampleFlags.sample_is_non_sync_sample);
            const type = isKey ? 'key' : 'delta';
            if (!Number.isFinite(timestamp)) {
                console.warn(
                    '[FrameAccessService] Invalid timestamp detected',
                    { currentBaseTime, cto, timescale, sample: s }
                );
                return;
            }

            let isVideo = false;
            let isAudio = false;
            if (videoTrackId !== undefined) {
                if (s.trackId === videoTrackId) isVideo = true;
            } else {
                isVideo = true;
            }
            if (audioTrackId !== undefined && s.trackId === audioTrackId) {
                isAudio = true;
                isVideo = false;
            }

            if (isVideo) {
                chunks.push(
                    new EncodedVideoChunk({
                        type: type,
                        timestamp: timestamp,
                        duration: (s.duration / timescale) * 1000000,
                        data: new Uint8Array(buffer, s.offset, s.size),
                    })
                );
            } else if (isAudio && options.extractAudio) {
                audioChunks.push(
                    new EncodedAudioChunk({
                        type: 'key',
                        timestamp: timestamp,
                        duration: (s.duration / timescale) * 1000000,
                        data: new Uint8Array(buffer, s.offset, s.size),
                    })
                );
            }
        });

        if (chunks.length === 0) {
            appLog('FrameAccessService', 'warn', `No video chunks extracted from MP4`);
        }
        if (audioChunks.length === 0) {
            appLog('FrameAccessService', 'warn', `No audio chunks extracted from MP4`);
        }

        return {
            chunks,
            audioChunks,
            config,
            format: 'isobmff',
            data: parsed.data,
            timescale,
            samples: parsed.samples,
            videoTrackId,
            audioTrackId,
            mediaInfo: {
                video: config
                    ? {
                        codec: config.codec,
                        resolution: `${config.codedWidth}x${config.codedHeight}`,
                    }
                    : undefined,
            },
        };
    }

    _logBoxStructure(boxes, depth = 0) {
        if (!boxes) return;
        for (const box of boxes) {
            console.log('  '.repeat(depth) + box.type + ` (${box.size})`);
            if (box.children) {
                this._logBoxStructure(box.children, depth + 1);
            }
        }
    }

    _findBox(boxes, type) {
        if (!boxes) return null;
        for (const box of boxes) {
            if (box.type === type) return box;
            if (box.children) {
                const found = this._findBox(box.children, type);
                if (found) return found;
            }
        }
        return null;
    }

    _toHex(val) {
        return val.toString(16).padStart(2, '0');
    }

    _findPids(buffer) {
        const tsData = new Uint8Array(buffer);
        const PACKET_SIZE = 188;
        const len = tsData.length;
        let pmtPid = -1;

        const PAT_SCAN_LIMIT = 2000;
        for (
            let i = 0;
            i < Math.min(len, PAT_SCAN_LIMIT * PACKET_SIZE);
            i += PACKET_SIZE
        ) {
            if (tsData[i] !== 0x47) continue;
            const pid = ((tsData[i + 1] & 0x1f) << 8) | tsData[i + 2];

            if (pid === 0) {
                const adaptationCtrl = (tsData[i + 3] >> 4) & 0x03;
                let payloadOffset = 4;
                if (adaptationCtrl & 0x02) {
                    payloadOffset += 1 + tsData[i + 4];
                }
                if (payloadOffset >= PACKET_SIZE) continue;
                payloadOffset += 1 + tsData[i + payloadOffset];
                if (tsData[i + payloadOffset] === 0x00) {
                    const sectionLen =
                        ((tsData[i + payloadOffset + 1] & 0x0f) << 8) |
                        tsData[i + payloadOffset + 2];
                    const sectionEnd = i + payloadOffset + 3 + sectionLen - 4;
                    let entryOffset = i + payloadOffset + 8;
                    while (entryOffset < sectionEnd) {
                        const progNum =
                            (tsData[entryOffset] << 8) |
                            tsData[entryOffset + 1];
                        const progPid =
                            ((tsData[entryOffset + 2] & 0x1f) << 8) |
                            tsData[entryOffset + 3];
                        if (progNum !== 0) {
                            pmtPid = progPid;
                            break;
                        }
                        entryOffset += 4;
                    }
                }
            }
            if (pmtPid !== -1) break;
        }

        if (pmtPid === -1) return { videoPid: -1, audioPid: -1 };

        const PMT_SCAN_LIMIT = 3000;
        for (
            let i = 0;
            i < Math.min(len, PMT_SCAN_LIMIT * PACKET_SIZE);
            i += PACKET_SIZE
        ) {
            if (tsData[i] !== 0x47) continue;
            const pid = ((tsData[i + 1] & 0x1f) << 8) | tsData[i + 2];

            if (pid === pmtPid) {
                const adaptationCtrl = (tsData[i + 3] >> 4) & 0x03;
                let payloadOffset = 4;
                if (adaptationCtrl & 0x02) {
                    payloadOffset += 1 + tsData[i + 4];
                }
                if (payloadOffset >= PACKET_SIZE) continue;
                payloadOffset += 1 + tsData[i + payloadOffset];

                if (tsData[i + payloadOffset] === 0x02) {
                    const sectionLen =
                        ((tsData[i + payloadOffset + 1] & 0x0f) << 8) |
                        tsData[i + payloadOffset + 2];
                    const progInfoLen =
                        ((tsData[i + payloadOffset + 10] & 0x0f) << 8) |
                        tsData[i + payloadOffset + 11];
                    let streamOffset = i + payloadOffset + 12 + progInfoLen;
                    const sectionEnd = i + payloadOffset + 3 + sectionLen - 4;
                    let videoPid = -1;
                    let audioPid = -1;

                    while (streamOffset < sectionEnd) {
                        const streamType = tsData[streamOffset];
                        const elemPid =
                            ((tsData[streamOffset + 1] & 0x1f) << 8) |
                            tsData[streamOffset + 2];
                        const esInfoLen =
                            ((tsData[streamOffset + 3] & 0x0f) << 8) |
                            tsData[streamOffset + 4];

                        appLog(
                            'FrameAccessService',
                            'debug',
                            `PMT Entry: PID=${elemPid}, Type=0x${streamType
                                .toString(16)
                                .toUpperCase()}`
                        );

                        if (streamType === 0x1b || streamType === 0x24) {
                            videoPid = elemPid;
                        }
                        if (
                            streamType === 0x0f ||
                            streamType === 0x11 ||
                            streamType === 0x03 ||
                            streamType === 0x04 ||
                            streamType === 0x81 ||
                            streamType === 0x87
                        ) {
                            audioPid = elemPid;
                        }
                        streamOffset += 5 + esInfoLen;
                    }
                    return { videoPid, audioPid };
                }
            }
        }
        return { videoPid: -1, audioPid: -1 };
    }

    _buildAvcC(sps, pps) {
        const len = 6 + 2 + sps.length + 1 + 2 + pps.length;
        const buf = new Uint8Array(len);
        let i = 0;
        buf[i++] = 1;
        buf[i++] = sps[1];
        buf[i++] = sps[2];
        buf[i++] = sps[3];
        buf[i++] = 0xff;
        buf[i++] = 0xe1;
        buf[i++] = (sps.length >> 8) & 0xff;
        buf[i++] = sps.length & 0xff;
        buf.set(sps, i);
        i += sps.length;
        buf[i++] = 1;
        buf[i++] = (pps.length >> 8) & 0xff;
        buf[i++] = pps.length & 0xff;
        buf.set(pps, i);
        return buf.buffer;
    }
}

export const frameAccessService = new FrameAccessService();

/**
 * Creates and configures a WebCodecs VideoDecoder.
 * @param {VideoDecoderConfig} config The decoder configuration.
 * @param {(frame: VideoFrame) => void} onFrame The callback for decoded frames.
 * @param {(error: Error) => void} onError The callback for errors.
 * @returns {VideoDecoder}
 */
export function createVideoDecoder(config, onFrame, onError) {
    const decoder = new VideoDecoder({
        output: onFrame,
        error: onError,
    });
    decoder.configure(config);
    return decoder;
}