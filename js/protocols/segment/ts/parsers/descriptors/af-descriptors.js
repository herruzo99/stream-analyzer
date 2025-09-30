import { parseTimelineDescriptor } from './timeline.js';

/**
 * Parses a loop of Adaptation Field (AF) descriptors.
 * @param {DataView} view - A DataView starting at the beginning of the descriptor loop.
 * @param {number} baseOffset - The offset of the loop within the segment.
 * @returns {object[]} An array of parsed AF descriptor objects.
 */
export function parseAfDescriptors(view, baseOffset) {
    const descriptors = [];
    let offset = 0;

    while (offset < view.byteLength) {
        if (offset + 2 > view.byteLength) break;
        const tag = view.getUint8(offset);
        const length = view.getUint8(offset + 1);

        if (offset + 2 + length > view.byteLength) break;

        const payloadView = new DataView(
            view.buffer,
            view.byteOffset + offset + 2,
            length
        );
        const payloadOffset = baseOffset + offset + 2;

        let details;
        let name = 'Unknown/Private AF Descriptor';

        // Tag values from Table U.3
        switch (tag) {
            case 0x04:
                name = 'Timeline Descriptor';
                details = parseTimelineDescriptor(payloadView, payloadOffset);
                break;
            // Stubs for other AF descriptors
            case 0x05:
                name = 'Location Descriptor';
                break;
            case 0x06:
                name = 'BaseURL Descriptor';
                break;
            case 0x0b:
                name = 'Boundary Descriptor';
                break;
            case 0x0c:
                name = 'Labeling Descriptor';
                break;
        }

        if (!details) {
            details = {
                data: {
                    value: `${length} bytes`,
                    offset: payloadOffset,
                    length,
                },
            };
        }

        descriptors.push({
            tag,
            length,
            name,
            details,
        });
        offset += 2 + length;
    }
    return descriptors;
}
