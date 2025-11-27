import { parseScte35 } from '../../scte35/parser.js';
import { BoxParser } from '../utils.js';

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
    } else {
        // version 0
        p.readUint32('timescale');
        p.readUint32('presentation_time_delta');
    }

    p.readUint32('event_duration');
    p.readUint32('id');
    p.readNullTerminatedString('scheme_id_uri');
    p.readNullTerminatedString('value');

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

        // --- ARCHITECTURAL REFACTOR: Robust Payload Parsing ---
        const isBinaryScte =
            scheme.includes('scte35') && !scheme.includes('xml');
        const decodedString = new TextDecoder('utf-8', {
            ignoreBOM: true,
        }).decode(messageData);
        const firstAngleBracket = decodedString.indexOf('<');
        const looksLikeXml = firstAngleBracket !== -1 && firstAngleBracket < 10; // Allow a few garbage chars

        if (scheme.includes('xml') || looksLikeXml) {
            box.messagePayloadType = 'xml';
            // Slice from the first '<' to remove any leading garbage/BOM characters
            box.messagePayload =
                firstAngleBracket > 0
                    ? decodedString.slice(firstAngleBracket)
                    : decodedString;
        } else if (isBinaryScte) {
            box.messagePayloadType = 'scte35';
            box.messagePayload = parseScte35(messageData);
        } else if (scheme.includes('id3')) {
            box.messagePayloadType = 'id3';
            box.messagePayload = messageData;
        } else {
            box.messagePayloadType = 'binary';
            box.messagePayload = messageData;
        }
        // --- END REFACTOR ---

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
