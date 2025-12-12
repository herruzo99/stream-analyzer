import { formatBitrate } from '@/ui/shared/format';

/**
 * Creates a comparison row object for the tabular view.
 */
const createRow = (name, values, tooltipData = {}) => {
    const firstValue = values[0];
    // Deep equality check for objects/arrays
    const isSame = values.every((v) => {
        if (
            typeof v === 'object' &&
            v !== null &&
            typeof firstValue === 'object' &&
            firstValue !== null
        ) {
            return JSON.stringify(v) === JSON.stringify(firstValue);
        }
        return v === firstValue;
    });

    let status = isSame ? 'same' : 'different';

    const missingIndices = values
        .map((v, i) => (v === '---' || v === null || v === undefined ? i : -1))
        .filter((i) => i !== -1);

    if (missingIndices.length > 0 && missingIndices.length < values.length) {
        status = 'missing';
    }

    return { name, values, status, ...tooltipData };
};

/**
 * Scans the packet list for the first available SPS info object.
 * @param {object} segment
 */
const findSpsInfo = (segment) => {
    const packets = segment?.data?.packets || [];
    for (const p of packets) {
        if (p.pes && p.pes.spsInfo && !p.pes.spsInfo.error) {
            return p.pes.spsInfo;
        }
    }
    return null;
};

/**
 * Extracts PMT information, normalizing for comparison.
 * @param {object} segment
 */
const getPmtInfo = (segment) => {
    const summary = segment?.data?.summary;
    if (!summary?.programMap) return null;

    // Get the first program found (TS usually has one program in streaming contexts)
    const pmtPid = Array.from(summary.pmtPids)[0];
    if (!pmtPid) return null;

    const program = summary.programMap[pmtPid];
    return {
        programNumber: program.programNumber,
        pcrPid: summary.pcrPid,
        // Convert streamDetails map to array
        streams: Object.entries(program.streamDetails || {}).map(
            ([pid, details]) => ({
                pid: parseInt(pid, 10),
                streamType: details.streamType, // Hex string
                descriptors: details.descriptors || [],
            })
        ),
    };
};

const getStreamByType = (pmt, typePrefix) => {
    if (!pmt || !pmt.streams) return null;
    // Simple heuristic: Video are 0x1b (AVC), 0x24 (HEVC), 0x02 (MPEG2). Audio 0x0f (AAC), 0x03/04 (MP3), 0x81 (AC3)
    const videoTypes = ['0x1b', '0x24', '0x01', '0x02'];
    const audioTypes = [
        '0x0f',
        '0x11',
        '0x03',
        '0x04',
        '0x81',
        '0x82',
        '0x83',
        '0x84',
        '0x85',
        '0x86',
        '0x87',
    ];

    return pmt.streams.find((s) => {
        if (typePrefix === 'video') return videoTypes.includes(s.streamType);
        if (typePrefix === 'audio') return audioTypes.includes(s.streamType);
        return false;
    });
};

/**
 * Formats a descriptor for display.
 */
const formatDescriptor = (desc) => {
    if (!desc) return null;
    const content = Object.entries(desc.details || {})
        .map(([k, v]) => {
            const val = v?.value !== undefined ? v.value : v;
            return `${k}=${val}`;
        })
        .join(', ');
    return `${desc.name} [${content}]`;
};

/**
 * Helper to build the structural difference tree.
 * Mimics the logic used for ISOBMFF box trees but for TS logical structures.
 */
