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

class AscBitReader {
    constructor(view) {
        this.view = view;
        this.bytePosition = 0;
        this.bitPosition = 0;
    }
    readBits(n) {
        let result = 0;
        for (let i = 0; i < n; i++) {
            if (this.bytePosition >= this.view.byteLength) return null;
            const byte = this.view.getUint8(this.bytePosition);
            const bit = (byte >> (7 - this.bitPosition)) & 1;
            result = (result << 1) | bit;
            this.bitPosition++;
            if (this.bitPosition === 8) {
                this.bitPosition = 0;
                this.bytePosition++;
            }
        }
        return result;
    }
}

/**
 * Parses an MPEG-4 Audio Extension Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.72 & Table 2-95
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpeg4AudioExtensionDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const flagsAndLoops = view.getUint8(offset);
    const ascFlag = (flagsAndLoops >> 7) & 1;
    const numLoops = flagsAndLoops & 0x0f;

    details.ASC_flag = {
        value: ascFlag,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.num_of_loops = {
        value: numLoops,
        offset: baseOffset + offset,
        length: 0.5,
    };
    offset += 1;

    for (let i = 0; i < numLoops; i++) {
        if (offset >= view.byteLength) break;
        const profileAndLevel = view.getUint8(offset);
        details[`audioProfileLevelIndication_${i + 1}`] = {
            value: `0x${profileAndLevel.toString(16).padStart(2, '0')}`,
            offset: baseOffset + offset,
            length: 1,
        };
        offset += 1;
    }

    if (ascFlag) {
        if (offset < view.byteLength) {
            const ascSize = view.getUint8(offset);
            details.ASC_size = {
                value: ascSize,
                offset: baseOffset + offset,
                length: 1,
            };
            offset += 1;

            if (offset + ascSize <= view.byteLength) {
                const ascView = new DataView(
                    view.buffer,
                    view.byteOffset + offset,
                    ascSize
                );
                const ascReader = new AscBitReader(ascView);
                const audioConfigStartOffset = baseOffset + offset;

                const audioObjectType = ascReader.readBits(5);
                if (audioObjectType !== null) {
                    details.decoded_audio_object_type = {
                        value: `${
                            AUDIO_OBJECT_TYPES[audioObjectType] || 'Unknown'
                        } (${audioObjectType})`,
                        offset: audioConfigStartOffset,
                        length: 5 / 8,
                    };
                }

                let samplingFrequencyIndex = ascReader.readBits(4);
                if (samplingFrequencyIndex === 0xf) {
                    // 24-bit escape value
                    const actualFrequency = ascReader.readBits(24);
                    details.decoded_sampling_frequency = {
                        value: `${actualFrequency} Hz (explicit)`,
                        offset: audioConfigStartOffset + 5 / 8,
                        length: (4 + 24) / 8,
                    };
                    details.samplerate = actualFrequency;
                } else if (samplingFrequencyIndex !== null) {
                    const freqString =
                        SAMPLING_FREQUENCIES[samplingFrequencyIndex] ||
                        'Unknown';
                    details.decoded_sampling_frequency = {
                        value: `${freqString} (${samplingFrequencyIndex})`,
                        offset: audioConfigStartOffset + 5 / 8,
                        length: 4 / 8,
                    };
                    details.samplerate = parseInt(freqString, 10);
                }

                const channelConfiguration = ascReader.readBits(4);
                if (channelConfiguration !== null) {
                    details.decoded_channel_configuration = {
                        value: `${
                            CHANNEL_CONFIGURATIONS[channelConfiguration] ||
                            'Unknown'
                        } (${channelConfiguration})`,
                        offset: audioConfigStartOffset + 9 / 8, // After 5 + 4 bits
                        length: 4 / 8,
                    };
                    details.channels = channelConfiguration;
                }
            }
        }
    }

    return details;
}
