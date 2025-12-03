import { XMLParser } from 'fast-xml-parser';
import { parseScte35 } from '../../scte35/parser.js';
import { BoxParser } from '../utils.js';

/**
 * Maps the parsed XML SCTE-35 object to the internal SCTE-35 model used by the UI.
 * This normalizes the XML attributes to match the binary parser output fields.
 * @param {object} xmlObj The raw object from fast-xml-parser
 * @returns {object} The normalized SCTE-35 object
 */
function mapXmlToScte35Model(xmlObj) {
    const root = xmlObj.SpliceInfoSection;
    if (!root)
        return { error: 'Invalid SCTE-35 XML: Missing SpliceInfoSection' };

    const attrs = root[':@'] || {};

    // Base Section
    const section = {
        table_id: 0xfc, // Implied
        protocol_version: parseInt(attrs.protocolVersion || '0', 10),
        pts_adjustment: parseInt(attrs.ptsAdjustment || '0', 10),
        tier: parseInt(attrs.tier || '4095', 10), // hex FFF default
        splice_command_type: 'Unknown',
        splice_command: {},
        descriptors: [],
        crc_valid: true, // XML doesn't use CRC usually, assume valid
        crc_32: 0, // Placeholder for XML-based events which lack a transport CRC
    };

    // Commands
    if (root.SpliceInsert) {
        section.splice_command_type = 'Splice Insert';
        const cmdAttrs = root.SpliceInsert[':@'] || {};

        const durationFlag = !!root.SpliceInsert.BreakDuration;

        section.splice_command = {
            type: 'Splice Insert',
            splice_event_id: parseInt(cmdAttrs.spliceEventId || '0', 10),
            splice_event_cancel_indicator:
                cmdAttrs.spliceEventCancelIndicator === 'true' ? 1 : 0,
            out_of_network_indicator:
                cmdAttrs.outOfNetworkIndicator === 'true' ? 1 : 0,
            splice_immediate_flag:
                cmdAttrs.spliceImmediateFlag === 'true' ? 1 : 0,
            unique_program_id: parseInt(cmdAttrs.uniqueProgramId || '0', 10),
            avail_num: parseInt(cmdAttrs.availNum || '0', 10),
            avails_expected: parseInt(cmdAttrs.availsExpected || '0', 10),
            program_splice_flag: 1, // Simplification for XML mapping
            duration_flag: durationFlag ? 1 : 0,
        };

        if (durationFlag) {
            const bdAttrs = root.SpliceInsert.BreakDuration[':@'] || {};
            section.splice_command.break_duration = {
                auto_return: bdAttrs.autoReturn === 'true',
                duration: parseInt(bdAttrs.duration || '0', 10),
            };
        }

        // Time (SpliceTime) handling
        // In XML often represented as <SpliceTime ptsTime="..."/>
        if (root.SpliceInsert.SpliceTime) {
            const timeAttrs = root.SpliceInsert.SpliceTime[':@'] || {};
            if (timeAttrs.ptsTime) {
                section.splice_command.splice_time = {
                    time_specified: true,
                    pts_time: parseInt(timeAttrs.ptsTime, 10),
                };
            }
        }
    } else if (root.TimeSignal) {
        section.splice_command_type = 'Time Signal';
        section.splice_command = {
            type: 'Time Signal',
            splice_time: {},
        };
        if (root.TimeSignal.SpliceTime) {
            const timeAttrs = root.TimeSignal.SpliceTime[':@'] || {};
            if (timeAttrs.ptsTime) {
                section.splice_command.splice_time = {
                    time_specified: true,
                    pts_time: parseInt(timeAttrs.ptsTime, 10),
                };
            }
        }
    }

    // Descriptors
    // XML structure: <SegmentationDescriptor segmentationEventId="...">
    if (root.SegmentationDescriptor) {
        // Handle both single object and array
        const descriptors = Array.isArray(root.SegmentationDescriptor)
            ? root.SegmentationDescriptor
            : [root.SegmentationDescriptor];

        section.descriptors = descriptors.map((d) => {
            const dAttrs = d[':@'] || {};
            return {
                segmentation_event_id: parseInt(
                    dAttrs.segmentationEventId || '0',
                    10
                ),
                segmentation_event_cancel_indicator:
                    dAttrs.segmentationEventCancelIndicator === 'true' ? 1 : 0,
                segmentation_duration: dAttrs.segmentationDuration
                    ? parseInt(dAttrs.segmentationDuration, 10)
                    : undefined,
                segmentation_upid_type: parseInt(
                    dAttrs.segmentationUpidType || '0',
                    10
                ),
                segmentation_upid: dAttrs.segmentationUpid
                    ? String(dAttrs.segmentationUpid)
                    : undefined,
                segmentation_type_id: parseInt(
                    dAttrs.segmentationTypeId || '0',
                    10
                ),
                segment_num: parseInt(dAttrs.segmentNum || '0', 10),
                segments_expected: parseInt(dAttrs.segmentsExpected || '0', 10),
            };
        });
    }

    return section;
}

/**
 * Parses the 'emsg' (Event Message) box.
 * @param {import('@/types.js').Box} box
 * @param {DataView} view
 */
