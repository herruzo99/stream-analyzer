/**
 * Parses an Auxiliary Video Stream Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.74 & Table 2-96
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseAuxiliaryVideoStreamDescriptor(view, baseOffset) {
    const aux_video_codedstreamtype = view.getUint8(0);
    const si_rbsp_length = view.byteLength - 1;

    return {
        aux_video_codedstreamtype: {
            value: `0x${aux_video_codedstreamtype.toString(16).padStart(2, '0')}`,
            offset: baseOffset,
            length: 1,
        },
        si_rbsp_data: {
            value: `${si_rbsp_length} bytes of Supplemental Information RBSP`,
            offset: baseOffset + 1,
            length: si_rbsp_length,
        },
    };
}
