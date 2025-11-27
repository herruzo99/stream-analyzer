import { tooltipData } from './descriptors/tooltips.js';
import { parseTsSegment } from './engine.js';

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
            data: {
                summary: {
                    totalPackets: 0,
                    errors: [e.message],
                    pmtPids: new Set(),
                    privateSectionPids: new Set(),
                    dsmccPids: new Set(),
                    programMap: {},
                    pcrPid: null,
                    pcrList: [],
                    continuityCounters: {},
                    tsdt: null,
                    ipmp: null,
                },
                packets: [],
            },
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
