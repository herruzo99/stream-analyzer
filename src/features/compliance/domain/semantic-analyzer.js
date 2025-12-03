import { createTstdModel } from '@/features/compliance/domain/t-std';

const TS_PACKET_SIZE = 188;

/**
 * Analyzes a collection of TS packets for stream-wide semantic compliance.
 * @param {object} parsedTsData - The full parsed segment data from the engine.
 * @returns {{results: Array<object>, bufferHistory: Record<number, Array<{offset: number, fullness: number}>>}}
 */
export function analyzeSemantics(parsedTsData) {
    if (!parsedTsData?.packets || !parsedTsData.summary) {
        return {
            results: [],
            bufferHistory:
                /** @type {Record<number, Array<{offset: number, fullness: number}>>} */ ({}),
        };
    }
    const { packets, summary } = parsedTsData;
    const results = [];
    results.push(...checkPtsFrequency(packets));
    results.push(...checkPtsAfterDiscontinuity(packets));
    results.push(...checkPcrFrequency(summary.pcrList, summary.pcrPid));
    results.push(...checkContinuityCounter(summary.continuityCounters));

    const { results: tstdResults, bufferHistory } = validateTstdBuffers(
        packets,
        summary
    );
    results.push(...tstdResults);

    return { results, bufferHistory };
}

/**
 * Validates T-STD buffer models and records fullness history.
 * @param {object[]} packets
 * @param {object} summary
 * @returns {{results: Array<object>, bufferHistory: Record<number, Array<{offset: number, fullness: number}>>}}
 */
function validateTstdBuffers(packets, summary) {
    const pmtPid = [...summary.pmtPids][0];
    if (!pmtPid || !summary.programMap[pmtPid]) {
        return {
            results: [],
            bufferHistory:
                /** @type {Record<number, Array<{offset: number, fullness: number}>>} */ ({}),
        };
    }

    const program = summary.programMap[pmtPid];
    program.pcrPid = summary.pcrPid;
    const tstd = createTstdModel(program);

    const results = [];
    /** @type {Record<number, Array<{offset: number, fullness: number}>>} */
    const bufferHistory = {};

    // Initialize history arrays
    Object.keys(tstd.buffers).forEach((pid) => {
        bufferHistory[pid] = [];
    });

    let lastPcrValue = null;
    let lastPcrOffset = null;

    packets.forEach((packet) => {
        const currentPcr = packet.adaptationField?.pcr;

        // Update transport_rate if we have a new PCR and a previous one to compare with
        if (currentPcr) {
            const currentPcrValue = BigInt(currentPcr.value);
            const currentPcrOffset = packet.offset;

            if (lastPcrValue !== null) {
                const timeBetween =
                    Number(currentPcrValue - lastPcrValue) / 27000000.0;
                const bytesBetween = currentPcrOffset - lastPcrOffset;
                if (timeBetween > 0) {
                    tstd.transport_rate = (bytesBetween * 8) / timeBetween;
                }
            }

            lastPcrValue = currentPcrValue;
            lastPcrOffset = currentPcrOffset;
        }

        const pid = packet.pid;
        const bufferModel = tstd.buffers[pid];

        if (!bufferModel) return; // Not part of the program we're analyzing

        // --- 1. Calculate Time Delta ---
        const timeDelta = (TS_PACKET_SIZE * 8) / tstd.transport_rate;

        if (timeDelta > 0) {
            // --- 2. Drain Buffer ---
            const bytesDrained = (bufferModel.Rxn / 8) * timeDelta;
            bufferModel.TBn.fullness = Math.max(
                0,
                bufferModel.TBn.fullness - bytesDrained
            );
        }

        // --- 3. Fill Buffer ---
        bufferModel.TBn.fullness += TS_PACKET_SIZE;

        // --- 4. Record History (Sampled to save memory if needed, but every packet is fine for short segments) ---
        bufferHistory[pid].push({
            offset: packet.offset,
            fullness: parseFloat(bufferModel.TBn.fullness.toFixed(2)),
        });

        // --- 5. Check for Overflow ---
        if (bufferModel.TBn.fullness > bufferModel.TBn.size) {
            results.push({
                id: 'SEMANTIC-TB-OVERFLOW',
                text: `T-STD Transport Buffer (TBn) overflow on PID ${pid}`,
                status: 'fail',
                details: `At packet offset ${packet.offset}, the Transport Buffer for PID ${pid} overflowed. Calculated fullness: ${bufferModel.TBn.fullness.toFixed(0)} bytes, Size: ${bufferModel.TBn.size} bytes. This indicates the transport rate is too high or leak rate is too low.`,
                isoRef: 'Clause 2.4.2.7',
                category: 'Semantic & Temporal Rules',
            });
            // Reset to prevent repeated errors for the same overflow
            bufferModel.TBn.fullness = bufferModel.TBn.size;
        }
    });

    return { results, bufferHistory };
}

