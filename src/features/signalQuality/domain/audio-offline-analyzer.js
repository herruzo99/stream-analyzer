import { extractPesFromTs, stripPesHeaders } from '@/infrastructure/parsing/ts/demuxer.js';
import { appLog } from '@/shared/utils/debug';

export class AudioOfflineAnalyzer {
    constructor() {
        this.audioCtx = null;
    }

    _ensureContext() {
        if (!this.audioCtx) {
            const Ctx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
            if (Ctx) {
                this.audioCtx = new Ctx();
            }
        }

        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(e => console.debug("Auto-resume of AudioContext pending user interaction.", e));
        }

        if (!this.audioCtx) {
            throw new Error("AudioContext not supported or blocked.");
        }
        return this.audioCtx;
    }

    async analyze(buffers) {
        const ctx = this._ensureContext();

        if (!buffers || buffers.length === 0) {
            throw new Error("No audio buffers provided for analysis.");
        }

        let totalLength = 0;
        buffers.forEach(b => { if (b) totalLength += b.byteLength; });

        if (totalLength === 0) throw new Error("Empty buffer.");

        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of buffers) {
            if (buf) {
                combined.set(new Uint8Array(buf), offset);
                offset += buf.byteLength;
            }
        }

        // Explicit cast to ArrayBuffer to resolve TS2322 (Uint8Array.buffer is ArrayBufferLike)
        let decodeBuffer = /** @type {ArrayBuffer} */ (combined.buffer);
        let isTs = false;

        // Check for MPEG-TS Sync Byte (0x47)
        if (combined.length > 376 && combined[0] === 0x47 && combined[188] === 0x47) {
            isTs = true;
            appLog('AudioOfflineAnalyzer', 'info', 'Detected MPEG-TS. Demuxing...');

            // 1. Find Audio PID (Scan PAT/PMT)
            // We use a robust scan now instead of a stub, ensuring we find the right stream.
            const audioPid = this._findAudioPidInTs(combined);

            if (audioPid !== -1) {
                // 2. Extract PES
                const pesData = extractPesFromTs(combined, audioPid);
                if (pesData.byteLength > 0) {
                    // 3. Strip PES Headers
                    const esData = stripPesHeaders(pesData);
                    if (esData && esData.byteLength > 0) {
                        decodeBuffer = /** @type {ArrayBuffer} */ (esData.buffer);
                        isTs = false;
                        appLog('AudioOfflineAnalyzer', 'info', `Extracted ${esData.byteLength} bytes of Audio ES from PID ${audioPid}.`);
                    }
                }
            } else {
                appLog('AudioOfflineAnalyzer', 'warn', 'Could not find Audio PID in TS. Trying raw ADTS scan fallback.');
            }

            // Fallback: If PAT/PMT parsing failed or no audio PID found, try raw scan
            if (isTs) {
                const adtsData = this._scanForAdts(combined);
                if (adtsData && adtsData.byteLength > 0) {
                    decodeBuffer = /** @type {ArrayBuffer} */ (adtsData.buffer);
                    isTs = false;
                    appLog('AudioOfflineAnalyzer', 'info', `Recovered ${adtsData.byteLength} bytes via raw ADTS scan.`);
                }
            }
        }

        if (isTs) throw new Error("Failed to extract audio from TS.");

        try {
            // Decode
            const audioBuffer = await ctx.decodeAudioData(decodeBuffer.slice(0));
            return this._processPcm(audioBuffer);
        } catch (e) {
            throw new Error(`Audio Decode Failed: ${e.message}`);
        }
    }

    _findAudioPidInTs(tsData) {
        const PACKET_SIZE = 188;
        const len = tsData.length;
        let pmtPid = -1;

        // 1. Find PAT (PID 0) to get PMT PID
        // Scan first 1500 packets (approx 280KB) to reliably find PAT in interleaved content
        const PAT_SCAN_LIMIT = 1500;

        for (let i = 0; i < Math.min(len, PAT_SCAN_LIMIT * PACKET_SIZE); i += PACKET_SIZE) {
            if (tsData[i] !== 0x47) continue;
            const pid = ((tsData[i + 1] & 0x1F) << 8) | tsData[i + 2];

            if (pid === 0) { // PAT
                const adaptationCtrl = (tsData[i + 3] >> 4) & 0x03;
                let payloadOffset = 4;
                if (adaptationCtrl & 0x02) { // Adapt field present
                    payloadOffset += 1 + tsData[i + 4];
                }
                if (payloadOffset >= PACKET_SIZE) continue;

                payloadOffset += 1 + tsData[i + payloadOffset]; // Pointer field

                // Table ID for PAT is 0x00
                if (tsData[i + payloadOffset] === 0x00) {
                    // Header is 8 bytes
                    const sectionLen = ((tsData[i + payloadOffset + 1] & 0x0F) << 8) | tsData[i + payloadOffset + 2];
                    const sectionEnd = i + payloadOffset + 3 + sectionLen - 4; // -4 CRC

                    let entryOffset = i + payloadOffset + 8;
                    while (entryOffset < sectionEnd) {
                        const progNum = (tsData[entryOffset] << 8) | tsData[entryOffset + 1];
                        const progPid = ((tsData[entryOffset + 2] & 0x1F) << 8) | tsData[entryOffset + 3];
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

        if (pmtPid === -1) return -1;

        // 2. Find PMT to get Audio PID
        // Scan deeper (2000 packets) for PMT as it might follow the PAT
        const PMT_SCAN_LIMIT = 2000;

        for (let i = 0; i < Math.min(len, PMT_SCAN_LIMIT * PACKET_SIZE); i += PACKET_SIZE) {
            if (tsData[i] !== 0x47) continue;
            const pid = ((tsData[i + 1] & 0x1F) << 8) | tsData[i + 2];

            if (pid === pmtPid) {
                const adaptationCtrl = (tsData[i + 3] >> 4) & 0x03;
                let payloadOffset = 4;
                if (adaptationCtrl & 0x02) {
                    payloadOffset += 1 + tsData[i + 4];
                }
                if (payloadOffset >= PACKET_SIZE) continue;

                payloadOffset += 1 + tsData[i + payloadOffset];

                // PMT Table ID is 0x02
                if (tsData[i + payloadOffset] === 0x02) {
                    const sectionLen = ((tsData[i + payloadOffset + 1] & 0x0F) << 8) | tsData[i + payloadOffset + 2];
                    const progInfoLen = ((tsData[i + payloadOffset + 10] & 0x0F) << 8) | tsData[i + payloadOffset + 11];

                    let streamOffset = i + payloadOffset + 12 + progInfoLen;
                    const sectionEnd = i + payloadOffset + 3 + sectionLen - 4;

                    while (streamOffset < sectionEnd) {
                        const streamType = tsData[streamOffset];
                        const elemPid = ((tsData[streamOffset + 1] & 0x1F) << 8) | tsData[streamOffset + 2];
                        const esInfoLen = ((tsData[streamOffset + 3] & 0x0F) << 8) | tsData[streamOffset + 4];

                        // Audio Stream Types:
                        // 0x0F = AAC ADTS
                        // 0x03/0x04 = MP3
                        // 0x11 = LATM AAC
                        // 0x81-0x87 = AC-3 / EC-3 (User Private)
                        if ([0x0F, 0x03, 0x04, 0x11, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87].includes(streamType)) {
                            return elemPid;
                        }

                        streamOffset += 5 + esInfoLen;
                    }
                }
            }
        }

        return -1;
    }

    _scanForAdts(data) {
        const frames = [];
        let totalSize = 0;
        const len = data.length;

        for (let i = 0; i < len - 7; i++) {
            if (data[i] === 0xFF && (data[i + 1] & 0xF0) === 0xF0) {
                const s1 = data[i + 3] & 0x03;
                const s2 = data[i + 4];
                const s3 = data[i + 5] >> 5;
                const frameLen = (s1 << 11) | (s2 << 3) | s3;

                if (frameLen > 7 && (i + frameLen) <= len) {
                    frames.push(data.subarray(i, i + frameLen));
                    totalSize += frameLen;
                    i += frameLen - 1;
                }
            }
        }
        if (totalSize === 0) return null;
        const result = new Uint8Array(totalSize);
        let offset = 0;
        for (const f of frames) {
            result.set(f, offset);
            offset += f.length;
        }
        return result;
    }

    _processPcm(audioBuffer) {
        const channel0 = audioBuffer.getChannelData(0);
        const channel1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : channel0;
        const sampleRate = audioBuffer.sampleRate;
        const length = channel0.length;

        let firstSampleIndex = 0;
        const scanLimit = Math.min(length, sampleRate * 3600);

        // Skip silence
        for (let i = 0; i < scanLimit; i += 100) {
            if (Math.abs(channel0[i]) > 0.001 || Math.abs(channel1[i]) > 0.001) {
                firstSampleIndex = i;
                break;
            }
        }

        const windowSize = Math.floor(sampleRate / 25);
        const timeMap = new Map();
        const bucketSize = 0.04;

        for (let i = firstSampleIndex; i < length; i += windowSize) {
            const end = Math.min(i + windowSize, length);
            let sumSqL = 0, sumSqR = 0, peakL = 0, peakR = 0;

            for (let j = i; j < end; j++) {
                const l = channel0[j];
                const r = channel1[j];
                const absL = Math.abs(l);
                const absR = Math.abs(r);
                if (absL > peakL) peakL = absL;
                if (absR > peakR) peakR = absR;
                sumSqL += l * l;
                sumSqR += r * r;
            }
            const count = end - i;
            if (count === 0) break;
            const rmsL = Math.sqrt(sumSqL / count);
            const rmsR = Math.sqrt(sumSqR / count);

            // Phase calc removed for offline speed - use online if needed

            const rawTimestamp = (i - firstSampleIndex) / sampleRate;
            const bucketKey = Math.round(rawTimestamp / bucketSize) * bucketSize;
            const key = parseFloat(bucketKey.toFixed(2));

            timeMap.set(key, {
                audioLevel: (this._toDb(rmsL) + this._toDb(rmsR)) / 2,
                lLevel: this._toDb(rmsL),
                rLevel: this._toDb(rmsR),
                peak: Math.max(this._toDb(peakL), this._toDb(peakR)),
                phase: 0 // Placeholder
            });
        }
        return {
            duration: (length - firstSampleIndex) / sampleRate,
            metrics: timeMap
        };
    }

    _toDb(val) {
        return val > 0.00001 ? 20 * Math.log10(val) : -100;
    }

    calculateMetrics(audioFrame) {
        const channels = audioFrame.numberOfChannels;
        const frames = audioFrame.numberOfFrames;
        const format = audioFrame.format;

        // Helper to get channel data
        const getChannelData = (planeIndex) => {
            const size = audioFrame.allocationSize({ planeIndex });
            const buffer = new ArrayBuffer(size);
            audioFrame.copyTo(buffer, { planeIndex });

            // Handle common formats
            if (format === 'f32-planar' || format === 'f32') {
                return new Float32Array(buffer);
            } else if (format === 's16-planar' || format === 's16') {
                const int16 = new Int16Array(buffer);
                const float32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++) {
                    float32[i] = int16[i] / 32768.0;
                }
                return float32;
            } else if (format === 'u8-planar' || format === 'u8') {
                const uint8 = new Uint8Array(buffer);
                const float32 = new Float32Array(uint8.length);
                for (let i = 0; i < uint8.length; i++) {
                    float32[i] = (uint8[i] - 128) / 128.0;
                }
                return float32;
            }
            // Fallback: treat as f32
            return new Float32Array(buffer);
        };

        const data0 = getChannelData(0);
        let data1 = data0;

        // Handle Planar vs Interleaved
        // If planar, we get separate planes. If interleaved, plane 0 has all data.
        const isPlanar = format?.includes('planar');

        if (channels > 1 && isPlanar) {
            data1 = getChannelData(1);
        }

        let sumSqL = 0, sumSqR = 0, peakL = 0, peakR = 0;

        for (let i = 0; i < frames; i++) {
            let l, r;

            if (isPlanar) {
                l = data0[i] || 0;
                r = (channels > 1) ? (data1[i] || 0) : l;
            } else {
                // Interleaved: L, R, L, R...
                // data0 contains all samples
                const offset = i * channels;
                l = data0[offset] || 0;
                r = (channels > 1) ? (data0[offset + 1] || 0) : l;
            }

            const absL = Math.abs(l);
            const absR = Math.abs(r);

            if (absL > peakL) peakL = absL;
            if (absR > peakR) peakR = absR;

            sumSqL += l * l;
            sumSqR += r * r;
        }

        const rmsL = Math.sqrt(sumSqL / frames);
        const rmsR = Math.sqrt(sumSqR / frames);

        return {
            audioLevel: (this._toDb(rmsL) + this._toDb(rmsR)) / 2,
            lLevel: this._toDb(rmsL),
            rLevel: this._toDb(rmsR),
            peak: Math.max(this._toDb(peakL), this._toDb(peakR))
        };
    }
}

export const audioOfflineAnalyzer = new AudioOfflineAnalyzer();