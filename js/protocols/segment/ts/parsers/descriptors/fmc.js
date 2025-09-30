/**
 * Parses an FMC (FlexMux Channel) Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.44
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseFmcDescriptor(view, baseOffset) {
    const entries = [];
    for (let offset = 0; offset < view.byteLength; offset += 3) {
        if (offset + 3 > view.byteLength) break;
        const esId = view.getUint16(offset);
        const flexMuxChannel = view.getUint8(offset + 2);
        entries.push({
            ES_ID: { value: esId, offset: baseOffset + offset, length: 2 },
            FlexMuxChannel: {
                value: flexMuxChannel,
                offset: baseOffset + offset + 2,
                length: 1,
            },
        });
    }

    return { entries };
}
