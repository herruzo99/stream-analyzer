import { parseHeader } from './header.js';
import { parseAdaptationField } from './adaptation-field.js';
import { parsePsiSection } from './psi-section.js';
import { parsePatPayload } from './pat.js';
import { parsePmtPayload } from './pmt.js';
import { parseCatPayload } from './cat.js';
import { parseTsdtPayload } from './tsdt.js';
import { parsePesHeader } from './pes.js';
import { parsePrivateSectionPayload } from './private-section.js';

const TS_PACKET_SIZE = 188;
const SYNC_BYTE = 0x47;

// From Table 2-34 of the specification.
const streamTypes = {
    0x02: 'MPEG-2 Video', 0x1b: 'H.264/AVC Video', 0x24: 'H.265/HEVC Video',
    0x03: 'MPEG-1 Audio', 0x04: 'MPEG-2 Audio', 0x0f: 'AAC Audio (ADTS)',
    0x11: 'AAC Audio (LATM)', 0x81: 'AC-3 Audio', 0x87: 'E-AC-3 Audio',
    0x06: 'Private Data (e.g., SCTE-35)',
};
const tableIds = { 0x00: 'PAT', 0x01: 'CAT', 0x02: 'PMT', 0x40: 'NIT', 0x42: 'SDT', 0x70: 'TDT' };