// ... (Other check functions remain unchanged from previous iteration) ...
function checkPtsFrequency(packets) {
    const pesPacketsWithPtsByPid = {};
    packets.forEach((packet) => {
        if (packet.pes?.pts) {
            if (!pesPacketsWithPtsByPid[packet.pid]) {
                pesPacketsWithPtsByPid[packet.pid] = [];
            }
            pesPacketsWithPtsByPid[packet.pid].push({
                pts: BigInt(packet.pes.pts.value),
                offset: packet.offset,
            });
        }
    });

    const results = [];
    for (const pid in pesPacketsWithPtsByPid) {
        const pps = pesPacketsWithPtsByPid[pid];
        for (let i = 1; i < pps.length; i++) {
            const ptsDiff = Number(pps[i].pts - pps[i - 1].pts);
            const ptsDiffSeconds = ptsDiff / 90000;
            if (ptsDiffSeconds > 0.7) {
                results.push({
                    id: 'SEMANTIC-PTS-FREQ',
                    text: `PTS interval exceeds 0.7s for PID ${pid}`,
                    status: 'fail',
                    details: `The interval between PTS values at packet offset ${pps[i - 1].offset} and ${pps[i].offset} is ${ptsDiffSeconds.toFixed(3)}s, which violates the maximum allowed 0.7s.`,
                    isoRef: 'Clause 2.7.4',
                    category: 'Semantic & Temporal Rules',
                });
            }
        }
    }
    return results;
}

function checkPtsAfterDiscontinuity(packets) {
    const packetsByPid = {};
    packets.forEach((p) => {
        if (!packetsByPid[p.pid]) packetsByPid[p.pid] = [];
        packetsByPid[p.pid].push(p);
    });

    const results = [];
    for (const pid in packetsByPid) {
        const streamPackets = packetsByPid[pid];
        for (let i = 0; i < streamPackets.length; i++) {
            const packet = streamPackets[i];
            if (packet.adaptationField?.discontinuity_indicator?.value === 1) {
                let nextPesPacketFound = false;
                let ptsFound = false;
                for (let j = i; j < streamPackets.length; j++) {
                    if (
                        streamPackets[j].header?.payload_unit_start_indicator
                            ?.value === 1 &&
                        streamPackets[j].pes
                    ) {
                        nextPesPacketFound = true;
                        if (streamPackets[j].pes.pts) {
                            ptsFound = true;
                        }
                        break;
                    }
                }

                if (nextPesPacketFound && !ptsFound) {
                    results.push({
                        id: 'SEMANTIC-PTS-DISCONT',
                        text: `Missing required PTS after discontinuity on PID ${pid}`,
                        status: 'fail',
                        details: `A discontinuity was signaled at packet offset ${packet.offset}. The next PES packet in this stream did not contain a mandatory PTS.`,
                        isoRef: 'Clause 2.7.5',
                        category: 'Semantic & Temporal Rules',
                    });
                }
            }
        }
    }
    return results;
}

function checkPcrFrequency(pcrList, pcrPid) {
    if (pcrList.length < 2) return [];
    const results = [];
    for (let i = 1; i < pcrList.length; i++) {
        const timeDiff = Number(pcrList[i].pcr - pcrList[i - 1].pcr);
        const timeDiffSeconds = timeDiff / 27000000;
        if (timeDiffSeconds > 0.1) {
            results.push({
                id: 'SEMANTIC-PCR-FREQ',
                text: `PCR interval exceeds 100ms for PCR PID ${pcrPid}`,
                status: 'fail',
                details: `The interval between PCRs at packet offset ${pcrList[i - 1].offset} and ${pcrList[i].offset} is ${Math.round(timeDiffSeconds * 1000)}ms, violating the 100ms maximum.`,
                isoRef: 'Clause 2.7.2',
                category: 'Semantic & Temporal Rules',
            });
        }
    }
    return results;
}

function checkContinuityCounter(ccMap) {
    const results = [];
    for (const pid in ccMap) {
        const counters = ccMap[pid];
        for (let i = 1; i < counters.length; i++) {
            const prev = counters[i - 1];
            const curr = counters[i];

            if (!prev.hasPayload) continue;

            const expected_cc = (prev.cc + 1) % 16;
            if (curr.cc !== expected_cc) {
                results.push({
                    id: 'SEMANTIC-CC-ERROR',
                    text: `Continuity counter error on PID ${pid}`,
                    status: 'warn',
                    details: `Packet at offset ${curr.offset} has CC ${curr.cc}, but expected ${expected_cc} after packet at offset ${prev.offset}. This may indicate packet loss.`,
                    isoRef: 'Clause 2.4.3.3',
                    category: 'Semantic & Temporal Rules',
                });
            }
        }
    }
    return results;
}
