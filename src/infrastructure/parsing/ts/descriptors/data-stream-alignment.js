/**
 * Parses a Data Stream Alignment Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.10 & Table 2-52
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @param {number | null} streamType - The stream_type of the parent elementary stream.
 * @returns {object} The parsed alignment descriptor.
 */
export function parseDataStreamAlignmentDescriptor(
    view,
    baseOffset,
    streamType
) {
    const alignmentType = view.getUint8(0);
    let alignmentText = `Unknown/Reserved (${alignmentType})`;

    const videoAlignmentMap = {
        1: 'Slice, or video access unit',
        2: 'Video access unit',
        3: 'GOP, or SEQ',
        4: 'SEQ',
    };
    const avcAlignmentMap = {
        1: 'AVC slice or AVC access unit',
        2: 'AVC access unit',
        3: 'SVC slice or SVC dependency representation',
        4: 'SVC dependency representation',
        5: 'MVC slice or MVC view-component subset',
        6: 'MVC view-component subset',
        7: 'MVCD slice or MVCD view-component subset',
        8: 'MVCD view-component subset',
    };
    const hevcAlignmentMap = {
        1: 'HEVC access unit',
        2: 'HEVC slice',
        3: 'HEVC access unit or slice',
        4: 'HEVC tile of slices',
    };
    const audioAlignmentMap = { 1: 'Sync word' };

    const videoTypes = [0x01, 0x02, 0x10];
    const avcTypes = [0x1b, 0x1f, 0x20, 0x23, 0x26];
    const hevcTypes = [0x24, 0x25];
    const audioTypes = [0x03, 0x04, 0x0f, 0x11, 0x1c];

    if (videoTypes.includes(streamType)) {
        alignmentText = videoAlignmentMap[alignmentType] || alignmentText;
    } else if (avcTypes.includes(streamType)) {
        alignmentText = avcAlignmentMap[alignmentType] || alignmentText;
    } else if (hevcTypes.includes(streamType)) {
        alignmentText = hevcAlignmentMap[alignmentType] || alignmentText;
    } else if (audioTypes.includes(streamType)) {
        alignmentText = audioAlignmentMap[alignmentType] || alignmentText;
    }

    return {
        alignment_type: { value: alignmentText, offset: baseOffset, length: 1 },
    };
}
