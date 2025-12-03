/**
 * Parses a MuxCode Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.48 & Table 2-77
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMuxcodeDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    details.entries = [];
    // Loop MuxCodeTableEntry
    while (offset < view.byteLength) {
        if (offset + 3 > view.byteLength) break;
        const length = view.getUint8(offset);
        const muxCode = view.getUint8(offset + 1) & 0x0f;
        const version = (view.getUint8(offset + 1) >> 4) & 0x0f;
        const substructureCount = view.getUint8(offset + 2);

        const entry = {
            length: { value: length, offset: baseOffset + offset, length: 1 },
            MuxCode: {
                value: muxCode,
                offset: baseOffset + offset + 1,
                length: 0.5,
            },
            version: {
                value: version,
                offset: baseOffset + offset + 1,
                length: 0.5,
            },
            substructureCount: {
                value: substructureCount,
                offset: baseOffset + offset + 2,
                length: 1,
            },
            substructures: [],
        };

        let subOffset = 3;
        for (let i = 0; i < substructureCount; i++) {
            if (offset + subOffset + 1 > view.byteLength) break;
            const slotCount = view.getUint8(offset + subOffset);
            const repetitionCount = view.getUint8(offset + subOffset) >> 5;

            entry.substructures.push({
                slotCount: {
                    value: slotCount & 0x1f,
                    offset: baseOffset + offset + subOffset,
                    length: 1,
                },
                repetitionCount: {
                    value: repetitionCount,
                    offset: baseOffset + offset + subOffset,
                    length: 0,
                }, // Part of same byte
            });
            subOffset += 1;
        }

        // Advance by declared length
        details.entries.push(entry);
        offset += length + 1; // length field excludes itself
    }

    if (details.entries.length === 0) {
        return {
            mux_code_table_entry_data: {
                value: `${view.byteLength} bytes of MuxCodeTableEntry data`,
                offset: baseOffset,
                length: view.byteLength,
            },
        };
    }
    return details;
}
