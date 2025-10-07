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

            const sectionView = new DataView(
                buffer,
                sectionStart,
                offset + TS_PACKET_SIZE - sectionStart
            );
            const { header: sectionHeader, payload: patPayloadView } =
                parsePsiSection(sectionView);
            if (sectionHeader.table_id === '0x00' && !sectionHeader.error) {
                // PAT
                const patPayloadOffset =
                    sectionStart +
                    (sectionHeader.section_syntax_indicator ? 8 : 3);
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

        if (pid !== 0x1fff) {
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

        const hasPayload = (header.adaptation_field_control.value & 1) !== 0;
        if (!hasPayload || payloadStart >= TS_PACKET_SIZE) {
            packets.push(packet);
            continue;
        }

        const isPsiPid =
            pid === 0x00 || // PAT
            pid === 0x01 || // CAT
            pid === 0x02 || // TSDT
            pid === 0x03 || // IPMP-CIT
            summary.pmtPids.has(pid) ||
            summary.privateSectionPids.has(pid);

        if (isPsiPid && header.payload_unit_start_indicator.value) {
            const pointerField = dataView.getUint8(offset + payloadStart);
            packet.fieldOffsets.pointerField = {
                offset: offset + payloadStart,
                length: pointerField + 1,
            };
            const sectionStartOffset = payloadStart + 1 + pointerField;

            if (sectionStartOffset < TS_PACKET_SIZE) {
                const sectionView = new DataView(
                    buffer,
                    offset + sectionStartOffset,
                    TS_PACKET_SIZE - sectionStartOffset
                );
                const {
                    header: sectionHeader,
                    payload,
                    isValid,
                    crc,
                } = parsePsiSection(sectionView);

                const payloadBaseOffset =
                    offset +
                    sectionStartOffset +
                    (sectionHeader.section_syntax_indicator ? 8 : 3);
                let parsedPayload;

                if (pid === 0x00) {
                    parsedPayload = parsePatPayload(payload, payloadBaseOffset);
                    packet.payloadType = 'PSI (PAT)';
                } else if (pid === 0x01) {
                    parsedPayload = parseCatPayload(payload, payloadBaseOffset);
                    packet.payloadType = 'PSI (CAT)';
                } else if (pid === 0x02) {
                    parsedPayload = parseTsdtPayload(
                        payload,
                        payloadBaseOffset
                    );
                    packet.payloadType = 'PSI (TSDT)';
                    summary.tsdt = parsedPayload;
                } else if (pid === 0x03) {
                    parsedPayload = parseIpmpPayload(
                        payload,
                        payloadBaseOffset
                    );
                    packet.payloadType = 'PSI (IPMP-CIT)';
                    summary.ipmp = parsedPayload;
                } else if (summary.pmtPids.has(pid)) {
                    const tableIdNum = parseInt(sectionHeader.table_id, 16);
                    if (tableIdNum === 0x02) {
                        parsedPayload = parsePmtPayload(
                            payload,
                            payloadBaseOffset
                        );
                        packet.payloadType = 'PSI (PMT)';
                        // ... (update summary.programMap logic)
                    } else if (tableIdNum >= 0x40 && tableIdNum <= 0xfe) {
                        parsedPayload = parsePrivateSectionPayload(
                            payload,
                            payloadBaseOffset,
                            sectionHeader.section_syntax_indicator,
                            sectionHeader.section_length
                        );
                        packet.payloadType = 'PSI (Private Section)';
                    }
                }

                if (parsedPayload) {
                    parsedPayload.isValid = isValid;
                    parsedPayload.header = sectionHeader;
                    parsedPayload.crc = crc;
                    packet.psi = parsedPayload;
                }
            }
        } else if (!isPsiPid) {
            // Potentially a PES packet or just data
            const pesView = new DataView(
                buffer,
                offset + payloadStart,
                TS_PACKET_SIZE - payloadStart
            );
            if (
                header.payload_unit_start_indicator.value &&
                pesView.byteLength >= 6 &&
                pesView.getUint32(0) >>> 8 === 0x000001
            ) {
                packet.payloadType = 'PES';
                const pesResult = parsePesHeader(
                    pesView,
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

    // Final pass to label elementary stream packets
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
