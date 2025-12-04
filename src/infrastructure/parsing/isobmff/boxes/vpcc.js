import { BoxParser } from '../utils.js';

/**
 * Parses the 'vpcC' (VP Codec Configuration) box.
 * Reference: VP Codec ISO Media File Format Binding
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseVpcC(box, view) {
    const p = new BoxParser(box, view);

    p.readVersionAndFlags(); // Version is usually 1 for VP9

    p.readUint8('profile');
    p.readUint8('level');

    const byte3 = p.readUint8('bitDepth_chroma_raw');
    if (byte3 !== null) {
        box.details['bitDepth_chroma_raw'].internal = true;
        box.details['bitDepth'] = {
            value: (byte3 >> 4) & 0x0f,
            offset: box.details['bitDepth_chroma_raw'].offset,
            length: 0.5,
        };
        box.details['chromaSubsampling'] = {
            value: (byte3 >> 1) & 0x07,
            offset: box.details['bitDepth_chroma_raw'].offset,
            length: 0.375,
        };
        box.details['videoFullRangeFlag'] = {
            value: byte3 & 1,
            offset: box.details['bitDepth_chroma_raw'].offset,
            length: 0.125,
        };
    }

    p.readUint8('colourPrimaries');
    p.readUint8('transferCharacteristics');
    p.readUint8('matrixCoefficients');

    // Optional: Codec Initialization Data size
    if (p.offset < box.size) {
        p.readUint16('codecIntializationDataSize');
        // Remaining bytes are config data
        p.readRemainingBytes('codecInitializationData');
    }

    p.finalize();
}

export const vpcCTooltip = {
    vpcC: {
        name: 'VP Codec Configuration Box',
        text: 'VP Codec Configuration Box (`vpcC`). Contains configuration parameters for VP8/VP9 video streams, including profile, level, bit depth, and color information.',
        ref: 'VP Codec ISO Media File Format Binding, Section 4.2',
    },
    'vpcC@profile': {
        text: 'Specifies the VP9 profile (0, 1, 2, 3). Profile 0 is 8-bit 4:2:0, Profile 2 is 10/12-bit 4:2:0.',
        ref: 'VP9 Bitstream Specification',
    },
    'vpcC@level': {
        text: 'Specifies the VP9 level, which defines constraints on resolution, frame rate, and bitrate.',
        ref: 'VP9 Bitstream Specification',
    },
    'vpcC@bitDepth': {
        text: 'The bit depth of the luma and chroma samples (8, 10, or 12).',
        ref: 'VP Codec ISO Binding',
    },
    'vpcC@chromaSubsampling': {
        text: 'Chroma subsampling format. 0=4:2:0 (vertical), 1=4:2:0 (colocated), 2=4:2:2, 3=4:4:4.',
        ref: 'VP Codec ISO Binding',
    },
    'vpcC@videoFullRangeFlag': {
        text: 'Indicates if the video uses the full range of pixel values (0-255 for 8-bit) or limited range.',
        ref: 'VP Codec ISO Binding',
    },
};