export function parseEmsg(box, view) {
    const p = new BoxParser(box, view);
    const { version } = p.readVersionAndFlags();

    if (version === null) {
        p.finalize();
        return;
    }

    if (version === 1) {
        p.readUint32('timescale');
        p.readBigUint64('presentation_time');
        p.readUint32('event_duration');
        p.readUint32('id');
        p.readNullTerminatedString('scheme_id_uri');
        p.readNullTerminatedString('value');
    } else {
        // version 0: strings come FIRST (ISO/IEC 23009-1)
        p.readNullTerminatedString('scheme_id_uri');
        p.readNullTerminatedString('value');
        p.readUint32('timescale');
        p.readUint32('presentation_time_delta');
        p.readUint32('event_duration');
        p.readUint32('id');
    }

    const remainingBytes = box.size - p.offset;
    if (remainingBytes > 0) {
        const messageData = new Uint8Array(
            p.view.buffer,
            p.view.byteOffset + p.offset,
            remainingBytes
        );

        box.details['message_data'] = {
            value: `${remainingBytes} bytes`,
            offset: box.offset + p.offset,
            length: remainingBytes,
        };

        const scheme = box.details.scheme_id_uri?.value || '';

        // --- Robust Payload Parsing ---
        const isBinaryScte =
            scheme.includes('scte35') && !scheme.includes('xml');
        const isXmlScte = scheme.includes('scte35') && scheme.includes('xml');

        const decodedString = new TextDecoder('utf-8', {
            ignoreBOM: true,
        }).decode(messageData);
        const firstAngleBracket = decodedString.indexOf('<');
        // Heuristic: If it declares XML or looks like XML
        const looksLikeXml = firstAngleBracket !== -1 && firstAngleBracket < 10;

        if (isBinaryScte) {
            box.messagePayloadType = 'scte35';
            box.messagePayload = parseScte35(messageData);
        } else if (isXmlScte || (looksLikeXml && scheme.includes('scte35'))) {
            // XML SCTE-35 Parsing
            try {
                const xmlContent =
                    firstAngleBracket > 0
                        ? decodedString.slice(firstAngleBracket)
                        : decodedString;
                const parser = new XMLParser({
                    ignoreAttributes: false,
                    attributeNamePrefix: '',
                    attributesGroupName: ':@',
                });
                const parsedXml = parser.parse(xmlContent);

                // Map to unified SCTE-35 model for UI
                box.messagePayloadType = 'scte35';
                box.messagePayload = mapXmlToScte35Model(parsedXml);
                // Store raw XML for fallback viewing
                box.messagePayload.rawXml = xmlContent;
            } catch (e) {
                console.warn('Failed to parse SCTE-35 XML:', e);
                box.messagePayloadType = 'xml';
                box.messagePayload = decodedString;
            }
        } else if (looksLikeXml) {
            box.messagePayloadType = 'xml';
            box.messagePayload =
                firstAngleBracket > 0
                    ? decodedString.slice(firstAngleBracket)
                    : decodedString;
        } else if (scheme.includes('id3')) {
            box.messagePayloadType = 'id3';
            box.messagePayload = messageData;
        } else {
            box.messagePayloadType = 'binary';
            box.messagePayload = messageData;
        }

        p.offset += remainingBytes;
    }

    p.finalize();
}

export const emsgTooltip = {
    emsg: {
        name: 'Event Message Box',
        text: 'Event Message Box (`emsg`). Carries timed metadata ("events") multiplexed within the media stream. It is a primary mechanism for in-band signaling, such as SCTE-35 ad markers or ID3 tags.',
        ref: 'ISO/IEC 23009-1 (DASH), Clause 5.10.3.3',
    },
    'emsg@version': {
        text: 'Version of this box (0 or 1). Version 1 supports 64-bit timestamps and an absolute `presentation_time`, while version 0 uses a 32-bit delta relative to the segment start.',
        ref: 'ISO/IEC 23009-1, 5.10.3.3.2',
    },
    'emsg@presentation_time': {
        text: '(Version 1) The absolute presentation time of the event on the media timeline, in the specified `timescale` units. This allows for precise, segment-independent timing.',
        ref: 'ISO/IEC 23009-1, 5.10.3.3.2',
    },
    'emsg@presentation_time_delta': {
        text: '(Version 0) The presentation time of the event as a delta from the earliest presentation time in the containing segment.',
        ref: 'ISO/IEC 23009-1, 5.10.3.3.2',
    },
    'emsg@timescale': {
        text: 'The number of time units that pass in one second for the time and duration fields within this box. This allows the event to have a different timescale from the media.',
        ref: 'ISO/IEC 23009-1, 5.10.3.3.2',
    },
    'emsg@event_duration': {
        text: 'The duration of the event in `timescale` units. A value of 0 indicates a point event.',
        ref: 'ISO/IEC 23009-1, 5.10.3.3.2',
    },
    'emsg@id': {
        text: 'A unique identifier for this event instance within its scheme. It allows for correlation and cancellation of events.',
        ref: 'ISO/IEC 23009-1, 5.10.3.3.2',
    },
    'emsg@scheme_id_uri': {
        text: 'A URI that identifies the scheme of the event message (e.g., "urn:scte:scte35:2014:xml+bin" for SCTE-35). This tells the client how to interpret the `message_data`.',
        ref: 'ISO/IEC 23009-1, 5.10.3.3.2',
    },
    'emsg@value': {
        text: 'A value that distinguishes this event stream from other event streams with the same `scheme_id_uri`.',
        ref: 'ISO/IEC 23009-1, 5.10.3.3.2',
    },
    'emsg@message_data': {
        text: 'The payload of the event message. The syntax and semantics of this data are defined by the scheme identified in `scheme_id_uri`. For SCTE-35, this would contain the binary splice_info_section.',
        ref: 'ISO/IEC 23009-1, 5.10.3.3.2',
    },
};
