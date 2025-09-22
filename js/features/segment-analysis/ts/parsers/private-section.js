// Parses the generic structure of a private_section as defined in
// ITU-T H.222.0 | ISO/IEC 13818-1, clause 2.4.4.11. This is used for
// user-defined data and standard tables like the NIT.

/**
 * Parses a private section payload.
 * @param {DataView} view - A DataView of the private section's payload.
 * @returns {object} An object indicating a private section was found.
 */
export function parsePrivateSectionPayload(view) {
    const dataBytes = [];
    for (let i = 0; i < Math.min(view.byteLength, 32); i++) { // Limit displayed bytes
        dataBytes.push(view.getUint8(i).toString(16).padStart(2, '0'));
    }
    const dataString = view.byteLength > 32 ? `${dataBytes.join(' ')}...` : dataBytes.join(' ');
    
    return {
        type: 'Private Section',
        data_length: { value: view.byteLength },
        data_preview: { value: dataString },
    };
}

export const privateSectionTooltipData = {
    'Private Section': {
        text: 'A container for privately defined data, such as a Network Information Table (NIT). The syntax is defined by the user.',
        ref: 'Clause 2.4.4.11',
    },
};