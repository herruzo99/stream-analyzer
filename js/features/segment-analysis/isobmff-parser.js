import { boxParsers, tooltipData } from './isobmff-box-parsers/index.js';

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
 * @param {boolean} isSampleDescription
 * @returns {Box[]}
 */
export function parseISOBMFF(buffer, baseOffset = 0, isSampleDescription = false) {
    /** @type {Box[]} */
    const boxes = [];
    let offset = 0;
    const dataView = new DataView(buffer);

    while (offset < buffer.byteLength) {
        if (offset + 8 > buffer.byteLength) break;
        let size = dataView.getUint32(offset);
        const type = String.fromCharCode.apply(
            null,
            new Uint8Array(buffer, offset + 4, 4)
        );
        //TODO: This is wrong the headerSize is the first 4 bytes of the box, need to get it from there.
        let headerSize = 8;
        
        // Sample Descriptions inside 'stsd' have a slightly different header structure
        // and are not standard boxes.
        if (isSampleDescription) {
            headerSize = 8 + 28; // size, type, plus 28 bytes of reserved/template fields
        }

        if (size === 1) {
            if (offset + 16 > buffer.byteLength) break;
            size = Number(dataView.getBigUint64(offset + 8));
            headerSize = isSampleDescription ? headerSize : 16;
        } else if (size === 0) {
            size = buffer.byteLength - offset;
        }

        if (offset + size > buffer.byteLength || size < headerSize) {
            // Malformed box, stop parsing this level
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
        };
        parseBoxDetails(box, new DataView(buffer, offset, size));

        const containerBoxes = [ 'moof', 'traf', 'moov', 'trak', 'mdia', 'minf', 'stbl', 'mvex', 'edts', 'avc1', 'mp4a' ];
        if (containerBoxes.includes(type) || (isSampleDescription)) {
            const childrenBuffer = buffer.slice(offset + headerSize, offset + size);
            if (childrenBuffer.byteLength > 0) {
                box.children = parseISOBMFF(childrenBuffer, box.contentOffset);
            }
        }
        
        // Special handling for stsd box children
        if (type === 'stsd') {
             const childrenBuffer = buffer.slice(offset + 16, offset + size); // After entry_count
             if(childrenBuffer.byteLength > 0) {
                box.children = parseISOBMFF(childrenBuffer, box.offset + 16, true);
             }
        }

        boxes.push(box);
        offset += size;
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
    } catch (_e) {
        box.details['Parsing Error'] = {
            value: _e.message,
            offset: box.offset,
            length: box.size,
        };
    }
}