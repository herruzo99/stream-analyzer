import { boxParsers } from './index.js';

/**
 * @typedef {object} Box
 * @property {string} type
 * @property {number} size
 * @property {number} offset
 * @property {number} contentOffset
 * @property {number} headerSize
 * @property {Record<string, {value: any, offset: number, length: number}>} details
 * @property {Box[]} children
 * @property {object[]=} samples
 * @property {any[]=} entries
 * @property {{type: 'error' | 'warn', message: string}[]=} issues
 * @property {boolean=} isChunk - Dynamically added property for view model
 * @property {object=} color - Dynamically added property for view model
 * @property {string=} systemId - For 'pssh' boxes
 * @property {string[]=} kids - For 'pssh' boxes (version > 0)
 * @property {string=} data - For 'pssh' boxes (base64 encoded)
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
 * @param {ArrayBuffer} buffer
 * @param {number} baseOffset
 * @returns {{format: 'isobmff', data: {boxes: Box[], issues: {type: 'error' | 'warn', message: string}[], events: object[]}}}
 */
export function parseISOBMFF(buffer, baseOffset = 0) {
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
        parseBoxDetails(box, boxDataView);

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
                        childrenBase
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
    return { format: 'isobmff', data: result };
}

/**
 * @param {Box} box
 * @param {DataView} view
 */
function parseBoxDetails(box, view) {
    try {
        const parser = boxParsers[box.type];
        if (parser) {
            parser(box, view);
        } else if (box.type === 'mdat') {
            box.details['info'] = {
                value: 'Contains raw media data for samples.',
                offset: box.contentOffset,
                length: box.size - box.headerSize,
            };
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
