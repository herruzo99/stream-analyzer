import { boxParsers } from './index.js';

/**
 * @typedef {object} Box
 * @property {string} type
 * @property {number} size
 * @property {number} offset
 * @property {number} contentOffset
 * @property {number} headerSize
 * @property {Record<string, {value: any, offset: number, length: number, internal?: boolean}>} details
 * @property {Box[]} children
 * @property {object[]=} samples
 * @property {any[]=} entries
 * @property {{type: 'error' | 'warn', message: string}[]=} issues
 * @property {boolean=} isChunk - Dynamically added property for view model
 * @property {object=} color - Dynamically added property for view model
 * @property {string=} systemId - For 'pssh' boxes
 * @property {string[]=} kids - For 'pssh' boxes (version > 0)
 * @property {string=} data - For 'pssh' boxes (base64 encoded)
 * @property {object=} scte35 - Parsed SCTE-35 data if the emsg box contains it.
 */

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
]);

/**
 * Recursively finds the first occurrence of a box that satisfies a predicate.
 * @param {Box[]} boxes The list of boxes to search.
 * @param {(box: Box) => boolean} predicate The predicate function to match a box.
 * @returns {Box | null} The found box or null.
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
 * Calculates raw timing information for a CMAF Chunk from its 'moof' box.
 * @param {Box} moofBox The parsed 'moof' box of the chunk.
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

    if (trun && trun.samples) {
        timing.duration = trun.samples.reduce(
            (acc, s) => acc + (s.duration || 0),
            0
        );
        timing.sampleCount = trun.samples.length;
    }

    return timing;
}

/**
 * Groups a flat list of boxes into logical CMAF Chunks ('moof' + 'mdat').
 * @param {Box[]} boxes A flat list of parsed ISOBMFF boxes.
 * @returns {Box[]} A structured list containing Chunk objects and other top-level boxes.
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

/**
 * Traverses the box tree to build a single, canonical list of all samples with correct offsets.
 * This function must be called AFTER the full box tree is parsed.
 * @param {object} parsedData
 * @returns {object[]}
 */
function buildCanonicalSampleList(parsedData) {
    const samples = [];
    let sampleIndex = 0;

    const findMoofBoxesRecursive = (boxes) => {
        let moofBoxes = [];
        if (!boxes) return [];
        for (const box of boxes) {
            if (box.type === 'moof') {
                moofBoxes.push(box);
            }
            if (box.children?.length > 0) {
                moofBoxes = moofBoxes.concat(
                    findMoofBoxesRecursive(box.children)
                );
            }
        }
        return moofBoxes;
    };

    const moofBoxes = findMoofBoxesRecursive(parsedData.data.boxes);

    moofBoxes.forEach((moofBox) => {
        const trafBoxes = moofBox.children.filter((c) => c.type === 'traf');
        trafBoxes.forEach((traf) => {
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
            if (!trun || !tfhd || !trun.samples) return;

            const baseDataOffset =
                tfhd.details.base_data_offset?.value ?? moofBox.offset;
            const dataOffset = trun.details.data_offset?.value || 0;
            let currentOffset = baseDataOffset + dataOffset;

            trun.samples.forEach((sampleInfo) => {
                const sample = {
                    ...sampleInfo,
                    isSample: true,
                    index: sampleIndex,
                    offset: currentOffset,
                    trunOffset: trun.offset,
                    color: { bgClass: 'bg-gray-700/20' },
                    baseMediaDecodeTime:
                        tfdt?.details.baseMediaDecodeTime?.value,
                    trackId: tfhd.details.track_ID?.value,
                };

                samples.push(sample);
                currentOffset += sample.size || 0;
                sampleIndex++;
            });
        });
    });
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

    // --- STRATEGY 1: Use `sdtp` box if present (most explicit) ---
    if (sdtp?.entries) {
        samples.forEach((sample, i) => {
            if (sdtp.entries[i]) {
                sample.dependsOn = sdtp.entries[i].sample_depends_on;
            }
        });
    } else {
        // --- STRATEGY 2: Fallback to `trun` sample flags (common for fMP4) ---
        samples.forEach((sample) => {
            if (sample.flags) {
                sample.dependsOn = sample.flags.sample_is_non_sync_sample
                    ? 'Depends on others (not an I-picture)'
                    : 'Does not depend on others (I-picture)';
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
        if (senc?.samples?.[i]) {
            sample.encryption = senc.samples[i];
        }
    });
}

/**
 * @param {ArrayBuffer} buffer
 * @param {number} baseOffset
 * @param {object} [context={}]
 * @returns {{format: 'isobmff', data: {boxes: Box[], issues: {type: 'error' | 'warn', message: string}[], events: object[]}, samples?: object[]}}
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

        if (size < headerSize || offset + size > dataView.byteLength) {
            result.issues.push({
                type: 'error',
                message: `Invalid size ${size} for box '${type}' at offset ${
                    baseOffset + offset
                }. Box claims to extend beyond buffer limits.`,
            });
            break;
        }

        /** @type {Box} */
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

        const boxDataView = new DataView(buffer, offset, size);
        const childContext = { ...context };
        if (type === 'moof') {
            childContext.moofOffset = box.offset;
        }
        // This is a simplification; a full implementation would need to parse tfhd first
        // to get the base_data_offset. The trun parser now receives this context.
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

        if (knownContainerBoxes.has(type) && size > headerSize) {
            let childrenStart = headerSize;
            let childrenBase = box.contentOffset;

            if (
                type === 'avc1' ||
                type === 'mp4a' ||
                type === 'encv' ||
                type === 'enca'
            ) {
                const sampleEntryHeaderSize =
                    type === 'avc1' || type === 'encv' ? 78 : 28;
                childrenStart += sampleEntryHeaderSize;
                childrenBase += sampleEntryHeaderSize;
            } else if (type === 'stsd' || type === 'dref' || type === 'trep') {
                childrenStart += 8;
                childrenBase += 8;
            } else if (type === 'meta') {
                childrenStart += 4;
                childrenBase += 4;
            }

            if (size > childrenStart) {
                const childrenBuffer = buffer.slice(
                    offset + childrenStart,
                    offset + size
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
        offset += size;
    }

    result.boxes = groupAndCalcTimingForChunks(result.boxes);

    const parsedResultData = { format: 'isobmff', data: result };
    const samples = buildCanonicalSampleList(parsedResultData);
    if (samples.length > 0) {
        decorateSamples(samples, parsedResultData);
    }

    return {
        format: 'isobmff',
        data: result,
        samples: samples.length > 0 ? samples : undefined,
    };
}

/**
 * @param {Box} box
 * @param {DataView} view
 * @param {object} context
 */
function parseBoxDetails(box, view, context) {
    try {
        const parser = boxParsers[box.type];
        if (parser) {
            parser(box, view, context);
        } else if (box.type === 'mdat') {
            // --- ARCHITECTURAL ENHANCEMENT ---
            // Add a descriptive info field for the UI to display.
            box.details['info'] = {
                value: 'Contains the raw, multiplexed media samples (video frames, audio samples). The structure of this data is described by the metadata in the preceding `moof` box. It is not parsed further at this structural level.',
                offset: box.contentOffset,
                length: box.size - box.headerSize,
            };
            // --- END ENHANCEMENT ---
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