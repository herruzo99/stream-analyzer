import { BoxParser } from '../utils.js';

/**
 * Parses the 'emsg' (Event Message) box.
 * @param {import('../parser.js').Box} box
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
        p.skip(remainingBytes, 'message_data');
    }

    p.finalize();
}

export const emsgTooltip = {
    emsg: {
        name: 'Event Message Box',
        text: 'Contains an event message for in-band signaling, such as SCTE-35 ad markers.',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3',
    },
    'emsg@version': {
        text: 'Version of this box (0 or 1). Version 1 uses a 64-bit absolute presentation_time.',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
    },
    'emsg@presentation_time': {
        text: '(Version 1) The absolute presentation time of the event on the media timeline, in timescale units.',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
    },
    'emsg@presentation_time_delta': {
        text: '(Version 0) The presentation time delta of the event relative to the earliest presentation time in the segment.',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
    },
    'emsg@timescale': {
        text: 'The timescale for this event, in ticks per second.',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
    },
    'emsg@event_duration': {
        text: 'The duration of the event in timescale units.',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
    },
    'emsg@id': {
        text: 'A unique identifier for this event instance.',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
    },
    'emsg@scheme_id_uri': {
        text: 'A URI identifying the scheme of the event message (e.g., "urn:scte:scte35:2014:xml+bin").',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
    },
    'emsg@value': {
        text: 'A value that distinguishes this event stream from others with the same scheme.',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
    },
    'emsg@message_data': {
        text: 'The payload of the event message, with syntax defined by the scheme.',
        ref: 'ISO/IEC 23009-1, Clause 5.10.3.3.2',
    },
};
