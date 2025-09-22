/**
 * @typedef {object} TSPacket
 * @property {number} offset
 * @property {number} pid
 * @property {object} header
 * @property {object | null} adaptationField
 * @property {string} payloadType
 * @property {object | null} pes
 * @property {object | null} psi
 * @property {Record<string, { offset: number, length: number }>} fieldOffsets
 */

const TS_PACKET_SIZE = 188;
const SYNC_BYTE = 0x47;
const NULL_PACKET_PID = 0x1FFF;

const streamTypes = {
    0x02: 'MPEG-2 Video', 0x1b: 'H.264/AVC Video', 0x24: 'H.265/HEVC Video',
    0x03: 'MPEG-1 Audio', 0x04: 'MPEG-2 Audio', 0x0f: 'AAC Audio (ADTS)',
    0x11: 'AAC Audio (LATM)', 0x81: 'AC-3 Audio', 0x87: 'E-AC-3 Audio',
    0x06: 'Private Data (e.g., SCTE-35)',
};
const tableIds = { 0x00: 'PAT', 0x01: 'CAT', 0x02: 'PMT', 0x40: 'NIT', 0x42: 'SDT', 0x70: 'TDT' };

function parseTimestamp(view, offset) {
    const byte1 = view.getUint8(offset);
    const byte2 = view.getUint16(offset + 1);
    const byte3 = view.getUint16(offset + 3);
    return (((byte1 & 0x0e) >> 1) * (1 << 30)) + ((byte2 >> 1) * (1 << 15)) + (byte3 >> 1);
}

function parsePat(sectionData, summary) {
    let pmtPid = null;
    for (let pos = 8; pos < sectionData.byteLength - 4; pos += 4) {
        if (sectionData.getUint16(pos) !== 0) {
            pmtPid = sectionData.getUint16(pos + 2) & 0x1fff;
            summary.programMap[pmtPid] = { streams: {} };
        }
    }
    return pmtPid;
}

function parsePmt(sectionData, summary, pmtPid) {
    summary.pcrPid = sectionData.getUint16(8) & 0x1fff;
    const programInfoLength = sectionData.getUint16(10) & 0x0fff;
    let offset = 12 + programInfoLength;
    while (offset < sectionData.byteLength - 4) {
        const streamType = sectionData.getUint8(offset);
        const elementaryPid = sectionData.getUint16(offset + 1) & 0x1fff;
        const esInfoLength = sectionData.getUint16(offset + 3) & 0x0fff;
        summary.programMap[pmtPid].streams[elementaryPid] = streamTypes[streamType] || `Unknown (0x${streamType.toString(16)})`;
        offset += 5 + esInfoLength;
    }
}

/**
 * Performs a deep parse of an MPEG-2 Transport Stream segment.
 * @param {ArrayBuffer} buffer
 * @returns {{format: 'ts', data: {summary: object, packets: TSPacket[]}}}
 */