export function parseTsSegment(buffer) {
    const packets = [];
    const summary = { totalPackets: 0, errors: [], pmtPids: new Set(), programMap: {}, pcrPid: null };
    const dataView = new DataView(buffer);

    // 1st Pass: Find all PMT PIDs from all PATs in the segment and initialize programMap
    for (let offset = 0; offset + TS_PACKET_SIZE <= buffer.byteLength; offset += TS_PACKET_SIZE) {
        if (dataView.getUint8(offset) !== SYNC_BYTE) continue;
        const header = parseHeader(new DataView(buffer, offset, 4), offset);
        if (header.pid.value === 0x00 && header.payload_unit_start_indicator.value) {
            let afLength = (header.adaptation_field_control.value & 2) ? dataView.getUint8(offset + 4) + 1 : 0;
            let payloadOffset = 4 + afLength;
            if (payloadOffset >= TS_PACKET_SIZE) continue;
            const pointerField = dataView.getUint8(offset + payloadOffset);
            let sectionStart = offset + payloadOffset + 1 + pointerField;

            if (sectionStart < offset + TS_PACKET_SIZE) {
                const sectionView = new DataView(buffer, sectionStart);
                const { header: sectionHeader, payload } = parsePsiSection(sectionView);
                if(sectionHeader.table_id === '0x00') {
                    const pat = parsePatPayload(payload, sectionStart + 8);
                    pat.programs.forEach(p => {
                        if (p.type === 'program') {
                            const pmtPid = p.program_map_PID.value;
                            summary.pmtPids.add(pmtPid);
                             if (!summary.programMap[pmtPid]) {
                                summary.programMap[pmtPid] = {
                                    programNumber: p.program_number.value,
                                    streams: {}
                                };
                            }
                        }
                    });
                }
            }
        }
    }
    
    // 2nd Pass: Full parse of each packet
    for (let offset = 0; offset + TS_PACKET_SIZE <= buffer.byteLength; offset += TS_PACKET_SIZE) {
        if (dataView.getUint8(offset) !== SYNC_BYTE) continue;
        summary.totalPackets++;
        
        const packetView = new DataView(buffer, offset, TS_PACKET_SIZE);
        const header = parseHeader(packetView, offset);
        const pid = header.pid.value;
        const packet = { 
            offset, pid, header, adaptationField: null, payloadType: 'Data', pes: null, psi: null,
            fieldOffsets: { header: { offset, length: 4 } }
        };
        
        let payloadOffset = 4;
        if (header.adaptation_field_control.value & 2) {
            const afLength = dataView.getUint8(offset + payloadOffset);
            const afView = new DataView(buffer, offset + payloadOffset, afLength + 1);
            packet.adaptationField = parseAdaptationField(afView, offset + payloadOffset);
            packet.fieldOffsets.adaptationField = { offset: offset + payloadOffset, length: afLength + 1 };
            payloadOffset += afLength + 1;
        }

        if ((header.adaptation_field_control.value & 1) && payloadOffset < TS_PACKET_SIZE) {
            let sectionStartOffset = payloadOffset;
            if (header.payload_unit_start_indicator.value) {
                const pointerField = dataView.getUint8(offset + payloadOffset);
                packet.fieldOffsets.pointerField = { offset: offset + payloadOffset, length: pointerField + 1 };
                sectionStartOffset += pointerField + 1;
            }
            const payloadView = new DataView(buffer, offset + sectionStartOffset, TS_PACKET_SIZE - sectionStartOffset);

            if (pid === 0x00) {
                const { header: sectionHeader, payload, isValid, crc } = parsePsiSection(payloadView);
                const pat = parsePatPayload(payload, offset + sectionStartOffset + 8);
                pat.isValid = isValid; pat.header = sectionHeader; pat.crc = crc;
                packet.psi = pat;
                packet.payloadType = 'PSI (PAT)';
            } else if (pid === 0x01) {
                const { header: sectionHeader, payload, isValid, crc } = parsePsiSection(payloadView);
                const cat = parseCatPayload(payload, offset + sectionStartOffset + 8);
                cat.isValid = isValid; cat.header = sectionHeader; cat.crc = crc;
                packet.psi = cat;
                packet.payloadType = 'PSI (CAT)';
            } else if (pid === 0x02) {
                const { header: sectionHeader, payload, isValid, crc } = parsePsiSection(payloadView);
                const tsdt = parseTsdtPayload(payload, offset + sectionStartOffset + 8);
                tsdt.isValid = isValid; tsdt.header = sectionHeader; tsdt.crc = crc;
                packet.psi = tsdt;
                packet.payloadType = 'PSI (TSDT)';
            } else if (summary.pmtPids.has(pid)) {
                 const { header: sectionHeader, payload, isValid, crc } = parsePsiSection(payloadView);
                const pmt = parsePmtPayload(payload, offset + sectionStartOffset + 8);
                pmt.programNumber = sectionHeader.table_id_extension;
                pmt.isValid = isValid; pmt.header = sectionHeader; pmt.crc = crc;
                packet.psi = pmt;
                packet.payloadType = 'PSI (PMT)';
                
                if (summary.programMap[pid]) {
                    summary.programMap[pid].programNumber = pmt.programNumber;
                    summary.pcrPid = pmt.pcr_pid.value;
                    pmt.streams.forEach(stream => {
                        const streamTypeHex = parseInt(stream.stream_type.value, 16);
                        const streamTypeString = streamTypes[streamTypeHex] || `Unknown (${stream.stream_type.value})`;
                        summary.programMap[pid].streams[stream.elementary_PID.value] = streamTypeString;
                    });
                }
            } else if (header.payload_unit_start_indicator.value && (payloadView.byteLength >= 6) && (payloadView.getUint32(0) >>> 8 === 0x000001)) {
                packet.payloadType = 'PES';
                packet.pes = parsePesHeader(payloadView, offset + sectionStartOffset);
                if (packet.pes) {
                    const headerLength = 9 + (packet.pes.pes_header_data_length?.value || 0);
                    packet.fieldOffsets.pesHeader = { offset: offset + sectionStartOffset, length: headerLength };
                }
            }
        }
        packets.push(packet);
    }
    
    // Final pass to label elementary stream packets now that the full PMT is parsed
    const pidToStreamType = {};
    Object.values(summary.programMap).forEach(program => {
        Object.entries(program.streams).forEach(([pid, type]) => {
            pidToStreamType[pid] = type;
        });
    });

    packets.forEach(packet => {
        if (pidToStreamType[packet.pid] && packet.payloadType === 'Data') {
            packet.payloadType = pidToStreamType[packet.pid];
        }
    });
    
    return { format: 'ts', data: { summary, packets } };
}