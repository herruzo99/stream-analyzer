import { parseISOBMFF } from '@/infrastructure/parsing/isobmff/parser.js';
import { parse as parseTsSegment } from '@/infrastructure/parsing/ts/index.js';
import { parseVTT } from '@/infrastructure/parsing/vtt/parser.js';

export async function handleParseSegment({ url, data }) {
    const decoder = new TextDecoder();
    try {
        const text = decoder.decode(data.slice(0, 10));
        if (text.startsWith('WEBVTT')) {
            const vttString = decoder.decode(data);
            return {
                format: 'vtt',
                data: parseVTT(vttString),
            };
        }
    } catch {
        // Not text, proceed to binary parsing
    }

    const isLikelyTS =
        data.byteLength > 188 &&
        new DataView(data).getUint8(0) === 0x47 &&
        new DataView(data).getUint8(188) === 0x47;

    if (isLikelyTS || url.toLowerCase().endsWith('.ts')) {
        return parseTsSegment(data);
    }

    const { boxes, issues, events } = parseISOBMFF(data);
    return {
        format: 'isobmff',
        data: { boxes, issues, events },
    };
}