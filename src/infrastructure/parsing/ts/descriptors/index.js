import { parseAudioStreamDescriptor } from './audio-stream.js';
import { parseAuxiliaryVideoStreamDescriptor } from './auxiliary-video-stream.js';
import { parseAvcTimingAndHrdDescriptor } from './avc-timing-hrd.js';
import { parseAvcVideoDescriptor } from './avc-video.js';
import { parseCaDescriptor } from './ca.js';
import { parseContentLabelingDescriptor } from './content-labeling.js';
import { parseCopyrightDescriptor } from './copyright.js';
import { parseDataStreamAlignmentDescriptor } from './data-stream-alignment.js';
import { parseExtensionDescriptor } from './extension.js';
import { parseExternalEsIdDescriptor } from './external-es-id.js';
import { parseFlexMuxTimingDescriptor } from './flexmux-timing.js';
import { parseFmcDescriptor } from './fmc.js';
import { parseFmxBufferSizeDescriptor } from './fmx-buffer-size.js';
import { parseHevcVideoDescriptor } from './hevc-video.js';
import { parseHierarchyDescriptor } from './hierarchy.js';
import { parseIbpDescriptor } from './ibp.js';
import { parseIodDescriptor } from './iod.js';
import { parseIpmpDescriptor } from './ipmp.js';
import { parseIso639LanguageDescriptor } from './iso639-language.js';
import { parseJ2kVideoDescriptor } from './j2k-video.js';
import { parseMaximumBitrateDescriptor } from './maximum-bitrate.js';
import { parseMetadataPointerDescriptor } from './metadata-pointer.js';
import { parseMetadataStdDescriptor } from './metadata-std.js';
import { parseMetadataDescriptor } from './metadata.js';
import { parseMpeg2AacAudioDescriptor } from './mpeg2-aac-audio.js';
import { parseMpeg2StereoscopicVideoFormatDescriptor } from './mpeg2-stereoscopic-video-format.js';
import { parseMpeg4AudioExtensionDescriptor } from './mpeg4-audio-extension.js';
import { parseMpeg4AudioDescriptor } from './mpeg4-audio.js';
import { parseMpeg4TextDescriptor } from './mpeg4-text.js';
import { parseMpeg4VideoDescriptor } from './mpeg4-video.js';
import { parseMultiplexBufferUtilizationDescriptor } from './multiplex-buffer-utilization.js';
import { parseMultiplexBufferDescriptor } from './multiplex-buffer.js';
import { parseMuxcodeDescriptor } from './muxcode.js';
import { parseMvcExtensionDescriptor } from './mvc-extension.js';
import { parseMvcOperationPointDescriptor } from './mvc-operation-point.js';
import { parsePrivateDataIndicatorDescriptor } from './private-data-indicator.js';
import { parseRegistrationDescriptor } from './registration.js';
import { parseSlDescriptor } from './sl.js';
import { parseSmoothingBufferDescriptor } from './smoothing-buffer.js';
import { parseStdDescriptor } from './std.js';
import { parseStereoscopicProgramInfoDescriptor } from './stereoscopic-program-info.js';
import { parseStereoscopicVideoInfoDescriptor } from './stereoscopic-video-info.js';
import { parseSvcExtensionDescriptor } from './svc-extension.js';
import { parseSystemClockDescriptor } from './system-clock.js';
import { parseTargetBackgroundGridDescriptor } from './target-background-grid.js';
import { parseTransportProfileDescriptor } from './transport-profile.js';
import { parseVideoStreamDescriptor } from './video-stream.js';
import { parseVideoWindowDescriptor } from './video-window.js';

/**
 * Parses a loop of descriptors from a DataView.
 * @param {DataView} view - A DataView starting at the beginning of the descriptor loop.
 * @param {number} baseOffset - The offset of the loop within the segment.
 * @param {string | null} streamTypeHexString - The hex string of the parent stream type.
 * @returns {object[]} An array of parsed descriptor objects.
 */
