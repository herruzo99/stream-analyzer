import { boxParsers } from './index.js';
import { decodeSampleFlags } from './sample-flags.js';

import { parseTTML } from '../ttml/index.js';

const knownContainerBoxes = new Set([
    'moof',
    'traf',
    'moov',
    'trak',
    'mdia',
    'minf',
    'dinf',
    'dref',
    'stbl',
    'mvex',
    'edts',
    'avc1',
    'hvc1',
    'hev1',
    'mp4a',
    'stsd',
    'sinf',
    'schi',
    'mfra',
    'tref',
    'udta',
    'encv',
    'meta',
    'trep',
    'enca',
    'stpp', // Added stpp as a known container
]);

/**
 * Recursively finds the first occurrence of a box that satisfies a predicate.
 * @param {import('../../../types.ts').Box[]} boxes The list of boxes to search.
 * @param {(box: import('../../../types.ts').Box) => boolean} predicate The predicate function to match a box.
 * @returns {import('../../../types.ts').Box | null} The found box or null.
 */
function findBoxRecursive(boxes, predicate) {
    if (!boxes) return null;
    for (const box of boxes) {
        if (predicate(box)) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, predicate);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Recursively finds all occurrences of a box of a given type.
 * @param {import('../../../types.ts').Box[]} boxes The list of boxes to search.
 * @param {string} type The box type to find.
 * @returns {import('../../../types.ts').Box[]} An array of found boxes.
 */
function findChildrenRecursive(boxes, type) {
    let results = [];
    if (!boxes) return results;
    for (const box of boxes) {
        if (box.type === type) {
            results.push(box);
        }
        if (box.children?.length > 0) {
            results = results.concat(findChildrenRecursive(box.children, type));
        }
    }
    return results;
}

/**
 * Calculates raw timing information for a CMAF Chunk from its 'moof' box.
 * @param {import('../../../types.ts').Box} moofBox The parsed 'moof' box of the chunk.
 * @returns {{baseTime: number, duration: number, sampleCount: number}}
 */
function calculateChunkTiming(moofBox) {
    const timing = { baseTime: 0, duration: 0, sampleCount: 0 };
    if (!moofBox || moofBox.type !== 'moof') {
        return timing;
    }

    const traf = findBoxRecursive(moofBox.children, (b) => b.type === 'traf');
    if (!traf) return timing;

    const tfdt = findBoxRecursive(traf.children, (b) => b.type === 'tfdt');
    const trun = findBoxRecursive(traf.children, (b) => b.type === 'trun');

    if (tfdt && tfdt.details.baseMediaDecodeTime) {
        timing.baseTime = tfdt.details.baseMediaDecodeTime.value || 0;
    }

    if (trun && trun.details.sample_count) {
        // Since trun parser is simplified, we can't reduce over samples.
        // This is a limitation for now, but not critical for the chunk timing display.
        timing.sampleCount = trun.details.sample_count.value;
    }

    return timing;
}

/**
 * Groups a flat list of boxes into logical CMAF Chunks ('moof' + 'mdat').
 * @param {import('../../../types.ts').Box[]} boxes A flat list of parsed ISOBMFF boxes.
 * @returns {import('../../../types.ts').Box[]} A structured list containing Chunk objects and other top-level boxes.
 */
function groupAndCalcTimingForChunks(boxes) {
    if (!boxes) return [];
    const grouped = [];
    let i = 0;
    while (i < boxes.length) {
        const box = boxes[i];
        if (box.type === 'moof' && boxes[i + 1]?.type === 'mdat') {
            const moof = box;
            const mdat = boxes[i + 1];
            const timing = calculateChunkTiming(moof);

            grouped.push({
                isChunk: true,
                type: 'CMAF Chunk',
                offset: moof.offset,
                size: moof.size + mdat.size,
                headerSize: 0, // Logical chunk has no header
                contentOffset: moof.offset,
                children: [moof, mdat],
                // @ts-ignore - timing is a custom property for our view model
                timing,
                details: {
                    info: {
                        value: 'A logical grouping of a moof and mdat box, representing a single CMAF chunk.',
                        offset: moof.offset,
                        length: 0,
                    },
                    size: {
                        value: `${moof.size + mdat.size} bytes`,
                        offset: moof.offset,
                        length: 0,
                    },
                },
                issues: [],
            });
            i += 2;
        } else {
            grouped.push(box);
            i += 1;
        }
    }
    return grouped;
}

const buildSampleDescriptionMap = (moov) => {
    const map = new Map();
    if (!moov) return map;

    const traks = findChildrenRecursive(moov.children, 'trak');
    for (const trak of traks) {
        const tkhd = findBoxRecursive(trak.children, (b) => b.type === 'tkhd');
        const trackId = tkhd?.details.track_ID?.value;
        if (!trackId) continue;

        const stsd = findBoxRecursive(trak.children, (b) => b.type === 'stsd');
        if (stsd?.children) {
            map.set(trackId, stsd.children);
        }
    }
    return map;
};

/**
 * Traverses the box tree to build a single, canonical list of all samples with correct offsets.
 * This function must be called AFTER the full box tree is parsed.
 * @param {object} parsedData
 * @param {ArrayBuffer} segmentBuffer The raw buffer for the entire segment.
 * @returns {object[]}
 */
function buildCanonicalSampleList(parsedData, segmentBuffer) {
    const samples = [];
    let sampleIndex = 0;

    const moov = findBoxRecursive(
        parsedData.data.boxes,
        (b) => b.type === 'moov'
    );
    const trexMap = new Map();
    if (moov) {
        const trexBoxes = findChildrenRecursive(moov.children, 'trex');
        for (const trex of trexBoxes) {
            if (trex.details.track_ID) {
                trexMap.set(trex.details.track_ID.value, trex);
            }
        }
    }
    const sampleDescriptionMap = buildSampleDescriptionMap(moov);

    const moofBoxes = findChildrenRecursive(parsedData.data.boxes, 'moof');

    for (const moofBox of moofBoxes) {
        const trafBoxes = moofBox.children.filter((c) => c.type === 'traf');
        for (const traf of trafBoxes) {
            const tfhd = findBoxRecursive(
                traf.children,
                (b) => b.type === 'tfhd'
            );
            const trun = findBoxRecursive(
                traf.children,
                (b) => b.type === 'trun'
            );
            const tfdt = findBoxRecursive(
                traf.children,
                (b) => b.type === 'tfdt'
            );

            if (!trun || !tfhd || !trun.details.sample_count) continue;

            const trackId = tfhd.details.track_ID?.value;
            const trex = trexMap.get(trackId);
            const sampleDescriptionIndex =
                tfhd.details.sample_description_index?.value || 1;
            const sampleDescriptions = sampleDescriptionMap.get(trackId);
            const sampleDescription = sampleDescriptions
                ? sampleDescriptions[sampleDescriptionIndex - 1]
                : null;

            const defaultSampleDuration =
                tfhd.details.default_sample_duration?.value ??
                trex?.details.default_sample_duration?.value;
            const defaultSampleSize =
                tfhd.details.default_sample_size?.value ??
                trex?.details.default_sample_size?.value;
            const defaultSampleFlagsInt = tfhd.details.default_sample_flags
                ?.value
                ? parseInt(tfhd.details.default_sample_flags.value, 16)
                : trex?.details.default_sample_flags?.value
                  ? parseInt(trex.details.default_sample_flags.value, 16)
                  : null;
            const defaultSampleFlags =
                defaultSampleFlagsInt !== null
                    ? decodeSampleFlags(defaultSampleFlagsInt)
                    : null;

            const baseDataOffset =
                tfhd.details.base_data_offset?.value ?? moofBox.offset;
            const dataOffset = trun.details.data_offset?.value || 0;
            let currentOffset = baseDataOffset + dataOffset;

            const trunDataView = new DataView(
                trun.dataView.buffer,
                trun.dataView.byteOffset,
                trun.size
            );
            let sampleOffset =
                trun.details.sample_data_loop?.offset - trun.offset;

            for (let i = 0; i < trun.details.sample_count.value; i++) {
                const sampleInfo = {};
                if (trun.details.flags.value.sample_duration_present) {
                    sampleInfo.duration = trunDataView.getUint32(sampleOffset);
                    sampleOffset += 4;
                }
                if (trun.details.flags.value.sample_size_present) {
                    sampleInfo.size = trunDataView.getUint32(sampleOffset);
                    sampleOffset += 4;
                }
                if (trun.details.flags.value.sample_flags_present) {
                    sampleInfo.sampleFlags = decodeSampleFlags(
                        trunDataView.getUint32(sampleOffset)
                    );
                    sampleOffset += 4;
                }
                if (
                    trun.details.flags.value
                        .sample_composition_time_offsets_present
                ) {
                    if (trun.details.version.value === 0) {
                        sampleInfo.compositionTimeOffset =
                            trunDataView.getUint32(sampleOffset);
                    } else {
                        sampleInfo.compositionTimeOffset =
                            trunDataView.getInt32(sampleOffset);
                    }
                    sampleOffset += 4;
                }

                const sample = {
                    duration: sampleInfo.duration ?? defaultSampleDuration ?? 0,
                    size: sampleInfo.size ?? defaultSampleSize,
                    sampleFlags: sampleInfo.sampleFlags ?? defaultSampleFlags,
                    compositionTimeOffset: sampleInfo.compositionTimeOffset,
                    isSample: true,
                    index: sampleIndex,
                    offset: currentOffset,
                    trunOffset: trun.offset,
                    color: { bgClass: 'bg-gray-700/20' },
                    baseMediaDecodeTime:
                        tfdt?.details.baseMediaDecodeTime?.value,
                    trackId: tfhd.details.track_ID?.value,
                };

                if (
                    sampleDescription &&
                    sampleDescription.type === 'stpp' &&
                    sample.size > 0
                ) {
                    const sampleBytes = new Uint8Array(
                        segmentBuffer,
                        sample.offset,
                        sample.size
                    );
                    const ttmlString = new TextDecoder().decode(sampleBytes);
                    try {
                        sample.ttmlPayload = parseTTML(ttmlString);
                    } catch (e) {
                        console.warn(
                            'Failed to parse TTML payload in sample',
                            e
                        );
                        sample.ttmlPayload = { error: e.message };
                    }
                }

                samples.push(sample);
                currentOffset += sample.size || 0;
                sampleIndex++;
            }
        }
    }
    return samples;
}

/**
 * Enriches the canonical sample list with data from other boxes (sdtp, stdp, etc.).
 * @param {object[]} samples The canonical sample list.
 * @param {object} parsedData The full parsed data object.
 */
function decorateSamples(samples, parsedData) {
    const sdtp = findBoxRecursive(
        parsedData.data.boxes,
        (b) => b.type === 'sdtp'
    );
    const stdp = findBoxRecursive(
        parsedData.data.boxes,
        (b) => b.type === 'stdp'
    );
    const sbgp = findBoxRecursive(
        parsedData.data.boxes,
        (b) => b.type === 'sbgp'
    );
    const senc = findBoxRecursive(
        parsedData.data.boxes,
        (b) => b.type === 'senc'
    );

    if (sdtp?.entries) {
        samples.forEach((sample, i) => {
            if (sdtp.entries[i]) {
                sample.sampleFlags = {
                    ...sample.sampleFlags,
                    ...sdtp.entries[i],
                };
            }
        });
    }

    let sbgpSampleCounter = 0;
    let sbgpEntryIndex = 0;
    samples.forEach((sample, i) => {
        if (stdp?.entries?.[i]) {
            sample.degradationPriority = stdp.entries[i];
        }
        if (sbgp?.entries) {
            if (sbgpSampleCounter === 0) {
                if (sbgp.entries[sbgpEntryIndex]) {
                    sbgpSampleCounter =
                        sbgp.entries[sbgpEntryIndex].sample_count;
                }
            }
            if (sbgpSampleCounter > 0) {
                sample.sampleGroup =
                    sbgp.entries[sbgpEntryIndex].group_description_index;
                sbgpSampleCounter--;
                if (sbgpSampleCounter === 0) {
                    sbgpEntryIndex++;
                }
            }
        }
        if (senc?.samples?.[i]?.encryption) {
            sample.encryption = senc.samples[i].encryption;
        }
    });
}

function correlateEmsgToSamples(samples, parsedData) {
    const emsgBoxes = findChildrenRecursive(parsedData.data.boxes, 'emsg');
    if (emsgBoxes.length === 0 || samples.length === 0) {
        return;
    }

    let currentTime = 0;
    let samplePresentationTimes = samples.map((sample) => {
        const dts = sample.baseMediaDecodeTime + currentTime;
        const cts = dts + (sample.compositionTimeOffset || 0);
        currentTime += sample.duration;
        return { start: cts, end: cts + sample.duration, sample };
    });

    for (const emsg of emsgBoxes) {
        const presentationTime =
            emsg.details.presentation_time?.value ??
            emsg.details.presentation_time_delta?.value;
        if (presentationTime === undefined) continue;

        const targetSample = samplePresentationTimes.find(
            (s) => presentationTime >= s.start && presentationTime < s.end
        );

        if (targetSample) {
            targetSample.sample.has_emsg = true;
            targetSample.sample.emsg_ref = emsg;
        }
    }
}

/**
 * @param {ArrayBuffer} buffer
 * @param {number} baseOffset
 * @param {object} [context={}]
 * @returns {{format: 'isobmff', data: {boxes: import('../../../types.ts').Box[], issues: {type: 'error' | 'warn', message: string}[], events: object[]}, samples?: object[]}}
 */
export function parseISOBMFF(buffer, baseOffset = 0, context = {}) {
    const result = {
        boxes: [],
        issues: [],
        events: [],
    };
    const dataView = new DataView(buffer);
    let offset = 0;

    while (offset < dataView.byteLength) {
        if (offset + 8 > dataView.byteLength) {
            const remaining = dataView.byteLength - offset;
            if (remaining > 0) {
                result.issues.push({
                    type: 'warn',
                    message: `Trailing ${remaining} bytes at offset ${
                        baseOffset + offset
                    } could not be parsed as a box.`,
                });
            }
            break;
        }

        let size = dataView.getUint32(offset);
        const type = String.fromCharCode(
            dataView.getUint8(offset + 4),
            dataView.getUint8(offset + 5),
            dataView.getUint8(offset + 6),
            dataView.getUint8(offset + 7)
        );

        let headerSize = 8;
        if (size === 1) {
            if (offset + 16 > dataView.byteLength) {
                result.issues.push({
                    type: 'error',
                    message: `Incomplete largesize box header for type '${type}' at offset ${
                        baseOffset + offset
                    }. Requires 16 bytes, found ${
                        dataView.byteLength - offset
                    }.`,
                });
                break;
            }
            size = Number(dataView.getBigUint64(offset + 8));
            headerSize = 16;
        } else if (size === 0) {
            size = dataView.byteLength - offset;
        }

        if (size < headerSize) {
            result.issues.push({
                type: 'error',
                message: `Invalid size ${size} for box '${type}' at offset ${
                    baseOffset + offset
                }. Box size is smaller than its header size.`,
            });
            break;
        }

        /** @type {import('../../../types.ts').Box} */
        const box = {
            type,
            size,
            offset: baseOffset + offset,
            contentOffset: baseOffset + offset + headerSize,
            headerSize,
            children: [],
            details: {},
            issues: [],
        };

        const availableBytes = dataView.byteLength - offset;
        const effectiveSize = Math.min(size, availableBytes);

        if (size > availableBytes) {
            const isTruncatedMdatInIframe = context.isIFrame && type === 'mdat';
            if (!isTruncatedMdatInIframe) {
                box.issues.push({
                    type: 'error',
                    message: `Box '${type}' is truncated. Declared size is ${size} bytes, but only ${availableBytes} bytes are available in the buffer.`,
                });
            }
        }

        box.details['size'] = {
            value: `${size} bytes`,
            offset: box.offset,
            length: headerSize > 8 ? 8 : 4,
        };
        box.details['type'] = {
            value: type,
            offset: box.offset + 4,
            length: 4,
        };

        const boxDataView = new DataView(buffer, offset, effectiveSize);
        box.dataView = boxDataView; // Store for later parsing (trun)

        const childContext = { ...context };
        if (type === 'moof') {
            childContext.moofOffset = box.offset;
        }

        const traf = findBoxRecursive(box.children, (b) => b.type === 'traf');
        if (traf) {
            const tfhd = findBoxRecursive(
                traf.children,
                (b) => b.type === 'tfhd'
            );
            if (tfhd) {
                childContext.baseDataOffset =
                    tfhd.details.base_data_offset?.value ||
                    childContext.moofOffset ||
                    0;
            }
        }
        parseBoxDetails(box, boxDataView, childContext);

        if (type === 'emsg') {
            result.events.push(box);
        }

        if (knownContainerBoxes.has(type) && effectiveSize > headerSize) {
            let childrenStart = headerSize;
            let childrenBase = box.contentOffset;

            if (
                type === 'avc1' ||
                type === 'hvc1' ||
                type === 'hev1' ||
                type === 'mp4a' ||
                type === 'encv' ||
                type === 'enca'
            ) {
                const sampleEntryHeaderSize =
                    type === 'avc1' ||
                    type === 'hvc1' ||
                    type === 'hev1' ||
                    type === 'encv'
                        ? 78
                        : 28;
                childrenStart += sampleEntryHeaderSize;
                childrenBase += sampleEntryHeaderSize;
            } else if (type === 'stsd' || type === 'dref' || type === 'trep') {
                childrenStart += 8;
                childrenBase += 8;
            } else if (type === 'meta') {
                childrenStart += 4;
                childrenBase += 4;
            }

            if (effectiveSize > childrenStart) {
                const childrenBuffer = buffer.slice(
                    offset + childrenStart,
                    offset + effectiveSize
                );
                if (childrenBuffer.byteLength > 0) {
                    const childResult = parseISOBMFF(
                        childrenBuffer,
                        childrenBase,
                        childContext
                    );
                    box.children = childResult.data.boxes;
                    if (childResult.data.events.length > 0) {
                        result.events.push(...childResult.data.events);
                    }
                    if (childResult.data.issues.length > 0) {
                        box.issues.push(...childResult.data.issues);
                    }
                }
            }
        }

        result.boxes.push(box);
        offset += effectiveSize;
    }

    result.boxes = groupAndCalcTimingForChunks(result.boxes);

    const parsedResultData = { format: 'isobmff', data: result };
    const samples = buildCanonicalSampleList(parsedResultData, buffer);
    if (samples.length > 0) {
        decorateSamples(samples, parsedResultData);
        correlateEmsgToSamples(samples, parsedResultData);
    }

    // --- ARCHITECTURAL FIX: Inject enriched samples back into trun boxes ---
    const trunBoxes = findChildrenRecursive(result.boxes, 'trun');
    let sampleCursor = 0;
    for (const trunBox of trunBoxes) {
        const sampleCount = trunBox.details.sample_count.value;
        if (sampleCount > 0) {
            trunBox.samples = samples.slice(
                sampleCursor,
                sampleCursor + sampleCount
            );
            sampleCursor += sampleCount;
        }
    }
    // --- END FIX ---

    return {
        format: 'isobmff',
        data: result,
        samples: samples.length > 0 ? samples : undefined,
    };
}

/**
 * @param {import('../../../types.ts').Box} box
 * @param {DataView} view
 * @param {object} context
 */
function parseBoxDetails(box, view, context) {
    try {
        const parser = boxParsers[box.type];
        if (parser) {
            parser(box, view, context);
        } else if (box.type === 'mdat') {
            // The descriptive text is now in the tooltip data. Do nothing here.
        } else if (!knownContainerBoxes.has(box.type)) {
            box.issues = box.issues || [];
            box.issues.push({
                type: 'warn',
                message: `No parser implemented for box type '${box.type}'. Box content not parsed.`,
            });
        }
    } catch (e) {
        box.issues = box.issues || [];
        box.issues.push({
            type: 'error',
            message: `Unhandled parser exception: ${e.message}`,
        });
        console.error(`Error parsing ISOBMFF box "${box.type}":`, e);
    }
}
