import { parseHeader } from './parsers/header.js';
import { parseAdaptationField } from './parsers/adaptation-field.js';
import { parsePsiSection } from './parsers/psi-section.js';
import { parsePatPayload } from './parsers/pat.js';
import { parsePmtPayload } from './parsers/pmt.js';
import { parseCatPayload } from './parsers/cat.js';
import { parseTsdtPayload } from './parsers/tsdt.js';
import { parsePrivateSectionPayload } from './parsers/private-section.js';
import { parseIpmpPayload } from './parsers/ipmp.js';
import { parsePesHeader } from './parsers/pes.js';
import { parseDsmccPayload } from './parsers/dsm-cc.js';

const TS_PACKET_SIZE = 188;
const SYNC_BYTE = 0x47;

// From Table 2-34 of the specification.
const streamTypes = {
    0x02: 'MPEG-2 Video',
    0x05: 'Private Section Data',
    0x08: 'DSM-CC Data',
    0x1b: 'H.264/AVC Video',
    0x24: 'H.265/HEVC Video',
    0x03: 'MPEG-1 Audio',
    0x04: 'MPEG-2 Audio',
    0x0f: 'AAC Audio (ADTS)',
    0x11: 'AAC Audio (LATM)',
    0x81: 'AC-3 Audio',
    0x87: 'E-AC-3 Audio',
    0x06: 'Private Data (in PES)',
};

