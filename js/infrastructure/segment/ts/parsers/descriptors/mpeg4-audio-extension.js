/**
 * Parses an MPEG-4 Audio Extension Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.72 & Table 2-95
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpeg4AudioExtensionDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const flagsAndLoops = view.getUint8(offset);
    const ascFlag = (flagsAndLoops >> 7) & 1;
    const numLoops = flagsAndLoops & 0x0f;

    details.ASC_flag = {
        value: ascFlag,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.num_of_loops = {
        value: numLoops,
        offset: baseOffset + offset,
        length: 0.5,
    };
    offset += 1;

    for (let i = 0; i < numLoops; i++) {
        if (offset >= view.byteLength) break;
        const profileAndLevel = view.getUint8(offset);
        details[`audioProfileLevelIndication_${i + 1}`] = {
            value: `0x${profileAndLevel.toString(16).padStart(2, '0')}`,
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;
    }

    if (ascFlag) {
        if (offset < view.byteLength) {
            const ascSize = view.getUint8(offset);
            details.ASC_size = {
                value: ascSize,
                offset: baseOffset + offset,
                length: 1,
            };
            offset += 1;

            if (offset + ascSize <= view.byteLength) {
                details.audioSpecificConfig = {
                    value: `${ascSize} bytes of AudioSpecificConfig data`,
                    offset: baseOffset + offset,
                    length: ascSize,
                };
            }
        }
    }

    return details;
}