export function parseTsSegment(buffer) {
    const packets = [];
    const summary = { totalPackets: 0, programMap: {}, pids: {}, errors: [], pcrPid: null };
    const psiContinuity = {};
    const dataView = new DataView(buffer);
    let pmtPid = null;

    for (let offset = 0; offset + TS_PACKET_SIZE <= buffer.byteLength; offset += TS_PACKET_SIZE) {
        if (dataView.getUint8(offset) !== SYNC_BYTE) {
            summary.errors.push(`Sync byte missing at offset ${offset}.`);
            continue;
        }
        summary.totalPackets++;

        const byte1 = dataView.getUint8(offset + 1);
        const byte2 = dataView.getUint8(offset + 2);
        const byte3 = dataView.getUint8(offset + 3);
        
        const pid = ((byte1 & 0x1F) << 8) | byte2;

        const packet = {
            offset, pid, header: {}, adaptationField: null, payloadType: 'Data', pes: null, psi: null,
            fieldOffsets: { header: { offset, length: 4 } }
        };

        packet.header = {
            transportErrorIndicator: (byte1 >> 7) & 1,
            payloadUnitStartIndicator: (byte1 >> 6) & 1,
            transportPriority: (byte1 >> 5) & 1,
            scramblingControl: (byte3 >> 6) & 3,
            adaptationFieldControl: (byte3 >> 4) & 3,
            continuityCounter: byte3 & 0xF,
        };

        if (!summary.pids[pid]) summary.pids[pid] = { count: 0, type: 'Unknown' };
        summary.pids[pid].count++;

        if (pid === NULL_PACKET_PID) {
            packet.payloadType = 'Null Packet';
            summary.pids[pid].type = 'Null';
            packets.push(packet);
            continue;
        }

        let payloadOffset = offset + 4;
        if (packet.header.adaptationFieldControl & 2) {
            const afLength = dataView.getUint8(payloadOffset);
            packet.fieldOffsets.adaptationField = { offset: payloadOffset, length: afLength + 1 };
            if (afLength > 0) {
                const afFlags = dataView.getUint8(payloadOffset + 1);
                packet.adaptationField = {
                    length: afLength, discontinuityIndicator: (afFlags >> 7) & 1,
                    randomAccessIndicator: (afFlags >> 6) & 1, esPriorityIndicator: (afFlags >> 5) & 1,
                    pcrFlag: (afFlags >> 4) & 1, opcrFlag: (afFlags >> 3) & 1,
                    splicingPointFlag: (afFlags >> 2) & 1, transportPrivateDataFlag: (afFlags >> 1) & 1,
                    adaptationFieldExtensionFlag: afFlags & 1, pcr: null,
                };
                if (packet.adaptationField.pcrFlag && afLength >= 6) {
                    const pcrBase = (dataView.getUint32(payloadOffset + 2) * 2) + ((dataView.getUint8(payloadOffset + 6) >> 7) & 1);
                    packet.adaptationField.pcr = (pcrBase * 300) + (dataView.getUint16(payloadOffset + 6) & 0x1ff);
                }
            }
            payloadOffset += afLength + 1;
        }
        
        if ((packet.header.adaptationFieldControl & 1) && payloadOffset < offset + TS_PACKET_SIZE) {
            let payloadView = new DataView(buffer, payloadOffset, offset + TS_PACKET_SIZE - payloadOffset);
            if (packet.header.payloadUnitStartIndicator) {
                const pointerField = payloadView.getUint8(0);
                if (payloadOffset + pointerField + 1 < offset + TS_PACKET_SIZE) {
                   payloadOffset += pointerField + 1;
                   payloadView = new DataView(buffer, payloadOffset, offset + TS_PACKET_SIZE - payloadOffset);
                }
            }
            
            if (pid === 0 || pid === pmtPid || [0x11, 0x14].includes(pid)) {
                if (packet.header.payloadUnitStartIndicator) {
                    const tableId = payloadView.getUint8(0);
                    const sectionLength = payloadView.getUint16(1) & 0x0FFF;
                    psiContinuity[pid] = { buffer: new Uint8Array(sectionLength + 3), bytesWritten: 0, expectedLength: sectionLength + 3, tableId };
                }
                if (psiContinuity[pid]) {
                    const state = psiContinuity[pid];
                    const bytesToCopy = Math.min(payloadView.byteLength, state.expectedLength - state.bytesWritten);
                    state.buffer.set(new Uint8Array(payloadView.buffer, payloadView.byteOffset, bytesToCopy), state.bytesWritten);
                    state.bytesWritten += bytesToCopy;
                    if (state.bytesWritten >= state.expectedLength) {
                        const sectionView = new DataView(state.buffer.buffer);
                        packet.payloadType = `PSI (${tableIds[state.tableId] || 'Unknown'})`;
                        summary.pids[pid].type = tableIds[state.tableId] || `PSI ${state.tableId}`;
                        if (state.tableId === 0x00) pmtPid = parsePat(sectionView, summary) || pmtPid;
                        else if (state.tableId === 0x02) parsePmt(sectionView, summary, pid);
                        delete psiContinuity[pid];
                    }
                }
            } else if (packet.header.payloadUnitStartIndicator && (payloadOffset + 8 < offset + TS_PACKET_SIZE) && dataView.getUint32(payloadOffset) >>> 8 === 0x000001) {
                packet.payloadType = 'PES';
                packet.pes = { streamId: dataView.getUint8(payloadOffset + 3), packetLength: dataView.getUint16(payloadOffset + 4), pts: null, dts: null };
                packet.fieldOffsets.pesHeader = { offset: payloadOffset, length: 9 + dataView.getUint8(payloadOffset + 8) };
                const ptsDtsFlags = dataView.getUint8(payloadOffset + 7) >> 6;
                if (ptsDtsFlags & 2) packet.pes.pts = parseTimestamp(dataView, payloadOffset + 9);
                if (ptsDtsFlags & 1) packet.pes.dts = parseTimestamp(dataView, payloadOffset + 14);
            }
        }
        packets.push(packet);
    }
    
    // --- Final Pass: Update packet payload types from parsed PMT ---
    const pidTypeMap = {};
    if (pmtPid && summary.programMap[pmtPid]) {
        Object.entries(summary.programMap[pmtPid].streams).forEach(([pid, type]) => {
            pidTypeMap[pid] = type;
        });
    }

    packets.forEach(packet => {
        if (pidTypeMap[packet.pid] && packet.payloadType === 'Data') {
            packet.payloadType = pidTypeMap[packet.pid];
        }
    });

    return { format: 'ts', data: { summary, packets } };
}