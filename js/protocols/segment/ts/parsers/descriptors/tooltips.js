import { adaptationFieldTooltipData } from '../../parsers/adaptation-field.js';
import { catTooltipData } from '../../parsers/cat.js';
import { dsmccTooltipData } from '../../parsers/dsm-cc.js';
import { ipmpTooltipData } from '../../parsers/ipmp.js';
import { patTooltipData } from '../../parsers/pat.js';
import { pmtTooltipData } from '../../parsers/pmt.js';
import { pesTooltipData } from '../../parsers/pes.js';
import { privateSectionTooltipData } from '../../parsers/private-section.js';
import { tsdtTooltipData } from '../../parsers/tsdt.js';
import { afDescriptorTooltipData } from './af-tooltips.js';

const metadataTooltipData = {
    content_labeling_descriptor: {
        text: 'Assigns a label to content, which can be used by metadata to reference the associated content.',
        ref: 'Clause 2.6.56',
    },
    metadata_pointer_descriptor: {
        text: 'Points to a single metadata service and associates it with audiovisual content.',
        ref: 'Clause 2.6.58',
    },
    metadata_descriptor: {
        text: 'Specifies parameters of a metadata service carried in the stream, such as its format and decoder configuration.',
        ref: 'Clause 2.6.60',
    },
    metadata_STD_descriptor: {
        text: 'Defines parameters of the System Target Decoder (STD) model for processing the associated metadata stream.',
        ref: 'Clause 2.6.62',
    },
};

const hevcTooltipData = {
    HEVC_video_descriptor: {
        text: 'Provides basic information for identifying coding parameters of an HEVC (H.265) video stream.',
        ref: 'Clause 2.6.95',
    },
    'HEVC_video_descriptor@profile_idc': {
        text: 'Indicates the profile to which the HEVC stream conforms.',
        ref: 'Clause 2.6.96',
    },
    'HEVC_video_descriptor@level_idc': {
        text: 'Indicates the level to which the HEVC stream conforms.',
        ref: 'Clause 2.6.96',
    },
    'HEVC_video_descriptor@tier_flag': {
        text: 'Indicates the tier (Main or High) of the HEVC stream.',
        ref: 'Clause 2.6.96',
    },
    'HEVC_video_descriptor@temporal_layer_subset_flag': {
        text: 'If set to 1, indicates that syntax elements describing a subset of temporal layers are included.',
        ref: 'Clause 2.6.96',
    },
    HEVC_timing_and_HRD_descriptor: {
        text: 'Provides timing and Hypothetical Reference Decoder (HRD) parameters for an HEVC stream. This is an Extension Descriptor.',
        ref: 'Clause 2.6.97',
    },
    'HEVC_timing_and_HRD_descriptor@hrd_management_valid_flag': {
        text: 'If set to 1, indicates that HRD management is active and Buffering Period/Picture Timing SEIs shall be present.',
        ref: 'Clause 2.6.98',
    },
    HEVC_hierarchy_extension_descriptor: {
        text: 'Provides information to identify components of layered HEVC streams (e.g., SHVC, MV-HEVC). This is an Extension Descriptor.',
        ref: 'Clause 2.6.102',
    },
    'HEVC_hierarchy_extension_descriptor@extension_dimension_bits': {
        text: 'A 16-bit field indicating the enhancement dimensions present (e.g., multi-view, spatial scalability).',
        ref: 'Clause 2.6.103, Table 2-117',
    },
    'HEVC_hierarchy_extension_descriptor@hierarchy_layer_index': {
        text: 'A unique index for this program element in the coding layer hierarchy.',
        ref: 'Clause 2.6.103',
    },
    'HEVC_hierarchy_extension_descriptor@nuh_layer_id': {
        text: 'Specifies the highest nuh_layer_id of the NAL units in the elementary stream associated with this descriptor.',
        ref: 'Clause 2.6.103',
    },
    HEVC_operation_point_descriptor: {
        text: 'Provides a method to indicate profile and level for one or more HEVC operation points (for layered video).',
        ref: 'Clause 2.6.100',
    },
    Green_extension_descriptor: {
        text: 'Contains static metadata related to energy-efficient media consumption (Green Metadata).',
        ref: 'Clause 2.6.104 / ISO/IEC 23001-11',
    },
    MPEG_H_3dAudio_descriptor: {
        text: 'Provides basic coding information for an MPEG-H 3D Audio stream.',
        ref: 'Clause 2.6.106 / ISO/IEC 23008-3',
    },
    Quality_extension_descriptor: {
        text: 'Describes quality metrics that are present in each Quality Access Unit for dynamic quality metadata.',
        ref: 'Clause 2.6.119 / ISO/IEC 23001-10',
    },
    Virtual_segmentation_descriptor: {
        text: 'Indicates that an elementary stream is virtually segmented, often used for ad insertion or cloud DVR.',
        ref: 'Clause 2.6.120',
    },
    HEVC_tile_substream_descriptor: {
        text: 'Assigns an ID to an HEVC tile substream, used for panoramic/Region-of-Interest streaming.',
        ref: 'Clause 2.6.122',
    },
    HEVC_subregion_descriptor: {
        text: 'Signals patterns of SubstreamIDs that belong to a subregion for HEVC tiled streaming.',
        ref: 'Clause 2.6.125',
    },
};

