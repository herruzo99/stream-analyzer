import { compareIsobmffSegments } from './isobmffComparator.js';
import { compareTsSegments } from './tsComparator.js';

/**
 * The main comparison engine. It takes an array of enriched segment objects,
 * validates them, and dispatches to the appropriate protocol-specific comparator.
 *
 * @param {object[]} segments - An array of enriched segment objects, each containing
 *   the parsed data, the source stream, and the source segment info.
 * @returns {{headers: object[], sections: object[], structuralDiff: object[]}} A structured view model for the comparison UI.
 */
export function createComparisonModel(segments) {
    if (!segments || segments.length === 0) {
        return { headers: [], sections: [], structuralDiff: [] };
    }

    const firstFormat = segments[0].format;
    if (!segments.every((s) => s.format === firstFormat)) {
        const secondFormat = segments.find(
            (s) => s.format !== firstFormat
        )?.format;
        throw new Error(
            `Cannot compare segments of different formats (${firstFormat} vs ${secondFormat}).`
        );
    }

    const headers = segments.map((segment) => ({
        streamName: segment.stream.name,
        segmentNumber:
            segment.segment.number ??
            `Init @${segment.segment.resolvedUrl.split('/').pop()}`,
        segmentUrl: segment.segment.resolvedUrl,
    }));

    let comparisonResult;
    switch (firstFormat) {
        case 'isobmff':
            comparisonResult = compareIsobmffSegments(segments);
            break;
        case 'ts':
            comparisonResult = compareTsSegments(segments);
            break;
        case 'vtt':
            // return compareVttSegments(segments); // Future implementation
            throw new Error('VTT segment comparison is not yet implemented.');
        default:
            throw new Error(
                `Unsupported segment format for comparison: ${firstFormat}`
            );
    }

    return {
        headers,
        ...comparisonResult,
    };
}
