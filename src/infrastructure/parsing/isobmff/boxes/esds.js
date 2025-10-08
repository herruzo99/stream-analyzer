import { BoxParser } from '../utils.js';

const AUDIO_OBJECT_TYPES = {
    1: 'AAC Main',
    2: 'AAC LC',
    3: 'AAC SSR',
    4: 'AAC LTP',
    5: 'SBR',
    6: 'AAC Scalable',
};
const SAMPLING_FREQUENCIES = {
    0: '96000 Hz',
    1: '88200 Hz',
    2: '64000 Hz',
    3: '48000 Hz',
    4: '44100 Hz',
    5: '32000 Hz',
    6: '24000 Hz',
    7: '22050 Hz',
    8: '16000 Hz',
    9: '12000 Hz',
    10: '11025 Hz',
    11: '8000 Hz',
    12: '7350 Hz',
};
const CHANNEL_CONFIGURATIONS = [
    'Custom',
    'Mono (Center)',
    'Stereo (L, R)',
    '3 (L, C, R)',
    '4 (L, C, R, Sur)',
    '5 (L, C, R, Ls, Rs)',
    '5.1 (L, C, R, Ls, Rs, LFE)',
    '7.1 (L, C, R, Ls, Rs, Lcs, Rcs, LFE)',
];

function parseDescriptorSize(p, fieldName) {
    const startOffset = p.offset;
    let size = 0;
    let byte;
    let bytesRead = 0;
    do {
        byte = p.readUint8(`size_byte_${bytesRead}`);
        if (byte === null) return null;
        size = (size << 7) | (byte & 0x7f);
        bytesRead++;
    } while (byte & 0x80 && bytesRead < 4);

    p.box.details[fieldName] = {
        value: size,
        offset: p.box.offset + startOffset,
        length: bytesRead,
    };
    for (let i = 0; i < bytesRead; i++) {
        delete p.box.details[`size_byte_${i}`];
    }
    return size;
}