export function parseTsSegment(buffer) {
    const packets = [];
    const summary = {
        totalPackets: 0,
        errors: [],
        pmtPids: new Set(),
        privateSectionPids: new Set(),
        dsmccPids: new Set(),
        programMap: {},
        pcrPid: null,
        pcrList: [],
        continuityCounters: {},
        tsdt: null,
        ipmp: null,
    };
    const dataView = new DataView(buffer);

    // 1st Pass: Find all PMT PIDs from all PATs in the segment and initialize programMap
    for (
        let offset = 0;
        offset + TS_PACKET_SIZE <= buffer.byteLength;
        offset += TS_PACKET_SIZE
    ) {
        if (dataView.getUint8(offset) !== SYNC_BYTE) continue;
        const header = parseHeader(new DataView(buffer, offset, 4), offset);
        if (
            header.pid.value === 0x00 &&
            header.payload_unit_start_indicator.value
        ) {
            let afLength =
                header.adaptation_field_control.value & 2
                    ? dataView.getUint8(offset + 4) + 1
                    : 0;
            let payloadOffset = offset + 4 + afLength;
            if (payloadOffset >= offset + TS_PACKET_SIZE) continue;

            const pointerField = dataView.getUint8(payloadOffset);
            let sectionStart = payloadOffset + 1 + pointerField;
            if (sectionStart >= offset + TS_PACKET_SIZE) continue;

            // FIX: The DataView must be bounded by the end of the current TS packet.
            const sectionView = new DataView(
                buffer,
                sectionStart,
                offset + TS_PACKET_SIZE - sectionStart
            );
            const { header: sectionHeader } = parsePsiSection(sectionView);
            if (sectionHeader.table_id === '0x00' && !sectionHeader.error) {
                // PAT
                const patPayloadView = new DataView(buffer, sectionStart + 8);
                const patPayloadOffset = sectionStart + 8;
                const pat = parsePatPayload(patPayloadView, patPayloadOffset);
                pat.programs.forEach((p) => {
                    if (p.type === 'program') {
                        const pmtPid = p.program_map_PID.value;
                        summary.pmtPids.add(pmtPid);
                        if (!summary.programMap[pmtPid]) {
                            summary.programMap[pmtPid] = {
                                programNumber: p.program_number.value,
                                streams: {},
                            };
                        }
                    }
                });
            }
        }
    }

    // 2nd Pass: Full parse of each packet
    for (
        let offset = 0;
        offset + TS_PACKET_SIZE <= buffer.byteLength;
        offset += TS_PACKET_SIZE
    ) {
        if (dataView.getUint8(offset) !== SYNC_BYTE) continue;
        summary.totalPackets++;

        const packetView = new DataView(buffer, offset, TS_PACKET_SIZE);
        const header = parseHeader(packetView, offset);
        const pid = header.pid.value;
        const packet = {
            offset,
            pid,
            header,
            adaptationField: null,
            payloadType: 'Data',
            pes: null,
            psi: null,
            fieldOffsets: { header: { offset, length: 4 } },
        };

        // Collect continuity counter for semantic analysis
        if (pid !== 0x1fff) {
            // Ignore null packets
            if (!summary.continuityCounters[pid]) {
                summary.continuityCounters[pid] = [];
            }
            summary.continuityCounters[pid].push({
                cc: header.continuity_counter.value,
                offset: offset,
                hasPayload: (header.adaptation_field_control.value & 1) !== 0,
            });
        }

        let payloadStart = 4;
        if (header.adaptation_field_control.value & 2) {
            const afLength = dataView.getUint8(offset + payloadStart);
            const afView = new DataView(
                buffer,
                offset + payloadStart,
                afLength + 1
            );
            packet.adaptationField = parseAdaptationField(
                afView,
                offset + payloadStart
            );
            packet.fieldOffsets.adaptationField = {
                offset: offset + payloadStart,
                length: afLength + 1,
            };
            if (packet.adaptationField.pcr) {
                summary.pcrList.push({
                    pcr: BigInt(packet.adaptationField.pcr.value),
                    offset: offset,
                });
            }
            payloadStart += afLength + 1;
        }

        if (
            header.adaptation_field_control.value & 1 &&
            payloadStart < TS_PACKET_SIZE
        ) {
            let sectionStartOffset = payloadStart;
            if (header.payload_unit_start_indicator.value) {
                const pointerField = dataView.getUint8(offset + payloadStart);
                packet.fieldOffsets.pointerField = {
                    offset: offset + payloadStart,
                    length: pointerField + 1,
                };
                sectionStartOffset += pointerField + 1;
            }
            if (sectionStartOffset >= TS_PACKET_SIZE) {
                packets.push(packet);
                continue;
            }

            const payloadView = new DataView(
                buffer,
                offset + sectionStartOffset,
                TS_PACKET_SIZE - sectionStartOffset
            );

            if (pid === 0x00 && header.payload_unit_start_indicator.value) {
                const {
                    header: sectionHeader,
                    payload,
                    isValid,
                    crc,
                } = parsePsiSection(payloadView);
                const pat = parsePatPayload(
                    payload,
                    offset +
                        sectionStartOffset +
                        (sectionHeader.section_syntax_indicator ? 8 : 3)
                );
                pat.isValid = isValid;
                pat.header = sectionHeader;
                pat.crc = crc;
                packet.psi = pat;
                packet.payloadType = 'PSI (PAT)';
            } else if (
                pid === 0x01 &&
                header.payload_unit_start_indicator.value
            ) {
                const {
                    header: sectionHeader,
                    payload,
                    isValid,
                    crc,
                } = parsePsiSection(payloadView);
                const cat = parseCatPayload(
                    payload,
                    offset +
                        sectionStartOffset +
                        (sectionHeader.section_syntax_indicator ? 8 : 3)
                );
                cat.isValid = isValid;
                cat.header = sectionHeader;
                cat.crc = crc;
                packet.psi = cat;
                packet.payloadType = 'PSI (CAT)';
            } else if (
                pid === 0x02 &&
                header.payload_unit_start_indicator.value
            ) {
                const {
                    header: sectionHeader,
                    payload,
                    isValid,
                    crc,
                } = parsePsiSection(payloadView);
                const tsdt = parseTsdtPayload(
                    payload,
                    offset +
                        sectionStartOffset +
                        (sectionHeader.section_syntax_indicator ? 8 : 3)
                );
                tsdt.isValid = isValid;
                tsdt.header = sectionHeader;
                tsdt.crc = crc;
                packet.psi = tsdt;
                packet.payloadType = 'PSI (TSDT)';
                summary.tsdt = tsdt; // Store the parsed TSDT in the summary
            } else if (
                pid === 0x03 &&
                header.payload_unit_start_indicator.value
            ) {
                const {
                    header: sectionHeader,
                    payload,
                    isValid,
                    crc,
                } = parsePsiSection(payloadView);
                const ipmp = parseIpmpPayload(
                    payload,
                    offset +
                        sectionStartOffset +
                        (sectionHeader.section_syntax_indicator ? 8 : 3)
                );
                ipmp.isValid = isValid;
                ipmp.header = sectionHeader;
                ipmp.crc = crc;
                packet.psi = ipmp;
                packet.payloadType = 'PSI (IPMP-CIT)';
                summary.ipmp = ipmp;
            } else if (
                (summary.pmtPids.has(pid) ||
                    summary.privateSectionPids.has(pid)) &&
                header.payload_unit_start_indicator.value
            ) {
                const {
                    header: sectionHeader,
                    payload,
                    isValid,
                    crc,
                } = parsePsiSection(payloadView);

                const tableIdNum = parseInt(sectionHeader.table_id, 16);

                if (tableIdNum === 0x02) {
                    // PMT
                    const pmt = parsePmtPayload(
                        payload,
                        offset +
                            sectionStartOffset +
                            (sectionHeader.section_syntax_indicator ? 8 : 3)
                    );
                    pmt.programNumber = sectionHeader.table_id_extension;
                    pmt.isValid = isValid;
                    pmt.header = sectionHeader;
                    pmt.crc = crc;
                    packet.psi = pmt;
                    packet.payloadType = 'PSI (PMT)';

                    if (summary.programMap[pid]) {
                        summary.programMap[pid].programNumber =
                            pmt.programNumber;
                        summary.pcrPid = pmt.pcr_pid.value;
                        pmt.streams.forEach((stream) => {
                            const streamTypeHex = parseInt(
                                stream.stream_type.value,
                                16
                            );
                            const streamTypeString =
                                streamTypes[streamTypeHex] ||
                                `Unknown (${stream.stream_type.value})`;
                            summary.programMap[pid].streams[
                                stream.elementary_PID.value
                            ] = streamTypeString;
                            if (streamTypeHex === 0x05) {
                                summary.privateSectionPids.add(
                                    stream.elementary_PID.value
                                );
                            }
                            if (streamTypeHex === 0x08) {
                                summary.dsmccPids.add(
                                    stream.elementary_PID.value
                                );
                            }
                        });
                    }
                } else if (tableIdNum >= 0x40 && tableIdNum <= 0xfe) {
                    // Private Section
                    const privateSection = parsePrivateSectionPayload(
                        payload,
                        offset + sectionStartOffset + 3, // Base payload offset
                        sectionHeader.section_syntax_indicator,
                        sectionHeader.section_length
                    );
                    privateSection.isValid = isValid;
                    privateSection.header = sectionHeader;
                    privateSection.crc = crc;
                    packet.psi = privateSection;
                    packet.payloadType = 'PSI (Private Section)';
                }
            } else if (
                header.payload_unit_start_indicator.value &&
                payloadView.byteLength >= 6 &&
                payloadView.getUint32(0) >>> 8 === 0x000001
            ) {
                packet.payloadType = 'PES';
                const pesResult = parsePesHeader(
                    payloadView,
                    offset + payloadStart
                );

                if (pesResult) {
                    packet.pes = pesResult.header;
                    const headerLength = pesResult.payloadOffset;
                    packet.fieldOffsets.pesHeader = {
                        offset: offset + payloadStart,
                        length: headerLength,
                    };

                    const streamId = parseInt(packet.pes.stream_id.value, 16);
                    if (streamId === 0xf2) {
                        // DSM-CC stream
                        packet.payloadType = 'PES (DSM-CC)';
                        const dsmccPayloadOffset = payloadStart + headerLength;
                        if (
                            offset + dsmccPayloadOffset <
                            offset + TS_PACKET_SIZE
                        ) {
                            const dsmccView = new DataView(
                                buffer,
                                offset + dsmccPayloadOffset,
                                offset +
                                    TS_PACKET_SIZE -
                                    (offset + dsmccPayloadOffset)
                            );
                            packet.pes.payload = parseDsmccPayload(
                                dsmccView,
                                offset + dsmccPayloadOffset
                            );
                        }
                    }
                }
            }
        }
        packets.push(packet);
    }

    // Final pass to label elementary stream packets now that the full PMT is parsed
    const pidToStreamType = {};
    Object.values(summary.programMap).forEach((program) => {
        Object.entries(program.streams).forEach(([pid, type]) => {
            pidToStreamType[pid] = type;
        });
    });

    packets.forEach((packet) => {
        if (pidToStreamType[packet.pid] && packet.payloadType === 'Data') {
            packet.payloadType = pidToStreamType[packet.pid];
        } else if (packet.pid === 0x1fff) {
            packet.payloadType = 'Null Packet';
        }
    });

    return { format: 'ts', data: { summary, packets } };
}