export function parseDescriptors(view, baseOffset, streamTypeHexString = null) {
    const descriptors = [];
    let offset = 0;
    const streamType = streamTypeHexString
        ? parseInt(streamTypeHexString, 16)
        : null;

    while (offset < view.byteLength) {
        if (offset + 2 > view.byteLength) break;
        const descriptor_tag = view.getUint8(offset);
        const descriptor_length = view.getUint8(offset + 1);

        if (offset + 2 + descriptor_length > view.byteLength) break;

        const payloadView = new DataView(
            view.buffer,
            view.byteOffset + offset + 2,
            descriptor_length
        );
        const payloadOffset = baseOffset + offset + 2;

        let details;
        let name = 'Unknown/Private Descriptor';

        switch (descriptor_tag) {
            case 0x02:
                name = 'Video Stream Descriptor';
                details = parseVideoStreamDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x03:
                name = 'Audio Stream Descriptor';
                details = parseAudioStreamDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x04:
                name = 'Hierarchy Descriptor';
                details = parseHierarchyDescriptor(payloadView, payloadOffset);
                break;
            case 0x05:
                name = 'Registration Descriptor';
                details = parseRegistrationDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x06:
                name = 'Data Stream Alignment Descriptor';
                details = parseDataStreamAlignmentDescriptor(
                    payloadView,
                    payloadOffset,
                    streamType
                );
                break;
            case 0x07:
                name = 'Target Background Grid Descriptor';
                details = parseTargetBackgroundGridDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x08:
                name = 'Video Window Descriptor';
                details = parseVideoWindowDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x09:
                name = 'Conditional Access Descriptor';
                details = parseCaDescriptor(payloadView, payloadOffset);
                break;
            case 0x0a:
                name = 'ISO 639 Language Descriptor';
                details = parseIso639LanguageDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x0b:
                name = 'System Clock Descriptor';
                details = parseSystemClockDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x0c:
                name = 'Multiplex Buffer Utilization Descriptor';
                details = parseMultiplexBufferUtilizationDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x0d:
                name = 'Copyright Descriptor';
                details = parseCopyrightDescriptor(payloadView, payloadOffset);
                break;
            case 0x0e:
                name = 'Maximum Bitrate Descriptor';
                details = parseMaximumBitrateDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x0f:
                name = 'Private Data Indicator Descriptor';
                details = parsePrivateDataIndicatorDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x10:
                name = 'Smoothing Buffer Descriptor';
                details = parseSmoothingBufferDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x11:
                name = 'STD Descriptor';
                details = parseStdDescriptor(payloadView, payloadOffset);
                break;
            case 0x12:
                name = 'IBP Descriptor';
                details = parseIbpDescriptor(payloadView, payloadOffset);
                break;
            case 0x1b:
                name = 'MPEG-4 Video Descriptor';
                details = parseMpeg4VideoDescriptor(payloadView, payloadOffset);
                break;
            case 0x1c:
                name = 'MPEG-4 Audio Descriptor';
                details = parseMpeg4AudioDescriptor(payloadView, payloadOffset);
                break;
            case 0x1d:
                name = 'IOD Descriptor';
                details = parseIodDescriptor(payloadView, payloadOffset);
                break;
            case 0x1e:
                name = 'SL Descriptor';
                details = parseSlDescriptor(payloadView, payloadOffset);
                break;
            case 0x1f:
                name = 'FMC Descriptor';
                details = parseFmcDescriptor(payloadView, payloadOffset);
                break;
            case 0x20:
                name = 'External ES_ID Descriptor';
                details = parseExternalEsIdDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x21:
                name = 'MuxCode Descriptor';
                details = parseMuxcodeDescriptor(payloadView, payloadOffset);
                break;
            case 0x22:
                name = 'FmxBufferSize Descriptor';
                details = parseFmxBufferSizeDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x23:
                name = 'MultiplexBuffer Descriptor';
                details = parseMultiplexBufferDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x24:
                name = 'Content Labeling Descriptor';
                details = parseContentLabelingDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x25:
                name = 'Metadata Pointer Descriptor';
                details = parseMetadataPointerDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x26:
                name = 'Metadata Descriptor';
                details = parseMetadataDescriptor(payloadView, payloadOffset);
                break;
            case 0x27:
                name = 'Metadata STD Descriptor';
                details = parseMetadataStdDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x28:
                name = 'AVC Video Descriptor';
                details = parseAvcVideoDescriptor(payloadView, payloadOffset);
                break;
            case 0x29:
                name = 'IPMP Descriptor';
                details = parseIpmpDescriptor(payloadView, payloadOffset);
                break;
            case 0x2a:
                name = 'AVC Timing and HRD Descriptor';
                details = parseAvcTimingAndHrdDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x2b:
                name = 'MPEG-2 AAC Audio Descriptor';
                details = parseMpeg2AacAudioDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x2c:
                name = 'FlexMuxTiming Descriptor';
                details = parseFlexMuxTimingDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x2d:
                name = 'MPEG-4 Text Descriptor';
                details = parseMpeg4TextDescriptor(payloadView, payloadOffset);
                break;
            case 0x2e:
                name = 'MPEG-4 Audio Extension Descriptor';
                details = parseMpeg4AudioExtensionDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x2f:
                name = 'Auxiliary Video Stream Descriptor';
                details = parseAuxiliaryVideoStreamDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x30:
                name = 'SVC Extension Descriptor';
                details = parseSvcExtensionDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x31:
                name = 'MVC Extension Descriptor';
                details = parseMvcExtensionDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x32:
                name = 'J2K Video Descriptor';
                details = parseJ2kVideoDescriptor(payloadView, payloadOffset);
                break;
            case 0x33:
                name = 'MVC Operation Point Descriptor';
                details = parseMvcOperationPointDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x34:
                name = 'MPEG-2 Stereoscopic Video Format Descriptor';
                details = parseMpeg2StereoscopicVideoFormatDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x35:
                name = 'Stereoscopic Program Info Descriptor';
                details = parseStereoscopicProgramInfoDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x36:
                name = 'Stereoscopic Video Info Descriptor';
                details = parseStereoscopicVideoInfoDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x37:
                name = 'Transport Profile Descriptor';
                details = parseTransportProfileDescriptor(
                    payloadView,
                    payloadOffset
                );
                break;
            case 0x38:
                name = 'HEVC Video Descriptor';
                details = parseHevcVideoDescriptor(payloadView, payloadOffset);
                break;
            case 0x63: {
                ({ name, details } = parseExtensionDescriptor(
                    payloadView,
                    payloadOffset
                ));
                break;
            }
            default:
                details = {
                    data: {
                        value: `${descriptor_length} bytes`,
                        offset: payloadOffset,
                        length: descriptor_length,
                    },
                };
                break;
        }

        descriptors.push({
            tag: descriptor_tag,
            length: descriptor_length,
            name,
            details,
        });
        offset += 2 + descriptor_length;
    }
    return descriptors;
}
