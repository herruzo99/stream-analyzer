const TS_PACKET_SIZE = 188;
const SYNC_BYTE = 0x47;

const streamTypes = {
    0x02: 'MPEG-2 Video',
    0x1b: 'H.264/AVC Video',
    0x24: 'H.265/HEVC Video',
    0x03: 'MPEG-1 Audio',
    0x04: 'MPEG-2 Audio',
    0x0f: 'AAC Audio (ADTS)',
    0x11: 'AAC Audio (LATM)',
    0x81: 'AC-3 Audio',
    0x87: 'E-AC-3 Audio',
    0x06: 'Private Data (e.g., Subtitles, SCTE-35)',
};

function parseTimestamp(view, offset) {
    const byte1 = view.getUint8(offset);
    const byte2 = view.getUint16(offset + 1);
    const byte3 = view.getUint16(offset + 3);
    const high = (byte1 & 0x0e) >> 1;
    const mid = byte2 >> 1;
    const low = byte3 >> 1;
    return high * (1 << 30) + mid * (1 << 15) + low;
}

export function parseTsSegment(buffer) {
    const analysis = {
        summary: {
            totalPackets: 0,
            patFound: false,
            pmtFound: false,
            errors: [],
            durationS: 0,
            ptsRange: { min: null, max: null },
        },
        pids: {},
    };

    const dataView = new DataView(buffer);
    let pmtPid = null;
    let programMap = {};

    for (
        let offset = 0;
        offset + TS_PACKET_SIZE <= buffer.byteLength;
        offset += TS_PACKET_SIZE
    ) {
        if (dataView.getUint8(offset) !== SYNC_BYTE) {
            analysis.summary.errors.push(
                `Sync byte missing at offset ${offset}. Attempting to recover.`
            );
            let nextSync = -1;
            for (
                let i = offset + 1;
                i < offset + TS_PACKET_SIZE * 2 && i < buffer.byteLength;
                i++
            ) {
                if (dataView.getUint8(i) === SYNC_BYTE) {
                    nextSync = i;
                    break;
                }
            }
            if (nextSync !== -1) {
                offset = nextSync - TS_PACKET_SIZE;
                continue;
            } else {
                analysis.summary.errors.push(
                    'Unrecoverable sync loss. Halting parse.'
                );
                break;
            }
        }

        analysis.summary.totalPackets++;
        const header = dataView.getUint32(offset);
        const pid = (header >> 8) & 0x1fff;
        const payloadUnitStart = (header >> 22) & 1;
        const adaptationFieldControl = (header >> 20) & 3;
        const continuityCounter = (header >> 24) & 0xf;

        if (!analysis.pids[pid]) {
            analysis.pids[pid] = {
                count: 0,
                streamType: 'Unknown',
                continuityErrors: 0,
                lastContinuityCounter: null,
                pts: [],
                dts: [],
            };
        }
        const pidData = analysis.pids[pid];
        pidData.count++;

        if (
            pidData.lastContinuityCounter !== null &&
            adaptationFieldControl & 1
        ) {
            const expectedCounter = (pidData.lastContinuityCounter + 1) % 16;
            if (continuityCounter !== expectedCounter) {
                pidData.continuityErrors++;
            }
        }
        pidData.lastContinuityCounter = continuityCounter;

        let payloadOffset = offset + 4;
        if (adaptationFieldControl & 2) {
            const adaptationFieldLength = dataView.getUint8(payloadOffset);
            payloadOffset += adaptationFieldLength + 1;
        }

        if (
            payloadUnitStart &&
            adaptationFieldControl & 1 &&
            payloadOffset < offset + TS_PACKET_SIZE
        ) {
            if (pid === 0x0000) {
                // PAT
                analysis.summary.patFound = true;
                const pointerField = dataView.getUint8(payloadOffset);
                const tableOffset = payloadOffset + pointerField + 1;
                if (tableOffset + 12 < offset + TS_PACKET_SIZE) {
                    pmtPid = dataView.getUint16(tableOffset + 10) & 0x1fff;
                    pidData.streamType = 'PAT';
                }
            } else if (pid === pmtPid) {
                // PMT
                analysis.summary.pmtFound = true;
                const pointerField = dataView.getUint8(payloadOffset);
                const tableOffset = payloadOffset + pointerField + 1;
                const sectionLength =
                    dataView.getUint16(tableOffset + 1) & 0xfff;
                const programInfoLength =
                    dataView.getUint16(tableOffset + 10) & 0xfff;
                let streamInfoOffset = tableOffset + 12 + programInfoLength;
                const endOfStreams = tableOffset + 3 + sectionLength - 4;
                pidData.streamType = `PMT`;

                while (
                    streamInfoOffset < endOfStreams &&
                    streamInfoOffset + 5 <= offset + TS_PACKET_SIZE
                ) {
                    const streamType = dataView.getUint8(streamInfoOffset);
                    const elementaryPid =
                        dataView.getUint16(streamInfoOffset + 1) & 0x1fff;
                    const esInfoLength =
                        dataView.getUint16(streamInfoOffset + 3) & 0xfff;
                    programMap[elementaryPid] =
                        streamTypes[streamType] ||
                        `Unknown (0x${streamType.toString(16)})`;
                    streamInfoOffset += 5 + esInfoLength;
                }
            } else if (
                payloadOffset + 6 < offset + TS_PACKET_SIZE &&
                dataView.getUint32(payloadOffset) >>> 8 === 0x000001
            ) {
                // PES
                const ptsDtsFlags = dataView.getUint8(payloadOffset + 7) >> 6;
                let timestampOffset = payloadOffset + 9;

                if (ptsDtsFlags & 2) {
                    const pts = parseTimestamp(dataView, timestampOffset);
                    pidData.pts.push(pts);
                    if (
                        analysis.summary.ptsRange.min === null ||
                        pts < analysis.summary.ptsRange.min
                    )
                        analysis.summary.ptsRange.min = pts;
                    if (
                        analysis.summary.ptsRange.max === null ||
                        pts > analysis.summary.ptsRange.max
                    )
                        analysis.summary.ptsRange.max = pts;
                    timestampOffset += 5;
                }
                if (ptsDtsFlags & 1) {
                    const dts = parseTimestamp(dataView, timestampOffset);
                    pidData.dts.push(dts);
                }
            }
        }
    }

    Object.entries(programMap).forEach(([pid, type]) => {
        if (analysis.pids[pid]) analysis.pids[pid].streamType = type;
    });
    if (analysis.summary.ptsRange.max !== null) {
        analysis.summary.durationS = parseFloat(
            (
                (analysis.summary.ptsRange.max -
                    (analysis.summary.ptsRange.min || 0)) /
                90000
            ).toFixed(3)
        );
    }

    return { format: 'ts', data: analysis };
}