const descriptorTooltipData = {
    ...metadataTooltipData,
    ...afDescriptorTooltipData,
    ...hevcTooltipData,
    CA_descriptor: {
        text: 'Conditional Access Descriptor. Provides information about the CA system used for scrambling.',
        ref: 'Clause 2.6.16',
    },
    'CA_descriptor@ca_system_ID': {
        text: 'A 16-bit identifier for the Conditional Access system.',
        ref: 'Clause 2.6.17',
    },
    'CA_descriptor@ca_PID': {
        text: 'The PID of the transport stream packets that carry the EMM or ECM data for this CA system.',
        ref: 'Clause 2.6.17',
    },
    video_stream_descriptor: {
        text: 'Provides basic coding parameters of a video elementary stream.',
        ref: 'Clause 2.6.2',
    },
    audio_stream_descriptor: {
        text: 'Provides basic information which identifies the coding version of an audio elementary stream.',
        ref: 'Clause 2.6.4',
    },
    AVC_video_descriptor: {
        text: 'Provides basic information for identifying coding parameters of an AVC (H.264) video stream.',
        ref: 'Clause 2.6.64',
    },
    AVC_timing_and_HRD_descriptor: {
        text: 'Provides timing and Hypothetical Reference Decoder (HRD) parameters of the associated AVC video stream.',
        ref: 'Clause 2.6.66',
    },
    'AVC_timing_and_HRD_descriptor@hrd_management_valid_flag': {
        text: 'If set to 1, indicates that HRD management is active and Buffering Period/Picture Timing SEIs shall be present.',
        ref: 'Clause 2.6.67',
    },
    'AVC_timing_and_HRD_descriptor@picture_and_timing_info_present': {
        text: 'If set to 1, indicates that detailed timing information (90kHz flag, N, K, etc.) is present in the descriptor.',
        ref: 'Clause 2.6.67',
    },
    'AVC_timing_and_HRD_descriptor@90kHz_flag': {
        text: 'If set to 1, indicates the AVC time base is 90 kHz. If 0, N and K are used to define the time base.',
        ref: 'Clause 2.6.67',
    },
    'AVC_timing_and_HRD_descriptor@fixed_frame_rate_flag': {
        text: 'If set to 1, indicates that the coded frame rate is constant within the AVC stream.',
        ref: 'Clause 2.6.67',
    },
    MPEG2_AAC_audio_descriptor: {
        text: 'Provides basic information for identifying the coding parameters of an MPEG-2 AAC audio elementary stream.',
        ref: 'Clause 2.6.68',
    },
    'MPEG2_AAC_audio_descriptor@MPEG_2_AAC_profile': {
        text: 'Indicates the AAC profile (e.g., Main, LC, SSR) according to ISO/IEC 13818-7.',
        ref: 'Clause 2.6.69',
    },
    'MPEG2_AAC_audio_descriptor@MPEG_2_AAC_channel_configuration': {
        text: 'Indicates the number and configuration of audio channels (e.g., mono, stereo, 5.1).',
        ref: 'Clause 2.6.69',
    },
    'MPEG2_AAC_audio_descriptor@MPEG_2_AAC_additional_information': {
        text: 'Indicates whether features like Bandwidth Extension (SBR) are present.',
        ref: 'Clause 2.6.69',
    },
    hierarchy_descriptor: {
        text: 'Identifies program elements of hierarchically-coded video, audio, and private streams.',
        ref: 'Clause 2.6.6',
    },
    registration_descriptor: {
        text: 'Provides a method to uniquely and unambiguously identify formats of private data.',
        ref: 'Clause 2.6.8',
    },
    'registration_descriptor@format_identifier': {
        text: 'A 32-bit value obtained from a Registration Authority that identifies the private format. Often represented as a four-character code (e.g., "CUEI" for SCTE-35).',
        ref: 'Clause 2.6.9',
    },
    ISO_639_language_descriptor: {
        text: 'Specifies the language of an audio or text program element.',
        ref: 'Clause 2.6.18',
    },
    'ISO_639_language_descriptor@language': {
        text: 'A 3-character language code as specified by ISO 639-2.',
        ref: 'Clause 2.6.19',
    },
    'ISO_639_language_descriptor@audio_type': {
        text: 'Specifies the type of audio service (e.g., clean effects, hearing impaired).',
        ref: 'Clause 2.6.19, Table 2-61',
    },
    data_stream_alignment_descriptor: {
        text: 'Describes the type of alignment present in the elementary stream when the data_alignment_indicator in the PES header is set.',
        ref: 'Clause 2.6.10',
    },
    'data_stream_alignment_descriptor@alignment_type': {
        text: 'Indicates the syntax element on which the stream is aligned (e.g., Access Unit, GOP, Slice). The meaning is context-dependent based on the stream type.',
        ref: 'Clause 2.6.11, Tables 2-53 to 2-56',
    },
    'MPEG-4_video_descriptor': {
        text: 'Provides basic information for identifying the coding parameters of an MPEG-4 Visual elementary stream.',
        ref: 'Clause 2.6.36',
    },
    'MPEG-4_video_descriptor@MPEG4_visual_profile_and_level': {
        text: 'An 8-bit field identifying the profile and level of the MPEG-4 Visual stream.',
        ref: 'Clause 2.6.37',
    },
    'MPEG-4_audio_descriptor': {
        text: 'Provides basic information for identifying the coding parameters of an MPEG-4 audio stream.',
        ref: 'Clause 2.6.38',
    },
    'MPEG-4_audio_descriptor@MPEG4_audio_profile_and_level': {
        text: 'An 8-bit field identifying the profile and level of the MPEG-4 audio stream.',
        ref: 'Clause 2.6.39, Table 2-72',
    },
    'MPEG-4_text_descriptor': {
        text: 'Carries the TextConfig() structure for an ISO/IEC 14496-17 text stream.',
        ref: 'Clause 2.6.70',
    },
    'AVC_video_descriptor@profile_idc': {
        text: 'Indicates the profile to which the AVC stream conforms (e.g., 66=Baseline, 77=Main, 100=High).',
        ref: 'Table 2-92 / H.264 Spec',
    },
    'AVC_video_descriptor@level_idc': {
        text: 'Indicates the level to which the AVC stream conforms.',
        ref: 'Table 2-92 / H.264 Spec',
    },
    'AVC_video_descriptor@constraint_set0_flag': {
        text: 'A constraint flag for Baseline Profile.',
        ref: 'Table 2-92 / H.264 Spec',
    },
    'AVC_video_descriptor@constraint_set1_flag': {
        text: 'A constraint flag for Main Profile.',
        ref: 'Table 2-92 / H.264 Spec',
    },
    'AVC_video_descriptor@constraint_set2_flag': {
        text: 'A constraint flag for Extended Profile.',
        ref: 'Table 2-92 / H.264 Spec',
    },
    'AVC_video_descriptor@AVC_still_present': {
        text: 'If set to 1, indicates that the stream may include AVC still pictures.',
        ref: 'Table 2-92',
    },
    'AVC_video_descriptor@AVC_24_hour_picture_flag': {
        text: 'If set to 1, indicates the stream may contain pictures with a presentation time more than 24 hours in the future.',
        ref: 'Table 2-92',
    },
    'hierarchy_descriptor@hierarchy_type': {
        text: 'Defines the hierarchical relation between this layer and its embedded layer (e.g., Spatial, SNR, Temporal, MVC).',
        ref: 'Clause 2.6.7, Table 2-50',
    },
    'hierarchy_descriptor@hierarchy_layer_index': {
        text: 'A unique index for this program element in the coding layer hierarchy.',
        ref: 'Clause 2.6.7',
    },
    'hierarchy_descriptor@hierarchy_embedded_layer_index': {
        text: 'The index of the program element that this layer depends on for decoding.',
        ref: 'Clause 2.6.7',
    },
    IBP_descriptor: {
        text: 'Provides information on the GOP structure of an MPEG-2 video stream.',
        ref: 'Clause 2.6.34',
    },
    'IBP_descriptor@closed_gop_flag': {
        text: 'If set to 1, indicates that all GOPs are closed (i.e., can be decoded without reference to a previous GOP).',
        ref: 'Clause 2.6.35',
    },
    'IBP_descriptor@identical_gop_flag': {
        text: 'If set to 1, indicates that the GOP structure (sequence of I, P, B frames) is the same throughout the sequence.',
        ref: 'Clause 2.6.35',
    },
    'IBP_descriptor@max_gop_length': {
        text: 'Indicates the maximum number of pictures between any two consecutive I-pictures.',
        ref: 'Clause 2.6.35',
    },
    maximum_bitrate_descriptor: {
        text: 'Specifies the maximum bitrate of the program element or program.',
        ref: 'Clause 2.6.26',
    },
    'maximum_bitrate_descriptor@maximum_bitrate': {
        text: 'An upper bound of the bitrate in units of 50 bytes/second, including transport overhead.',
        ref: 'Clause 2.6.27',
    },
    private_data_indicator_descriptor: {
        text: 'Indicates the presence of a specific private data format.',
        ref: 'Clause 2.6.28',
    },
    'private_data_indicator_descriptor@private_data_indicator': {
        text: 'A 32-bit value whose meaning is privately defined, but should correspond to a registered format identifier.',
        ref: 'Clause 2.6.29',
    },
    system_clock_descriptor: {
        text: 'Conveys information about the system clock that was used to generate timestamps.',
        ref: 'Clause 2.6.20',
    },
    'system_clock_descriptor@external_clock_reference_indicator': {
        text: 'If set to 1, indicates the system clock was derived from an external frequency reference.',
        ref: 'Clause 2.6.21',
    },
    'system_clock_descriptor@clock_accuracy_integer': {
        text: 'The integer part of the clock accuracy value.',
        ref: 'Clause 2.6.21',
    },
    'system_clock_descriptor@clock_accuracy_exponent': {
        text: 'The exponent part of the clock accuracy value, used to calculate accuracy in parts-per-million.',
        ref: 'Clause 2.6.21',
    },
    Extension_descriptor: {
        text: 'Provides a mechanism to extend the descriptor range using an extended tag.',
        ref: 'Clause 2.6.90',
    },
    'Extension_descriptor@extension_descriptor_tag': {
        text: 'An 8-bit tag that identifies the nested descriptor.',
        ref: 'Clause 2.6.91, Table 2-108',
    },
    'Extension_descriptor@nested_descriptor_name': {
        text: 'The name of the descriptor identified by the extension tag.',
        ref: 'Clause 2.6.91',
    },
    copyright_descriptor: {
        text: 'Provides a method to enable audiovisual works identification.',
        ref: 'Clause 2.6.24',
    },
    'copyright_descriptor@copyright_identifier': {
        text: 'A 32-bit value obtained from a Registration Authority that identifies the work type (e.g., ISAN, ISBN).',
        ref: 'Clause 2.6.25',
    },
    smoothing_buffer_descriptor: {
        text: 'Conveys the size of a smoothing buffer and the associated leak rate for the program element.',
        ref: 'Clause 2.6.30',
    },
    'smoothing_buffer_descriptor@sb_leak_rate': {
        text: 'The value of the leak rate out of the smoothing buffer in units of 400 bits/s.',
        ref: 'Clause 2.6.31',
    },
    'smoothing_buffer_descriptor@sb_size': {
        text: 'The size of the smoothing buffer in units of 1 byte.',
        ref: 'Clause 2.6.31',
    },
    multiplex_buffer_utilization_descriptor: {
        text: 'Provides bounds on the occupancy of the STD multiplex buffer, intended for use by re-multiplexers.',
        ref: 'Clause 2.6.22',
    },
    'multiplex_buffer_utilization_descriptor@bound_valid_flag': {
        text: 'A flag indicating if the lower and upper bound fields are valid.',
        ref: 'Clause 2.6.23',
    },
    'multiplex_buffer_utilization_descriptor@LTW_offset_lower_bound': {
        text: 'The lowest value that any Legal Time Window (LTW) offset field would have in the stream.',
        ref: 'Clause 2.6.23',
    },
    'multiplex_buffer_utilization_descriptor@LTW_offset_upper_bound': {
        text: 'The largest value that any Legal Time Window (LTW) offset field would have in the stream.',
        ref: 'Clause 2.6.23',
    },
    STD_descriptor: {
        text: 'Applies only to the T-STD model for MPEG-2 video streams.',
        ref: 'Clause 2.6.32',
    },
    'STD_descriptor@leak_valid_flag': {
        text: 'If 1, the T-STD uses the leak method for buffer transfer. If 0, it uses the vbv_delay method.',
        ref: 'Clause 2.6.33',
    },
    target_background_grid_descriptor: {
        text: 'Describes a grid of unit pixels projected on to the display area for video windowing.',
        ref: 'Clause 2.6.12',
    },
    'target_background_grid_descriptor@horizontal_size': {
        text: 'The horizontal size of the target background grid in pixels.',
        ref: 'Clause 2.6.13',
    },
    'target_background_grid_descriptor@vertical_size': {
        text: 'The vertical size of the target background grid in pixels.',
        ref: 'Clause 2.6.13',
    },
    'target_background_grid_descriptor@aspect_ratio_information': {
        text: 'Specifies the sample or display aspect ratio of the target background grid.',
        ref: 'Clause 2.6.13',
    },
    video_window_descriptor: {
        text: 'Describes the window characteristics of the associated video elementary stream, relative to the target background grid.',
        ref: 'Clause 2.6.14',
    },
    'video_window_descriptor@horizontal_offset': {
        text: 'The horizontal position of the top left pixel of the video window on the target grid.',
        ref: 'Clause 2.6.15',
    },
    'video_window_descriptor@vertical_offset': {
        text: 'The vertical position of the top left pixel of the video window on the target grid.',
        ref: 'Clause 2.6.15',
    },
    'video_window_descriptor@window_priority': {
        text: 'Indicates the front-to-back ordering of overlapping windows (0=lowest, 15=highest).',
        ref: 'Clause 2.6.15',
    },
    IOD_descriptor: {
        text: 'Encapsulates the InitialObjectDescriptor, which is the entry point to an ISO/IEC 14496 (MPEG-4) scene.',
        ref: 'Clause 2.6.40',
    },
    SL_descriptor: {
        text: 'Associates an ISO/IEC 14496-1 ES_ID with an elementary stream carried in PES packets.',
        ref: 'Clause 2.6.42',
    },
    'SL_descriptor@ES_ID': {
        text: 'The 16-bit identifier of the ISO/IEC 14496-1 SL-packetized stream.',
        ref: 'Clause 2.6.43',
    },
    FMC_descriptor: {
        text: 'Associates FlexMux channels to the ES_ID values of the SL-packetized streams within a FlexMux stream.',
        ref: 'Clause 2.6.44',
    },
    'FMC_descriptor@ES_ID': {
        text: 'The ES_ID of an SL-packetized stream within the FlexMux.',
        ref: 'Clause 2.6.45',
    },
    'FMC_descriptor@FlexMuxChannel': {
        text: 'The FlexMux channel number used for this SL-packetized stream.',
        ref: 'Clause 2.6.45',
    },
    SVC_extension_descriptor: {
        text: 'Provides detailed information about an SVC (Scalable Video Coding) video sub-bitstream.',
        ref: 'Clause 2.6.76',
    },
    MVC_extension_descriptor: {
        text: 'Provides detailed information about an MVC (Multi-view Coding) video sub-bitstream.',
        ref: 'Clause 2.6.78',
    },
    FlexMuxTiming_descriptor: {
        text: 'Conveys timing information for an ISO/IEC 14496-1 FlexMux stream.',
        ref: 'Clause 2.6.54',
    },
    multiplexBuffer_descriptor: {
        text: 'Conveys the size of the multiplex buffer (MBn) and the leak rate (Rxn) from the transport buffer (TBn) for an ISO/IEC 14496 stream.',
        ref: 'Clause 2.6.52',
    },
    MPEG2_stereoscopic_video_format_descriptor: {
        text: 'Indicates the type of stereoscopic video format included in the user_data of an MPEG-2 video elementary stream.',
        ref: 'Clause 2.6.84',
    },
    Stereoscopic_program_info_descriptor: {
        text: 'Specifies the type of stereoscopic service, such as monoscopic, frame-compatible, or service-compatible.',
        ref: 'Clause 2.6.86',
    },
    Stereoscopic_video_info_descriptor: {
        text: 'Provides information for service-compatible stereoscopic 3D services that carry left and right views in separate video streams.',
        ref: 'Clause 2.6.88',
    },
    Transport_profile_descriptor: {
        text: 'Signals a profile value of the transport stream for the associated program, indicating specific constraints (e.g., for adaptive streaming).',
        ref: 'Clause 2.6.93',
    },
    J2K_video_descriptor: {
        text: 'Provides information for identifying and decoding a JPEG 2000 video elementary stream.',
        ref: 'Clause 2.6.80',
    },
    'J2K_video_descriptor@profile_and_level': {
        text: 'Specifies the profile and level of the JPEG 2000 video stream, corresponding to the Rsiz value in the codestream.',
        ref: 'Clause 2.6.81',
    },
    'J2K_video_descriptor@extended_capability_flag': {
        text: 'Indicates if the stream uses extended color specification and may have capabilities like stripes or blocks.',
        ref: 'Clause 2.6.81',
    },
    'SEMANTIC-PTS-FREQ': {
        text: 'Validates that the time interval between consecutive Presentation Time Stamps (PTS) for any single elementary stream does not exceed 0.7 seconds.',
        ref: 'Clause 2.7.4',
    },
    'SEMANTIC-PTS-DISCONT': {
        text: 'Validates that a Presentation Time Stamp (PTS) is present for the first access unit following a discontinuity.',
        ref: 'Clause 2.7.5',
    },
    'SEMANTIC-TB-OVERFLOW': {
        text: 'Validates that the Transport Buffer (TBn) in the T-STD model does not overflow for any elementary stream.',
        ref: 'Clause 2.4.2.7',
    },
    'SEMANTIC-PCR-FREQ': {
        text: 'Validates that the time interval between consecutive Program Clock References (PCRs) for a program does not exceed 0.1 seconds.',
        ref: 'Clause 2.7.2',
    },
    'SEMANTIC-CC-ERROR': {
        text: 'Checks for unexpected jumps in the continuity_counter for a PID, which indicates potential packet loss.',
        ref: 'Clause 2.4.3.3',
    },
    MPEG4_audio_extension_descriptor: {
        text: 'Carries additional audio profile/level indications and optionally the AudioSpecificConfig for an MPEG-4 audio stream.',
        ref: 'Clause 2.6.72',
    },
    'MPEG4_audio_extension_descriptor@ASC_flag': {
        text: 'If set to 1, indicates that the AudioSpecificConfig (ASC) data is present in this descriptor.',
        ref: 'Clause 2.6.73',
    },
    'MPEG4_audio_extension_descriptor@num_of_loops': {
        text: 'The number of audioProfileLevelIndication fields that follow.',
        ref: 'Clause 2.6.73',
    },
    'MPEG4_audio_extension_descriptor@audioProfileLevelIndication': {
        text: 'Indicates an audio profile and level to which the stream conforms.',
        ref: 'Clause 2.6.73 / ISO/IEC 14496-3',
    },
    'MPEG4_audio_extension_descriptor@ASC_size': {
        text: 'The size in bytes of the following AudioSpecificConfig data.',
        ref: 'Clause 2.6.73',
    },
    'MPEG4_audio_extension_descriptor@audioSpecificConfig': {
        text: 'The AudioSpecificConfig data, which provides detailed decoder configuration for MPEG-4 audio.',
        ref: 'Clause 2.6.73 / ISO/IEC 14496-3',
    },
    Auxiliary_video_stream_descriptor: {
        text: 'Specifies parameters for the decoding and interpretation of an auxiliary video stream (e.g., depth maps for 3D video).',
        ref: 'Clause 2.6.74',
    },
    'Auxiliary_video_stream_descriptor@aux_video_codedstreamtype': {
        text: 'Indicates the compression coding type of the auxiliary video stream (e.g., 0x1B for H.264/AVC).',
        ref: 'Clause 2.6.75',
    },
    'Auxiliary_video_stream_descriptor@si_rbsp_data': {
        text: 'The Supplemental Information Raw Byte Sequence Payload, containing detailed parameters for the auxiliary video as defined in ISO/IEC 23002-3.',
        ref: 'Clause 2.6.75',
    },
    external_ES_ID_descriptor: {
        text: 'Assigns an ES_ID to a program element, allowing non-MPEG-4 components to be referenced in an MPEG-4 scene.',
        ref: 'Clause 2.6.46',
    },
    MuxCode_descriptor: {
        text: 'Conveys MuxCodeTableEntry structures to configure the MuxCode mode of FlexMux.',
        ref: 'Clause 2.6.48',
    },
    FmxBufferSize_descriptor: {
        text: 'Conveys the size of the FlexMux buffer (FB) for each SL packetized stream multiplexed in a FlexMux stream.',
        ref: 'Clause 2.6.50',
    },
    IPMP_descriptor: {
        text: 'Provides information for Intellectual Property Management and Protection (IPMP) systems.',
        ref: 'Clause 2.6, Tag 0x29 / ISO/IEC 13818-11',
    },
    MVC_operation_point_descriptor: {
        text: 'Indicates profile and level for one or more operation points of an MVC (Multi-view Coding) bitstream.',
        ref: 'Clause 2.6.82',
    },
};

export const tooltipData = {
    ...adaptationFieldTooltipData,
    ...catTooltipData,
    ...descriptorTooltipData,
    ...dsmccTooltipData,
    ...ipmpTooltipData,
    ...patTooltipData,
    ...pmtTooltipData,
    ...pesTooltipData,
    ...privateSectionTooltipData,
    ...tsdtTooltipData,
};