function buildStructuralDiff(segments) {
    if (segments.length < 2) return [];

    const segA = segments[0];
    const segB = segments[1];

    const rootChildren = [];

    // 1. Compare PSI Tables
    const pmtA = getPmtInfo(segA);
    const pmtB = getPmtInfo(segB);

    if (pmtA || pmtB) {
        const status =
            JSON.stringify(pmtA) === JSON.stringify(pmtB) ? 'same' : 'modified';
        rootChildren.push({
            type: 'PMT',
            status,
            values: [
                pmtA
                    ? `Prog ${pmtA.programNumber}, PCR ${pmtA.pcrPid}`
                    : 'Missing',
                pmtB
                    ? `Prog ${pmtB.programNumber}, PCR ${pmtB.pcrPid}`
                    : 'Missing',
            ],
            children: [], // Could expand streams here if needed
        });
    }

    // 2. Video Structure (GOPs & Frames)
    const framesA = segA.bitstreamAnalysis?.frames || [];
    const framesB = segB.bitstreamAnalysis?.frames || [];

    if (framesA.length > 0 || framesB.length > 0) {
        const videoNode = {
            type: 'Video Track',
            status: 'same',
            values: [`${framesA.length} Frames`, `${framesB.length} Frames`],
            children: [],
        };

        if (framesA.length !== framesB.length) videoNode.status = 'modified';

        // Group into GOPs
        const groupFramesIntoGops = (frames) => {
            const gops = [];
            let currentGop = null;
            frames.forEach((f, i) => {
                if (f.isKeyFrame || !currentGop) {
                    if (currentGop) gops.push(currentGop);
                    currentGop = {
                        index: gops.length,
                        frames: [],
                        size: 0,
                        startFrame: i,
                    };
                }
                currentGop.frames.push(f);
                currentGop.size += f.size;
            });
            if (currentGop) gops.push(currentGop);
            return gops;
        };

        const gopsA = groupFramesIntoGops(framesA);
        const gopsB = groupFramesIntoGops(framesB);

        const maxGops = Math.max(gopsA.length, gopsB.length);

        for (let i = 0; i < maxGops; i++) {
            const gA = gopsA[i];
            const gB = gopsB[i];

            if (!gA && !gB) continue;

            const gopLabel = `GOP #${i + 1}`;

            // Check deep equality of frames
            let isGopModified = false;
            if (!gA || !gB || gA.frames.length !== gB.frames.length) {
                isGopModified = true;
            } else {
                // Check sizes with tolerance
                if (Math.abs(gA.size - gB.size) > 1024) isGopModified = true;
            }

            const gopNode = {
                type: gopLabel,
                status: !gA
                    ? 'added'
                    : !gB
                      ? 'removed'
                      : isGopModified
                        ? 'modified'
                        : 'same',
                values: [
                    gA ? { size: gA.size, ...gA } : null,
                    gB ? { size: gB.size, ...gB } : null,
                ], // Pass object for size formatting
                children: [],
            };

            // Drill down into frames if modified or if it's the first GOP (for sample)
            if (gA && gB) {
                const maxFrames = Math.max(gA.frames.length, gB.frames.length);
                for (let j = 0; j < maxFrames; j++) {
                    const fA = gA.frames[j];
                    const fB = gB.frames[j];

                    if (!fA && !fB) continue;

                    let frameStatus = 'same';
                    if (!fA) frameStatus = 'added';
                    else if (!fB) frameStatus = 'removed';
                    else if (
                        fA.type !== fB.type ||
                        Math.abs(fA.size - fB.size) > 100
                    )
                        frameStatus = 'modified'; // 100 byte tolerance

                    // If we found a modification, mark the parent GOP and Video Track as modified too
                    if (frameStatus !== 'same') {
                        gopNode.status = 'modified';
                        videoNode.status = 'modified';
                    }

                    // Only add children if they differ, or if it's the first few frames to give context
                    if (frameStatus !== 'same' || j < 3) {
                        gopNode.children.push({
                            type: `Frame ${j + 1}`,
                            status: frameStatus,
                            values: [
                                fA
                                    ? {
                                          ...fA,
                                          details: {
                                              Size: fA.size,
                                              Type: fA.type,
                                          },
                                      }
                                    : null,
                                fB
                                    ? {
                                          ...fB,
                                          details: {
                                              Size: fB.size,
                                              Type: fB.type,
                                          },
                                      }
                                    : null,
                            ],
                            children: [],
                        });
                    }
                }

                if (
                    gopNode.children.length < maxFrames &&
                    gopNode.children.length > 0
                ) {
                    gopNode.children.push({
                        type: `... ${maxFrames - gopNode.children.length} more frames ...`,
                        status: 'same',
                        values: [null, null],
                        children: [],
                    });
                }
            }

            videoNode.children.push(gopNode);
        }
        rootChildren.push(videoNode);
    }

    return rootChildren;
}

/**
 * Compares an array of parsed MPEG-2 TS segments.
 * @param {object[]} segments - An array of parsed segment objects.
 * @returns {{sections: object[], structuralDiff: object[]}} A structured comparison model.
 */
