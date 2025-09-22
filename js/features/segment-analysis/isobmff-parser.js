import { boxParsers, tooltipData } from './isobmff/index.js';

/**
 * @typedef {object} Box
 * @property {string} type
 * @property {number} size
 * @property {number} offset
 * @property {number} contentOffset
 * @property {number} headerSize
 * @property {Record<string, {value: any, offset: number, length: number}>} details
 * @property {Box[]} children
 */

export const getTooltipData = () => tooltipData;

/**
 * @param {ArrayBuffer} buffer
 * @param {number} baseOffset
 * @returns {Box[]}
 */
export function parseISOBMFF(buffer, baseOffset = 0) {
    /** @type {Box[]} */
    const boxes = [];
    let offset = 0;
    const dataView = new DataView(buffer);

    while (offset < buffer.byteLength) {
        if (offset + 8 > buffer.byteLength) break; // Minimum box size (size + type)
        let size = dataView.getUint32(offset);
        const type = String.fromCharCode.apply(
            null,
            new Uint8Array(buffer, offset + 4, 4)
        );

        let headerSize = 8; // Default size + type
        let actualSize = size;
        let sizeFieldLength = 4;

        if (size === 1) {
            if (offset + 16 > buffer.byteLength) break; // Need 16 bytes for large size
            actualSize = Number(dataView.getBigUint64(offset + 8));
            headerSize = 16; // size (4) + type (4) + largesize (8)
            sizeFieldLength = 12; // size(4) + largesize(8)
        } else if (size === 0) {
            // Box extends to end of file, or until next box in a container
            // For now, assume it extends to the end of the current buffer
            actualSize = buffer.byteLength - offset;
        }

        if (
            offset + actualSize > buffer.byteLength ||
            actualSize < headerSize
        ) {
            // Malformed box, stop parsing this level
            break;
        }

        /** @type {Box} */
        const box = {
            type,
            size: actualSize,
            offset: baseOffset + offset,
            contentOffset: baseOffset + offset + headerSize, // Content starts after the standard header
            headerSize,
            children: [],
            details: {},
        };

        // Deconstruct header into semantic fields
        box.details['size'] = {
            value: `${actualSize} bytes`,
            offset: box.offset,
            length: sizeFieldLength,
        };
        box.details['type'] = {
            value: type,
            offset: box.offset + 4,
            length: 4,
        };

        parseBoxDetails(box, new DataView(buffer, offset, actualSize));

        // Container boxes whose children should be parsed
        const containerBoxes = [
            'moof',
            'traf',
            'moov',
            'trak',
            'mdia',
            'minf',
            'stbl',
            'mvex',
            'edts',
            'avc1',
            'mp4a',
            //'styp',
        ];
        if (containerBoxes.includes(type)) {
            let childrenParseOffset = box.contentOffset;
            // Sample Entries ('avc1', 'mp4a') have internal fields before their child boxes.
            if (type === 'avc1') {
                // VisualSampleEntry header is 78 bytes total before children.
                // 8 (SampleEntry) + 70 (VisualSampleEntry fields)
                childrenParseOffset += 78 - box.headerSize;
            } else if (type === 'mp4a') {
                // AudioSampleEntry header is 28 bytes total before children.
                // 8 (SampleEntry) + 20 (AudioSampleEntry fields)
                childrenParseOffset += 28 - box.headerSize;
            }

            const childrenBufferStart =
                offset + (childrenParseOffset - box.offset);
            const childrenBufferEnd = offset + actualSize;

            if (childrenBufferStart < childrenBufferEnd) {
                const childrenBuffer = buffer.slice(
                    childrenBufferStart,
                    childrenBufferEnd
                );
                if (childrenBuffer.byteLength > 0) {
                    box.children = parseISOBMFF(
                        childrenBuffer,
                        childrenParseOffset
                    );
                }
            }
        }

        if (type === 'stsd') {
            // stsd contains version/flags(4) and entry_count(4) before the sample entry boxes.
            const stsdPayloadHeaderLength = 8;
            const childrenStartOffset = box.contentOffset + stsdPayloadHeaderLength;
            const childrenBufferStart = offset + box.headerSize + stsdPayloadHeaderLength;

            const childrenBuffer = buffer.slice(
                childrenBufferStart,
                offset + actualSize
            );
            if (childrenBuffer.byteLength > 0) {
                box.children = parseISOBMFF(
                    childrenBuffer,
                    childrenStartOffset
                );
            }
        }

        boxes.push(box);
        offset += actualSize;
    }
    return boxes;
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
        }
    } catch (e) {
        console.error(`Error parsing ISOBMFF box "${box.type}":`, e);
        box.details['Parsing Error'] = {
            value: e.message,
            offset: box.offset,
            length: box.size,
        };
    }
}