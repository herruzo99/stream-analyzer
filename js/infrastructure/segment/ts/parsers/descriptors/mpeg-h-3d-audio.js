/**
 * Parses an MPEG-H 3D Audio Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x08, Table 2-119
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpegH3dAudioDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;
    details.mpegh3daProfileLevelIndication = {
        value: view.getUint8(offset),
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    const byte1 = view.getUint16(offset);
    details.interactivityEnabled = {
        value: (byte1 >> 15) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.referenceChannelLayout = {
        value: byte1 & 0x3f,
        offset: baseOffset + offset,
        length: 0.75,
    };
    return details;
}

/**
 * Parses an MPEG-H 3D Audio Config Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x09, Table 2-120
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpegH3dAudioConfigDescriptor(view, baseOffset) {
    return {
        mpegh3daConfig: {
            value: `${view.byteLength} bytes of config data`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}

/**
 * Parses an MPEG-H 3D Audio Scene Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x0A, Table 2-121
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpegH3dAudioSceneDescriptor(view, baseOffset) {
    return {
        scene_info: {
            value: `${view.byteLength} bytes of scene information`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}

/**
 * Parses an MPEG-H 3D Audio Text Label Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x0B, Table 2-122
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpegH3dAudioTextLabelDescriptor(view, baseOffset) {
    return {
        text_label_info: {
            value: `${view.byteLength} bytes of text label information`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}

/**
 * Parses an MPEG-H 3D Audio Multi-stream Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x0C, Table 2-123
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpegH3dAudioMultiStreamDescriptor(view, baseOffset) {
    return {
        multistream_info: {
            value: `${view.byteLength} bytes of multi-stream information`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}

/**
 * Parses an MPEG-H 3D Audio DRC and Loudness Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x0D, Table 2-124
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpegH3dAudioDrcLoudnessDescriptor(view, baseOffset) {
    return {
        drc_loudness_info: {
            value: `${view.byteLength} bytes of DRC/Loudness information`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}

/**
 * Parses an MPEG-H 3D Audio Command Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1, Extension Descriptor Tag 0x0E, Table 2-125
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpegH3dAudioCommandDescriptor(view, baseOffset) {
    return {
        command_data: {
            value: `${view.byteLength} bytes of command data`,
            offset: baseOffset,
            length: view.byteLength,
        },
    };
}