export function compareTsSegments(segments) {
    const sections = [];

    // --- 1. Video Configuration (Deep SPS Analysis) ---
    // This is the critical upgrade requested by the user.
    const spsInfos = segments.map(findSpsInfo);
    const hasSps = spsInfos.some((s) => s !== null);

    if (hasSps) {
        sections.push({
            title: 'Video Configuration (SPS)',
            rows: [
                createRow(
                    'Resolution',
                    spsInfos.map((s) => s?.resolution || '---')
                ),
                createRow(
                    'Profile IDC',
                    spsInfos.map((s) => s?.profile_idc || '---')
                ),
                createRow(
                    'Level IDC',
                    spsInfos.map((s) => s?.level_idc || '---')
                ),
                createRow(
                    'Bit Depth (Luma)',
                    spsInfos.map((s) =>
                        s?.bit_depth_luma_minus8 !== undefined
                            ? s.bit_depth_luma_minus8 + 8
                            : '---'
                    )
                ),
                createRow(
                    'Chroma Format',
                    spsInfos.map((s) =>
                        s?.chroma_format_idc !== undefined
                            ? s.chroma_format_idc
                            : '---'
                    )
                ),
                createRow(
                    'Frame Rate (VUI)',
                    spsInfos.map((s) =>
                        s?.frame_rate ? s.frame_rate.toFixed(2) : '---'
                    )
                ),
                createRow(
                    'Fixed Frame Rate',
                    spsInfos.map((s) =>
                        s?.fixed_frame_rate !== undefined
                            ? s.fixed_frame_rate
                                ? 'Yes'
                                : 'No'
                            : '---'
                    )
                ),
                createRow(
                    'Seq Parameter Set ID',
                    spsInfos.map((s) =>
                        s?.seq_parameter_set_id !== undefined
                            ? s.seq_parameter_set_id
                            : '---'
                    )
                ),
            ],
            isGeneric: false,
        });
    } else {
        // Fallback to basic media info if SPS missing (e.g. encrypted or stripped)
        if (segments.some((s) => s?.mediaInfo?.video)) {
            sections.push({
                title: 'Video Track (Basic)',
                rows: [
                    createRow(
                        'Codec',
                        segments.map((s) => s?.mediaInfo?.video?.codec || '---')
                    ),
                    createRow(
                        'Resolution',
                        segments.map(
                            (s) => s?.mediaInfo?.video?.resolution || '---'
                        )
                    ),
                    createRow(
                        'Frame Rate',
                        segments.map(
                            (s) => s?.mediaInfo?.video?.frameRate || '---'
                        )
                    ),
                ],
                isGeneric: false,
            });
        }
    }

    // --- 2. Program Structure (PMT) ---
    const pmtInfos = segments.map(getPmtInfo);
    const videoStreams = pmtInfos.map((pmt) => getStreamByType(pmt, 'video'));
    const audioStreams = pmtInfos.map((pmt) => getStreamByType(pmt, 'audio'));

    sections.push({
        title: 'Program Map Table (PMT)',
        rows: [
            createRow(
                'Program Number',
                pmtInfos.map((p) => p?.programNumber || '---')
            ),
            createRow(
                'PCR PID',
                pmtInfos.map((p) => p?.pcrPid || '---')
            ),
            createRow(
                'Stream Count',
                pmtInfos.map((p) => p?.streams?.length || 0)
            ),
        ],
        isGeneric: false,
    });

    // --- 3. Elementary Streams & Descriptors ---
    if (videoStreams.some((v) => v)) {
        sections.push({
            title: 'Video Stream (PMT)',
            rows: [
                createRow(
                    'PID',
                    videoStreams.map((v) => v?.pid || '---')
                ),
                createRow(
                    'Stream Type',
                    videoStreams.map((v) => v?.streamType || '---')
                ),
                createRow(
                    'Descriptors',
                    videoStreams.map((v) => v?.descriptors?.length || 0)
                ),
                // Extract specific descriptors if they match
                createRow(
                    'Stream Desc (0x02)',
                    videoStreams.map((v) => {
                        const d = v?.descriptors.find((d) => d.tag === 0x02);
                        return d ? formatDescriptor(d) : '---';
                    })
                ),
                createRow(
                    'Registration (0x05)',
                    videoStreams.map((v) => {
                        const d = v?.descriptors.find((d) => d.tag === 0x05);
                        return d ? formatDescriptor(d) : '---';
                    })
                ),
            ],
            isGeneric: false,
        });
    }

    if (audioStreams.some((a) => a)) {
        sections.push({
            title: 'Audio Stream (PMT)',
            rows: [
                createRow(
                    'PID',
                    audioStreams.map((a) => a?.pid || '---')
                ),
                createRow(
                    'Stream Type',
                    audioStreams.map((a) => a?.streamType || '---')
                ),
                createRow(
                    'Language (0x0A)',
                    audioStreams.map((a) => {
                        const d = a?.descriptors.find((d) => d.tag === 0x0a);
                        return d ? formatDescriptor(d) : '---';
                    })
                ),
                createRow(
                    'Audio Type',
                    audioStreams.map((a) => {
                        // Extract from ISO 639 descriptor if possible
                        const d = a?.descriptors.find((d) => d.tag === 0x0a);
                        if (d?.details?.languages?.[0]?.audio_type?.value) {
                            return d.details.languages[0].audio_type.value;
                        }
                        return '---';
                    })
                ),
            ],
            isGeneric: false,
        });
    }

    // --- 4. Bitstream Analysis (GOP) ---
    // Enhanced with more metrics from the analyzer
    if (segments.some((s) => s?.bitstreamAnalysis)) {
        sections.push({
            title: 'Bitstream (GOP)',
            rows: [
                createRow(
                    'GOP Structure',
                    segments.map(
                        (s) =>
                            s?.bitstreamAnalysis?.summary?.gopStructure || '---'
                    )
                ),
                createRow(
                    'Avg GOP Length',
                    segments.map(
                        (s) => s?.bitstreamAnalysis?.summary?.gopLength || '---'
                    )
                ),
                createRow(
                    'Calculated Bitrate',
                    segments.map((s) => {
                        const br = s?.bitstreamAnalysis?.summary?.bitrate;
                        return br ? formatBitrate(br) : '---';
                    })
                ),
                createRow(
                    'Total Frames',
                    segments.map(
                        (s) =>
                            s?.bitstreamAnalysis?.summary?.totalFrames || '---'
                    )
                ),
                createRow(
                    'I-Frame Ratio',
                    segments.map(
                        (s) =>
                            s?.bitstreamAnalysis?.summary?.iFrameRatio || '---'
                    )
                ),
                createRow(
                    'Min Frame Size',
                    segments.map((s) => {
                        const frames = s?.bitstreamAnalysis?.frames || [];
                        return frames.length
                            ? Math.min(...frames.map((f) => f.size)) + ' B'
                            : '---';
                    })
                ),
                createRow(
                    'Max Frame Size',
                    segments.map((s) => {
                        const max = s?.bitstreamAnalysis?.summary?.maxFrameSize;
                        return max ? max + ' B' : '---';
                    })
                ),
            ],
            isGeneric: false,
        });
    }

    // --- 5. Transport Health ---
    const getPcrSummary = (seg) => {
        const pcrList = seg?.data?.summary?.pcrList;
        if (!pcrList) return '---';
        return `Count: ${pcrList.count}, Avg Interval: ${pcrList.interval.avg}`;
    };

    const getCCErrors = (seg) => {
        const cc = seg?.data?.summary?.continuityCounters;
        if (!cc) return '---';
        let total = 0;
        Object.values(cc).forEach((c) => (total += c.errors));
        return total;
    };

    sections.push({
        title: 'Transport Health',
        rows: [
            createRow(
                'Total Packets',
                segments.map((s) => s?.data?.summary?.totalPackets || '---')
            ),
            createRow('PCR Health', segments.map(getPcrSummary)),
            createRow('Continuity Errors', segments.map(getCCErrors)),
            createRow(
                'Scrambled Packets',
                segments.map((s) => {
                    // Heuristic scan of packet headers in summary if available, or just boolean "Encrypted"
                    // The parser doesn't expose a scramble count explicitly in summary,
                    // but we can check if any encryption method was detected.
                    return s?.data?.summary?.ipmp ? 'Yes (IPMP)' : 'No';
                })
            ),
        ],
        isGeneric: false,
    });

    // --- 6. Structural Diff Generation ---
    const structuralDiff = buildStructuralDiff(segments);

    return { sections, structuralDiff };
}
