import { parseTsSegment } from './engine.js';
import { tooltipData } from './parsers/descriptors/tooltips.js';

/**
 * The main entry point for parsing an MPEG-2 Transport Stream segment.
 * @param {ArrayBuffer} buffer - The raw segment data.
 * @returns {object} The parsed segment data structure.
 */
export function parse(buffer) {
    try {
        return parseTsSegment(buffer);
    } catch (e) {
        console.error('Error parsing TS segment:', e);
        return {
            format: 'ts',
            error: e.message,
            data: { summary: { errors: [e.message] }, packets: [] },
        };
    }
}

/**
 * Retrieves the tooltip data for all implemented TS elements.
 * @returns {object}
 */
export function getTooltipData() {
    return tooltipData;
}
