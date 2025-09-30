/**
 * Parses an HEVC Hierarchy Extension Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x06, see Table 2-116
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseHevcHierarchyExtensionDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    details.extension_dimension_bits = {
        value: `0x${view.getUint16(offset).toString(16).padStart(4, '0')}`,
        offset: baseOffset + offset,
        length: 2,
    };
    offset += 2;

    const byte2 = view.getUint8(offset);
    details.hierarchy_layer_index = {
        value: byte2 & 0x3f,
        offset: baseOffset + offset,
        length: 0.75,
    };
    offset += 1;

    const byte3 = view.getUint8(offset);
    details.temporal_id = {
        value: (byte3 >> 5) & 0x07,
        offset: baseOffset + offset,
        length: 0.375,
    };
    offset += 1;

    const byte4 = view.getUint8(offset);
    details.nuh_layer_id = {
        value: byte4 & 0x3f,
        offset: baseOffset + offset,
        length: 0.75,
    };
    offset += 1;

    const byte5 = view.getUint8(offset);
    details.tref_present_flag = {
        value: (byte5 >> 7) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    offset += 1;

    const num_embedded_layers = view.getUint8(offset) & 0x3f;
    details.num_embedded_layers = {
        value: num_embedded_layers,
        offset: baseOffset + offset,
        length: 0.75,
    };
    offset += 1;

    details.hierarchy_channel = {
        value: view.getUint8(offset) & 0x3f,
        offset: baseOffset + offset,
        length: 0.75,
    };
    offset += 1;

    details.embedded_layers = [];
    for (let i = 0; i < num_embedded_layers; i++) {
        if (offset >= view.byteLength) break;
        const layerByte = view.getUint8(offset);
        details.embedded_layers.push({
            hierarchy_ext_embedded_layer_index: {
                value: layerByte & 0x3f,
                offset: baseOffset + offset,
                length: 0.75,
            },
        });
        offset += 1;
    }

    return details;
}
