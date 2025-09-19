import { tooltipData } from './isobmff-tooltip-data.js';
import { boxParsers } from './isobmff-box-parsers/index.js';

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
    while (offset < buffer.byteLength) {
        if (offset + 8 > buffer.byteLength) break;
        const dataView = new DataView(buffer);
        let size = dataView.getUint32(offset);
        const type = String.fromCharCode.apply(
            null,
            new Uint8Array(buffer, offset + 4, 4)
        );
        let headerSize = 8;

        if (size === 1) {
            if (offset + 16 > buffer.byteLength) break;
            size = Number(dataView.getBigUint64(offset + 8));
            headerSize = 16;
        } else if (size === 0) {
            size = buffer.byteLength - offset;
        }

        if (offset + size > buffer.byteLength) {
            size = buffer.byteLength - offset;
        }
        
        /** @type {Box} */
        const box = { type, size, offset: baseOffset + offset, contentOffset: baseOffset + offset + headerSize, headerSize, children: [], details: {} };
        parseBoxDetails(box, new DataView(buffer, offset, size));

        const containerBoxes = [ 'moof', 'traf', 'moov', 'trak', 'mdia', 'minf', 'stbl', 'mvex', 'edts' ];
        if (containerBoxes.includes(type)) {
            const childrenBuffer = buffer.slice(offset + headerSize, offset + size);
            if (childrenBuffer.byteLength > 0) {
                box.children = parseISOBMFF(childrenBuffer, box.contentOffset);
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
             box.details['info'] = { value: 'Contains raw media data for samples.', offset: box.contentOffset, length: box.size - box.headerSize };
        }
    } catch (_e) {
        box.details['Parsing Error'] = { value: _e.message, offset: box.offset, length: box.size };
    }
}