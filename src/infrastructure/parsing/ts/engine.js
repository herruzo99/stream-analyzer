import { analyzeSemantics } from '../../../features/compliance/domain/semantic-analyzer.js';
import { parseAdaptationField } from './parsers/adaptation-field.js';
import { parseCatPayload } from './parsers/cat.js';
import { parseDsmccPayload } from './parsers/dsm-cc.js';
import { parseHeader } from './parsers/header.js';
import { parseIpmpPayload } from './parsers/ipmp.js';
import { parsePatPayload } from './parsers/pat.js';
import { parsePesHeader } from './parsers/pes.js';
import { parsePmtPayload } from './parsers/pmt.js';
import { parsePrivateSectionPayload } from './parsers/private-section.js';
import { parsePsiSection } from './parsers/psi-section.js';
import { parseTsdtPayload } from './parsers/tsdt.js';

const TS_PACKET_SIZE = 188;
const SYNC_BYTE = 0x47;

const KNOWN_PIDS = {
    0x00: 'PSI (PAT)',
    0x01: 'PSI (CAT)',
    0x02: 'PSI (TSDT)',
    0x03: 'PSI (IPMP)',
    0x10: 'PSI (NIT)', // DVB Network Information
    0x11: 'PSI (SDT)', // DVB Service Description
    0x12: 'PSI (EIT)', // DVB Event Information
    0x13: 'PSI (RST)', // DVB Running Status
    0x14: 'PSI (TDT/TOT)', // DVB Time/Date
    0x1fff: 'Null Packet',
};

/**
 * Summarizes the PCR list into meaningful statistics.
 */
function summarizePcrList(pcrList) {
    if (!pcrList || pcrList.length === 0)
        return { count: 0, status: 'No PCRs found' };

    let minDiff = Infinity;
    let maxDiff = -Infinity;
    let totalDiff = 0;
    let diffCount = 0;

    for (let i = 1; i < pcrList.length; i++) {
        const diff = Number(pcrList[i].pcr - pcrList[i - 1].pcr) / 27000000; // seconds
        if (diff > 0) {
            if (diff < minDiff) minDiff = diff;
            if (diff > maxDiff) maxDiff = diff;
            totalDiff += diff;
            diffCount++;
        }
    }

    return {
        count: pcrList.length,
        interval: {
            min: diffCount > 0 ? (minDiff * 1000).toFixed(2) + 'ms' : 'N/A',
            max: diffCount > 0 ? (maxDiff * 1000).toFixed(2) + 'ms' : 'N/A',
            avg:
                diffCount > 0
                    ? ((totalDiff / diffCount) * 1000).toFixed(2) + 'ms'
                    : 'N/A',
        },
        firstPcr: pcrList[0].pcr.toString(),
        lastPcr: pcrList[pcrList.length - 1].pcr.toString(),
    };
}

/**
 * Summarizes Continuity Counters to identify gaps without storing every packet's CC.
 */
function summarizeContinuityCounters(ccMap) {
    const summary = {};
    for (const [pid, counters] of Object.entries(ccMap)) {
        let errors = 0;
        let lastCC = -1;
        let packetCount = 0;

        for (const entry of counters) {
            packetCount++;
            if (entry.hasPayload) {
                if (lastCC !== -1) {
                    const expected = (lastCC + 1) % 16;
                    if (entry.cc !== expected && entry.cc !== lastCC) {
                        // Allow repeat CC
                        errors++;
                    }
                }
                lastCC = entry.cc;
            }
        }

        summary[pid] = {
            packetCount,
            errors,
            status: errors > 0 ? 'Discontinuities Detected' : 'Clean',
        };
    }
    return summary;
}

