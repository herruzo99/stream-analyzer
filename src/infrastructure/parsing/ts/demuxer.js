/**
 * Extracts the payload of TS packets for a specific PID.
 * @param {Uint8Array} tsBuffer - The raw Transport Stream buffer.
 * @param {number} pid - The target PID to extract.
 * @returns {Uint8Array} The concatenated payloads (PES stream).
 */
export function extractPesFromTs(tsBuffer, pid) {
    const chunks = [];
    let totalLength = 0;
    const len = tsBuffer.byteLength;
    const PACKET_SIZE = 188;

    for (let i = 0; i < len; i += PACKET_SIZE) {
        // Sync byte check
        if (tsBuffer[i] !== 0x47) continue;

        const header1 = tsBuffer[i + 1];
        const header2 = tsBuffer[i + 2];
        const header3 = tsBuffer[i + 3];

        const currentPid = ((header1 & 0x1f) << 8) | header2;
        if (currentPid !== pid) continue;

        const adaptationFieldControl = (header3 >> 4) & 0x03;
        let payloadOffset = 4;

        // Adaptation Field present
        if (adaptationFieldControl & 0x02) {
            const afLen = tsBuffer[i + 4];
            payloadOffset += 1 + afLen;
        }

        // Payload present
        if (adaptationFieldControl & 0x01) {
            if (payloadOffset < PACKET_SIZE) {
                const payload = tsBuffer.subarray(
                    i + payloadOffset,
                    i + PACKET_SIZE
                );
                chunks.push(payload);
                totalLength += payload.length;
            }
        }
    }

    if (chunks.length === 0) return new Uint8Array(0);

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

/**
 * Strips PES headers from a PES stream to return the raw Elementary Stream (ES).
 * @param {Uint8Array} pesData - The concatenated PES data.
 * @returns {Uint8Array | null} The raw Elementary Stream, or null if parsing failed.
 */
export function stripPesHeaders(pesData) {
    const packets = parsePesPackets(pesData);
    if (packets.length === 0) return null;

    // Concatenate payloads
    let totalLen = packets.reduce((acc, p) => acc + p.data.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of packets) {
        result.set(p.data, offset);
        offset += p.data.length;
    }
    return result;
}

/**
 * Parses PES packets to extract PTS, DTS and payload.
 * @param {Uint8Array} pesData - The concatenated PES data.
 * @returns {Array<{pts: number, dts: number, data: Uint8Array}>} List of PES payloads with timestamps.
 */
export function parsePesPackets(pesData) {
    const packets = [];
    let i = 0;
    const len = pesData.length;

    while (i < len - 6) {
        // Check for Packet Start Code Prefix: 0x000001
        if (
            pesData[i] === 0x00 &&
            pesData[i + 1] === 0x00 &&
            pesData[i + 2] === 0x01
        ) {
            const streamId = pesData[i + 3];
            const packetLen = (pesData[i + 4] << 8) | pesData[i + 5];

            let payloadStart = i + 6;
            let pts = 0;
            let dts = 0;

            // Check for optional PES header fields
            if (
                (streamId >= 0xc0 && streamId <= 0xef) || // Audio
                (streamId >= 0xe0 && streamId <= 0xef) || // Video (overlap?) 0xE0-0xEF is Video. 0xC0-0xDF is Audio.
                streamId === 0xbd // Private 1
            ) {
                // Read Flags
                if (payloadStart + 2 < len) {
                    const flags2 = pesData[payloadStart + 1];
                    const pesHeaderDataLen = pesData[payloadStart + 2];

                    const ptsDtsFlags = (flags2 >> 6) & 0x03;
                    let headerOffset = payloadStart + 3;

                    if (ptsDtsFlags === 2 || ptsDtsFlags === 3) {
                        // Parse PTS
                        // PTS is 33 bits.
                        // Byte 0: 0010 (4) | PTS[32..30] (3) | 1 (1)
                        const p0 = pesData[headerOffset];
                        const p1 = pesData[headerOffset + 1];
                        const p2 = pesData[headerOffset + 2];
                        const p3 = pesData[headerOffset + 3];
                        const p4 = pesData[headerOffset + 4];

                        pts =
                            (p0 & 0x0e) * 536870912 + // (p0 & 0x0e) << 29
                            ((p1 & 0xff) << 22) +
                            ((p2 & 0xfe) << 14) +
                            ((p3 & 0xff) << 7) +
                            ((p4 & 0xfe) >> 1);

                        headerOffset += 5;
                    }

                    if (ptsDtsFlags === 3) {
                        // Parse DTS
                        const d0 = pesData[headerOffset];
                        const d1 = pesData[headerOffset + 1];
                        const d2 = pesData[headerOffset + 2];
                        const d3 = pesData[headerOffset + 3];
                        const d4 = pesData[headerOffset + 4];

                        dts =
                            (d0 & 0x0e) * 536870912 +
                            ((d1 & 0xff) << 22) +
                            ((d2 & 0xfe) << 14) +
                            ((d3 & 0xff) << 7) +
                            ((d4 & 0xfe) >> 1);
                    } else {
                        dts = pts;
                    }

                    payloadStart += 3 + pesHeaderDataLen;
                }
            }

            let packetEnd = len;
            if (packetLen > 0) {
                packetEnd = i + 6 + packetLen;
            }

            // Safety check
            if (packetEnd > len) packetEnd = len;

            if (payloadStart < packetEnd) {
                const data = pesData.subarray(payloadStart, packetEnd);
                packets.push({ pts, dts, data });
            }

            // Advance to next packet
            i = packetEnd;
        } else {
            // Scan forward to find next start code if we are misaligned
            i++;
        }
    }

    return packets;
}
