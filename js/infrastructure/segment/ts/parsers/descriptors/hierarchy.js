/**
 * Parses a Hierarchy Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.6 & Table 2-49
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed hierarchy descriptor.
 */
export function parseHierarchyDescriptor(view, baseOffset) {
    const byte1 = view.getUint8(0);
    const hierarchyType = byte1 & 0x0f;
    const byte2 = view.getUint8(1);
    const byte3 = view.getUint8(2);

    const hierarchyTypeMap = {
        1: 'Spatial Scalability',
        2: 'SNR Scalability',
        3: 'Temporal Scalability',
        4: 'Data partitioning',
        5: 'Extension bitstream',
        8: 'Combined Scalability',
        9: 'MVC/MVCD video sub-bitstream',
        15: 'Base layer',
    };

    return {
        no_view_scalability_flag: {
            value: (byte1 >> 7) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        no_temporal_scalability_flag: {
            value: (byte1 >> 6) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        no_spatial_scalability_flag: {
            value: (byte1 >> 5) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        no_quality_scalability_flag: {
            value: (byte1 >> 4) & 1,
            offset: baseOffset,
            length: 0.125,
        },
        hierarchy_type: {
            value: `${hierarchyTypeMap[hierarchyType] || 'Reserved'} (${hierarchyType})`,
            offset: baseOffset,
            length: 0.5,
        },
        hierarchy_layer_index: {
            value: byte2 & 0x3f,
            offset: baseOffset + 1,
            length: 0.75,
        },
        tref_present_flag: {
            value: (byte2 >> 6) & 1,
            offset: baseOffset + 1,
            length: 0.125,
        },
        hierarchy_embedded_layer_index: {
            value: byte3 & 0x3f,
            offset: baseOffset + 2,
            length: 0.75,
        },
        hierarchy_channel: {
            value: view.getUint8(3) & 0x3f,
            offset: baseOffset + 3,
            length: 0.75,
        },
    };
}