export function parseTsSegment(buffer) {
    const packets = [];
    // We use temporary local structures for raw data collection
    const rawPcrList = [];
    const rawCcMap = {};

    const summary = {
        totalPackets: 0,
        errors: [],
        pmtPids: new Set(),
        privateSectionPids: new Set(),
        dsmccPids: new Set(),
        programMap: {},
        pcrPid: null,
        // Final summaries will be assigned at the end
        pcrList: null,
        continuityCounters: null,
        tsdt: null,
        ipmp: null,
        semanticResults: null,
    };
    const dataView = new DataView(buffer);

    if (
        buffer.byteLength < TS_PACKET_SIZE ||
        dataView.getUint8(0) !== SYNC_BYTE
    ) {
        summary.errors.push(
            'Not a valid MPEG-2 Transport Stream (missing sync byte at start).'
        );
        return { format: 'ts', data: { summary, packets } };
    }

    // Pass 1: Discovery (PAT -> PMT PIDs)
    for (
        let offset = 0;
        offset + TS_PACKET_SIZE <= buffer.byteLength;
        offset += TS_PACKET_SIZE
    ) {
        if (dataView.getUint8(offset) !== SYNC_BYTE) continue;
        const pid =
            ((dataView.getUint8(offset + 1) & 0x1f) << 8) |
            dataView.getUint8(offset + 2);

        if (pid === 0x00) {
            const adaptationControl = (dataView.getUint8(offset + 3) >> 4) & 3;
            const payloadStartIndicator =
                (dataView.getUint8(offset + 1) >> 6) & 1;

            if (payloadStartIndicator && adaptationControl & 1) {
                let ptr = offset + 4;
                if (adaptationControl & 2) {
                    const afLen = dataView.getUint8(ptr);
                    ptr += 1 + afLen;
                }
                if (ptr < offset + TS_PACKET_SIZE) {
                    const pointerField = dataView.getUint8(ptr);
                    const sectionStart = ptr + 1 + pointerField;
                    if (sectionStart < offset + TS_PACKET_SIZE) {
                        const sectionView = new DataView(
                            buffer,
                            sectionStart,
                            offset + TS_PACKET_SIZE - sectionStart
                        );
                        const { header, payload } =
                            parsePsiSection(sectionView);
                        if (header.table_id === '0x00' && !header.error) {
                            const pat = parsePatPayload(payload, sectionStart);
                            pat.programs.forEach((p) => {
                                if (p.type === 'program') {
                                    const pmtPid = p.program_map_PID.value;
                                    summary.pmtPids.add(pmtPid);
                                    if (!summary.programMap[pmtPid]) {
                                        summary.programMap[pmtPid] = {
                                            programNumber:
                                                p.program_number.value,
                                            streams: {},
                                        };
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }
    }

    // Pass 2: Full Parse
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
            payloadType: 'Data', // Default
            pes: null,
            psi: null,
            fieldOffsets: { header: { offset, length: 4 } },
        };

        // Identify Payload Type based on PID immediately
        if (KNOWN_PIDS[pid]) {
            packet.payloadType = KNOWN_PIDS[pid];
        } else if (summary.pmtPids.has(pid)) {
            packet.payloadType = 'PSI (PMT)';
        }

        if (pid !== 0x1fff) {
            if (!rawCcMap[pid]) {
                rawCcMap[pid] = [];
            }
            rawCcMap[pid].push({
                cc: header.continuity_counter.value,
                offset: offset,
                hasPayload: (header.adaptation_field_control.value & 1) !== 0,
            });
        }

        let payloadStart = 4;
        if (header.adaptation_field_control.value & 2) {
            const afLength = dataView.getUint8(offset + payloadStart);
            if (offset + payloadStart + afLength + 1 > buffer.byteLength) {
                summary.errors.push(
                    `Invalid AF length at offset ${offset}. Skipping packet.`
                );
                continue;
            }
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
                rawPcrList.push({
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

        // --- Parsing Payload ---
        // Check if it is a PSI table (Starts with pointer field)
        // Logic: If PUSI is set AND (PID is known PSI or PMT)
        const isPsiPid =
            pid <= 0x1f || // Reserved / DVB / PSI range
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
                } else if (pid === 0x01) {
                    parsedPayload = parseCatPayload(payload, payloadBaseOffset);
                } else if (pid === 0x02) {
                    parsedPayload = parseTsdtPayload(
                        payload,
                        payloadBaseOffset
                    );
                    summary.tsdt = parsedPayload;
                } else if (pid === 0x03) {
                    parsedPayload = parseIpmpPayload(
                        payload,
                        payloadBaseOffset
                    );
                    summary.ipmp = parsedPayload;
                } else if (summary.pmtPids.has(pid)) {
                    const tableIdNum = parseInt(sectionHeader.table_id, 16);
                    if (tableIdNum === 0x02) {
                        parsedPayload = parsePmtPayload(
                            payload,
                            payloadBaseOffset
                        );
                        if (parsedPayload && summary.programMap[pid]) {
                            parsedPayload.streams.forEach((stream) => {
                                summary.programMap[pid].streams[
                                    stream.elementary_PID.value
                                ] = stream.stream_type.value;
                            });
                            summary.programMap[pid].pcrPid =
                                parsedPayload.pcr_pid.value;
                            summary.pcrPid = parsedPayload.pcr_pid.value;
                        }
                    } else if (tableIdNum >= 0x40 && tableIdNum <= 0xfe) {
                        parsedPayload = parsePrivateSectionPayload(
                            payload,
                            payloadBaseOffset,
                            sectionHeader.section_syntax_indicator,
                            sectionHeader.section_length
                        );
                    }
                } else {
                    // Generic PSI fallback for SDT (0x11), EIT (0x12), etc.
                    // We don't have a specific parser, but we can show the header info.
                    parsedPayload = {
                        type: `PSI Table (0x${parseInt(sectionHeader.table_id, 16).toString(16)})`,
                        generic_data: {
                            value: `${payload.byteLength} bytes`,
                            offset: payloadBaseOffset,
                            length: payload.byteLength,
                        },
                    };
                }

                if (parsedPayload) {
                    parsedPayload.isValid = isValid;
                    parsedPayload.header = sectionHeader;
                    parsedPayload.crc = crc;
                    packet.psi = parsedPayload;
                }
            }
        } else if (!isPsiPid) {
            // 2. PES Packet (Starts with 0x000001 start code)
            const pesView = new DataView(
                buffer,
                offset + payloadStart,
                TS_PACKET_SIZE - payloadStart
            );

            if (header.payload_unit_start_indicator.value) {
                if (
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

                        const streamId = parseInt(
                            packet.pes.stream_id.value,
                            16
                        );
                        if (streamId === 0xf2) {
                            packet.payloadType = 'PES (DSM-CC)';
                            const dsmccPayloadOffset =
                                payloadStart + headerLength;
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
        }
        packets.push(packet);
    }

    // Pass 3: Resolution of "Data" packets based on PMT discovery
    const pidToStreamType = {};
    Object.values(summary.programMap).forEach((program) => {
        Object.entries(program.streams).forEach(([pid, type]) => {
            pidToStreamType[pid] = type;
        });
    });

    packets.forEach((packet) => {
        if (pidToStreamType[packet.pid]) {
            if (packet.payloadType === 'Data' || packet.payloadType === 'PES') {
                if (packet.payloadType === 'Data') {
                    const typeNum = parseInt(pidToStreamType[packet.pid], 16);
                    let label = `Stream ${pidToStreamType[packet.pid]}`;
                    if (typeNum === 0x1b) label = 'H.264 Video';
                    else if (typeNum === 0x24) label = 'HEVC Video';
                    else if (typeNum === 0x0f) label = 'AAC Audio';
                    else if (typeNum === 0x15) label = 'ID3 Metadata';

                    packet.payloadType = label;
                }
            }
        }
    });

    // --- Perform Semantic Analysis with Raw Data ---
    summary.pcrList = rawPcrList;
    summary.continuityCounters = rawCcMap;

    try {
        // Run the semantic checks using the full dataset
        summary.semanticResults = analyzeSemantics({ packets, summary });
    } catch (e) {
        console.warn('Semantic analysis failed:', e);
        summary.semanticResults = [
            {
                id: 'ERR',
                text: 'Analysis Failed',
                status: 'warn',
                details: e.message,
            },
        ];
    }

    // --- Summarize Data for Output ---
    // Replace the massive raw arrays with statistical summaries to keep JSON size manageable
    summary.pcrList = summarizePcrList(rawPcrList);
    summary.continuityCounters = summarizeContinuityCounters(rawCcMap);

    return { format: 'ts', data: { summary, packets } };
}
