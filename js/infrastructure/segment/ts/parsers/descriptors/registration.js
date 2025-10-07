/**
 * Parses a Registration Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.8 & Table 2-51
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed registration descriptor.
 */
export function parseRegistrationDescriptor(view, baseOffset) {
    const formatIdentifier = view.getUint32(0);
    const additionalInfoBytes = [];
    for (let i = 4; i < view.byteLength; i++) {
        additionalInfoBytes.push(
            view.getUint8(i).toString(16).padStart(2, '0')
        );
    }
    const formatIdentifierString = String.fromCharCode(
        (formatIdentifier >> 24) & 0xff,
        (formatIdentifier >> 16) & 0xff,
        (formatIdentifier >> 8) & 0xff,
        formatIdentifier & 0xff
    );

    return {
        format_identifier: {
            value: `0x${formatIdentifier
                .toString(16)
                .padStart(8, '0')} (${formatIdentifierString})`,
            offset: baseOffset,
            length: 4,
        },
        additional_identification_info: {
            value:
                additionalInfoBytes.length > 0
                    ? additionalInfoBytes.join(' ')
                    : 'none',
            offset: baseOffset + 4,
            length: additionalInfoBytes.length,
        },
    };
}
