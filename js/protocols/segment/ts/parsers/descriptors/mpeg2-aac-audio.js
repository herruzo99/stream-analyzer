/**
 * Parses an MPEG-2 AAC Audio Descriptor.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.68 & Table 2-92
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed descriptor.
 */
export function parseMpeg2AacAudioDescriptor(view, baseOffset) {
    const profile = view.getUint8(0);
    const channelConfig = view.getUint8(1);
    const additionalInfo = view.getUint8(2);

    const profileMap = {
        0: 'Main Profile',
        1: 'Low Complexity Profile (LC)',
        2: 'Scalable Sample Rate Profile (SSR)',
        3: 'Reserved',
    };

    const channelConfigMap = {
        1: '1 channel (mono)',
        2: '2 channels (stereo)',
        3: '3 channels (front: C, L, R)',
        4: '4 channels (front: C, L, R; back: C)',
        5: '5 channels (front: C, L, R; back: L, R)',
        6: '5.1 channels (front: C, L, R; back: L, R; LFE)',
    };

    const additionalInfoMap = {
        0: 'AAC data according to ISO/IEC 13818-7',
        1: 'AAC data with Bandwidth Extension data present',
    };

    return {
        MPEG_2_AAC_profile: {
            value: `${profileMap[profile] || 'Reserved'} (${profile})`,
            offset: baseOffset,
            length: 1,
        },
        MPEG_2_AAC_channel_configuration: {
            value: `${channelConfigMap[channelConfig] || 'Undefined'} (${channelConfig})`,
            offset: baseOffset + 1,
            length: 1,
        },
        MPEG_2_AAC_additional_information: {
            value: `${additionalInfoMap[additionalInfo] || 'Reserved'} (0x${additionalInfo.toString(16).padStart(2, '0')})`,
            offset: baseOffset + 2,
            length: 1,
        },
    };
}