export function parseEsds(box, view) {
    const p = new BoxParser(box, view);
    p.readVersionAndFlags();

    // --- ES_Descriptor ---
    const esDescrTag = p.readUint8('ES_Descriptor_tag');
    if (esDescrTag !== 0x03) {
        p.addIssue(
            'warn',
            `Expected ES_Descriptor tag (0x03), but found ${esDescrTag}.`
        );
        p.finalize();
        return;
    }
    const esDescrSize = parseDescriptorSize(p, 'ES_Descriptor_size');
    if (esDescrSize === null) {
        p.finalize();
        return;
    }
    const esDescrEndOffset = p.offset + esDescrSize;

    p.readUint16('ES_ID');
    p.readUint8('streamDependence_and_priority');

    // --- DecoderConfigDescriptor ---
    if (p.offset < esDescrEndOffset) {
        const decConfDescrTag = p.readUint8('DecoderConfigDescriptor_tag');
        if (decConfDescrTag === 0x04) {
            const decConfDescrSize = parseDescriptorSize(
                p,
                'DecoderConfigDescriptor_size'
            );
            const decConfEndOffset = p.offset + decConfDescrSize;

            p.readUint8('objectTypeIndication');
            p.readUint8('streamType_and_upStream');
            p.skip(3, 'bufferSizeDB');
            p.readUint32('maxBitrate');
            p.readUint32('avgBitrate');

            if (p.offset < decConfEndOffset) {
                const decSpecificInfoTag = p.readUint8(
                    'DecoderSpecificInfo_tag'
                );
                if (decSpecificInfoTag === 0x05) {
                    const decSpecificInfoSize = parseDescriptorSize(
                        p,
                        'DecoderSpecificInfo_size'
                    );
                    if (
                        decSpecificInfoSize !== null &&
                        decSpecificInfoSize >= 2
                    ) {
                        const audioConfigStartOffset = p.offset;
                        const bits = (
                            p.readUint16('AudioSpecificConfig_bits') >>> 0
                        )
                            .toString(2)
                            .padStart(16, '0');
                        delete box.details['AudioSpecificConfig_bits'];

                        const audioObjectType = parseInt(
                            bits.substring(0, 5),
                            2
                        );
                        const samplingFrequencyIndex = parseInt(
                            bits.substring(5, 9),
                            2
                        );
                        const channelConfiguration = parseInt(
                            bits.substring(9, 13),
                            2
                        );

                        box.details['decoded_audio_object_type'] = {
                            value: `${
                                AUDIO_OBJECT_TYPES[audioObjectType] || 'Unknown'
                            } (${audioObjectType})`,
                            offset: p.box.offset + audioConfigStartOffset,
                            length: 0.625, // 5 bits
                        };
                        box.details['decoded_sampling_frequency'] = {
                            value: `${
                                SAMPLING_FREQUENCIES[samplingFrequencyIndex] ||
                                'Unknown'
                            } (${samplingFrequencyIndex})`,
                            offset:
                                p.box.offset + audioConfigStartOffset + 0.625,
                            length: 0.5, // 4 bits
                        };
                        box.details['decoded_channel_configuration'] = {
                            value: `${
                                CHANNEL_CONFIGURATIONS[channelConfiguration] ||
                                'Unknown'
                            } (${channelConfiguration})`,
                            offset:
                                p.box.offset + audioConfigStartOffset + 1.125,
                            length: 0.5, // 4 bits
                        };

                        p.skip(
                            decSpecificInfoSize - 2,
                            'decoder_specific_info_remains'
                        );
                    } else if (decSpecificInfoSize > 0) {
                        p.skip(
                            decSpecificInfoSize,
                            'decoder_specific_info_data'
                        );
                    }
                }
            }
        }
    }

    // --- SLConfigDescriptor ---
    if (p.offset < esDescrEndOffset) {
        const slConfigDescrTag = p.readUint8('SLConfigDescriptor_tag');
        if (slConfigDescrTag === 0x06) {
            const slConfigDescrSize = parseDescriptorSize(
                p,
                'SLConfigDescriptor_size'
            );
            if (slConfigDescrSize !== null) {
                // For a typical size of 1, the only field is predefined.
                if (slConfigDescrSize === 1) {
                    p.readUint8('predefined');
                } else {
                    p.skip(slConfigDescrSize, 'sl_config_data');
                }
            }
        }
    }

    p.finalize();
}

export const esdsTooltip = {
    esds: {
        name: 'Elementary Stream Descriptor',
        text: 'Contains information about the elementary stream, such as the audio object type for AAC.',
        ref: 'ISO/IEC 14496-1, 7.2.6.5',
    },
    'esds@objectTypeIndication': {
        text: 'Specifies the audio coding profile (e.g., 64 = AAC LC, 5 = SBR). The value 0x40 corresponds to 64.',
        ref: 'ISO/IEC 14496-1, Table 5',
    },
    'esds@decoded_audio_object_type': {
        text: 'The specific type of audio coding, decoded from the DecoderSpecificInfo. This is the definitive audio profile.',
        ref: 'ISO/IEC 14496-3, 1.5.1.1',
    },
    'esds@decoded_sampling_frequency': {
        text: 'The audio sampling frequency, decoded from the DecoderSpecificInfo.',
        ref: 'ISO/IEC 14496-3, 1.5.1.1',
    },
    'esds@decoded_channel_configuration': {
        text: 'The speaker channel layout, decoded from the DecoderSpecificInfo.',
        ref: 'ISO/IEC 14496-3, 1.5.1.1',
    },
    SLConfigDescriptor_tag: {
        name: 'Sync Layer Config Descriptor Tag',
        text: 'Tag identifying the Sync Layer (SL) Configuration Descriptor, which contains configuration for the synchronization layer.',
        ref: 'ISO/IEC 14496-1, 7.2.6.8',
    },
    'SLConfigDescriptor_tag@predefined': {
        name: 'Predefined',
        text: 'A predefined value for the SL packet header configuration. A value of 2 indicates that SL packets have a 1-byte header.',
        ref: 'ISO/IEC 14496-1, 7.2.6.8',
    },
};
