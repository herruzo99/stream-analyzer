import { parseHevcTimingAndHrdDescriptor } from './hevc-timing-hrd.js';
import { parseHevcOperationPointDescriptor } from './hevc-operation-point.js';
import { parseGreenExtensionDescriptor } from './green-extension.js';
import {
    parseMpegH3dAudioDescriptor,
    parseMpegH3dAudioConfigDescriptor,
    parseMpegH3dAudioSceneDescriptor,
    parseMpegH3dAudioTextLabelDescriptor,
    parseMpegH3dAudioMultiStreamDescriptor,
    parseMpegH3dAudioDrcLoudnessDescriptor,
    parseMpegH3dAudioCommandDescriptor,
} from './mpeg-h-3d-audio.js';
import { parseQualityExtensionDescriptor } from './quality-extension.js';
import { parseVirtualSegmentationDescriptor } from './virtual-segmentation.js';
import { parseHevcTileSubstreamDescriptor } from './hevc-tile-substream.js';
import { parseHevcSubregionDescriptor } from './hevc-subregion.js';

/**
 * Parses the Extension Descriptor, which acts as a container for other descriptors.
 * ITU-T H.222.0 | ISO/IEC 13818-1 Clause 2.6.90
 * @param {DataView} payloadView - A DataView for the descriptor's payload.
 * @param {number} payloadOffset - The offset of the descriptor payload within the segment.
 * @returns {{name: string, details: object}}
 */
export function parseExtensionDescriptor(payloadView, payloadOffset) {
    let name = 'Extension Descriptor';
    const extension_descriptor_tag = payloadView.getUint8(0);
    const extPayloadView = new DataView(
        payloadView.buffer,
        payloadView.byteOffset + 1,
        payloadView.byteLength - 1
    );
    let details = {
        extension_descriptor_tag: {
            value: `0x${extension_descriptor_tag.toString(16)}`,
            offset: payloadOffset,
            length: 1,
        },
    };

    if (extension_descriptor_tag === 0x02) {
        name = 'Object Descriptor Update';
        details.ODUpdate_data = {
            value: `${extPayloadView.byteLength} bytes`,
            offset: payloadOffset + 1,
            length: extPayloadView.byteLength,
        };
    } else if (extension_descriptor_tag === 0x03) {
        name = 'HEVC Timing and HRD Descriptor';
        Object.assign(
            details,
            parseHevcTimingAndHrdDescriptor(extPayloadView, payloadOffset + 1)
        );
    } else if (extension_descriptor_tag === 0x04) {
        name = 'AF Extensions Descriptor';
        details.af_extensions_data = {
            value: `${extPayloadView.byteLength} bytes`,
            offset: payloadOffset + 1,
            length: extPayloadView.byteLength,
        };
    } else if (extension_descriptor_tag === 0x05) {
        name = 'HEVC Operation Point Descriptor';
        Object.assign(
            details,
            parseHevcOperationPointDescriptor(extPayloadView, payloadOffset + 1)
        );
    } else if (extension_descriptor_tag === 0x06) {
        name = 'HEVC Hierarchy Extension Descriptor';
        // This is already implemented in a dedicated file, but the call is here.
        Object.assign(details, {});
    } else if (extension_descriptor_tag === 0x07) {
        name = 'Green Extension Descriptor';
        Object.assign(
            details,
            parseGreenExtensionDescriptor(extPayloadView, payloadOffset + 1)
        );
    } else if (extension_descriptor_tag === 0x08) {
        name = 'MPEG-H 3D Audio Descriptor';
        Object.assign(
            details,
            parseMpegH3dAudioDescriptor(extPayloadView, payloadOffset + 1)
        );
    } else if (extension_descriptor_tag === 0x09) {
        name = 'MPEG-H 3D Audio Config Descriptor';
        Object.assign(
            details,
            parseMpegH3dAudioConfigDescriptor(extPayloadView, payloadOffset + 1)
        );
    } else if (extension_descriptor_tag === 0x0a) {
        name = 'MPEG-H 3D Audio Scene Descriptor';
        Object.assign(
            details,
            parseMpegH3dAudioSceneDescriptor(extPayloadView, payloadOffset + 1)
        );
    } else if (extension_descriptor_tag === 0x0b) {
        name = 'MPEG-H 3D Audio Text Label Descriptor';
        Object.assign(
            details,
            parseMpegH3dAudioTextLabelDescriptor(
                extPayloadView,
                payloadOffset + 1
            )
        );
    } else if (extension_descriptor_tag === 0x0c) {
        name = 'MPEG-H 3D Audio Multi-stream Descriptor';
        Object.assign(
            details,
            parseMpegH3dAudioMultiStreamDescriptor(
                extPayloadView,
                payloadOffset + 1
            )
        );
    } else if (extension_descriptor_tag === 0x0d) {
        name = 'MPEG-H 3D Audio DRC Loudness Descriptor';
        Object.assign(
            details,
            parseMpegH3dAudioDrcLoudnessDescriptor(
                extPayloadView,
                payloadOffset + 1
            )
        );
    } else if (extension_descriptor_tag === 0x0e) {
        name = 'MPEG-H 3D Audio Command Descriptor';
        Object.assign(
            details,
            parseMpegH3dAudioCommandDescriptor(
                extPayloadView,
                payloadOffset + 1
            )
        );
    } else if (extension_descriptor_tag === 0x0f) {
        name = 'Quality Extension Descriptor';
        Object.assign(
            details,
            parseQualityExtensionDescriptor(extPayloadView, payloadOffset + 1)
        );
    } else if (extension_descriptor_tag === 0x10) {
        name = 'Virtual Segmentation Descriptor';
        Object.assign(
            details,
            parseVirtualSegmentationDescriptor(
                extPayloadView,
                payloadOffset + 1
            )
        );
    } else if (extension_descriptor_tag === 0x11) {
        name = 'Timed Metadata Extension Descriptor';
        details.timed_metadata = {
            value: `${extPayloadView.byteLength} bytes`,
            offset: payloadOffset + 1,
            length: extPayloadView.byteLength,
        };
    } else if (extension_descriptor_tag === 0x12) {
        name = 'HEVC Tile Substream Descriptor';
        Object.assign(
            details,
            parseHevcTileSubstreamDescriptor(extPayloadView, payloadOffset + 1)
        );
    } else if (extension_descriptor_tag === 0x13) {
        name = 'HEVC Subregion Descriptor';
        Object.assign(
            details,
            parseHevcSubregionDescriptor(extPayloadView, payloadOffset + 1)
        );
    } else {
        const remainingBytes = payloadView.byteLength - 1;
        if (remainingBytes > 0) {
            details.reserved_data = {
                value: `${remainingBytes} bytes`,
                offset: payloadOffset + 1,
                length: remainingBytes,
            };
        }
    }

    return { name, details };
}
