/**
 * Parses an ISO 639 Language Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.18 & Table 2-60
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed language descriptor.
 */
export function parseIso639LanguageDescriptor(view, baseOffset) {
    const languages = [];
    for (let offset = 0; offset < view.byteLength; offset += 4) {
        if (offset + 4 > view.byteLength) break;
        const langCode =
            String.fromCharCode(view.getUint8(offset)) +
            String.fromCharCode(view.getUint8(offset + 1)) +
            String.fromCharCode(view.getUint8(offset + 2));
        const audioType = view.getUint8(offset + 3);
        const audioTypeMap = {
            0x00: 'Undefined',
            0x01: 'Clean effects',
            0x02: 'Hearing impaired',
            0x03: 'Visual impaired commentary',
        };
        languages.push({
            language: {
                value: langCode,
                offset: baseOffset + offset,
                length: 3,
            },
            audio_type: {
                value:
                    audioTypeMap[audioType] ||
                    `User Private (0x${audioType.toString(16)})`,
                offset: baseOffset + offset + 3,
                length: 1,
            },
        });
    }
    return { languages };
}
