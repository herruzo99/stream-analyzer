/**
 * Parses a 64-bit NTP timestamp into an ISO 8601 string.
 * The NTP epoch is January 1, 1900. The Unix epoch is January 1, 1970.
 * The difference is 2208988800 seconds.
 * @param {DataView} view
 * @param {number} offset
 * @returns {string} Formatted NTP timestamp as an ISO string.
 */
function parseNtpTimestamp(view, offset) {
    const seconds = view.getUint32(offset);
    const fraction = view.getUint32(offset + 4);
    // Convert NTP seconds to Unix milliseconds, and add fractional part in milliseconds
    const date = new Date(
        (seconds - 2208988800) * 1000 + (fraction / 0x100000000) * 1000
    );
    return date.toISOString();
}

/**
 * Parses a Timeline Descriptor as per ISO/IEC 13818-1, Annex U.3.6.
 * @param {DataView} view - A DataView for the descriptor's payload.
 * @param {number} baseOffset - The offset of the descriptor payload within the segment.
 * @returns {object} The parsed timeline descriptor details.
 */
export function parseTimelineDescriptor(view, baseOffset) {
    const details = {};
    let offset = 0;

    const byte1 = view.getUint8(offset);
    const has_timestamp = (byte1 >> 6) & 0x03;
    const has_ntp = (byte1 >> 5) & 1;
    const has_ptp = (byte1 >> 4) & 1;
    const has_timecode = (byte1 >> 2) & 0x03;
    const force_reload = (byte1 >> 1) & 1;
    const paused = byte1 & 1;
    details.has_timestamp = {
        value: has_timestamp,
        offset: baseOffset + offset,
        length: 0.25,
    };
    details.has_ntp = {
        value: has_ntp,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.has_ptp = {
        value: has_ptp,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.has_timecode = {
        value: has_timecode,
        offset: baseOffset + offset,
        length: 0.25,
    };
    details.force_reload = {
        value: force_reload,
        offset: baseOffset + offset,
        length: 0.125,
    };
    details.paused = {
        value: paused,
        offset: baseOffset + offset,
        length: 0.125,
    };
    offset += 1;

    // Based on the standard's table layout, discontinuity and timeline_id follow.
    const byte2 = view.getUint8(offset);
    details.discontinuity = {
        value: (byte2 >> 7) & 1,
        offset: baseOffset + offset,
        length: 0.125,
    };
    offset += 1;

    details.timeline_id = {
        value: view.getUint8(offset),
        offset: baseOffset + offset,
        length: 1,
    };
    offset += 1;

    if (has_timestamp) {
        details.timescale = {
            value: view.getUint32(offset),
            offset: baseOffset + offset,
            length: 4,
        };
        offset += 4;
        if (has_timestamp === 1) {
            details.media_timestamp = {
                value: view.getUint32(offset),
                offset: baseOffset + offset,
                length: 4,
            };
            offset += 4;
        } else if (has_timestamp === 2) {
            details.media_timestamp = {
                value: view.getBigUint64(offset).toString(),
                offset: baseOffset + offset,
                length: 8,
            };
            offset += 8;
        }
    }

    if (has_ntp) {
        details.ntp_timestamp = {
            value: parseNtpTimestamp(view, offset),
            offset: baseOffset + offset,
            length: 8,
        };
        offset += 8;
    }

    if (has_ptp) {
        details.ptp_timestamp = {
            value: 'PTP data present',
            offset: baseOffset + offset,
            length: 10,
        };
        offset += 10;
    }

    if (has_timecode) {
        const remainingBytes = view.byteLength - offset;
        details.timecode_data = {
            value: `Timecode data present (${remainingBytes} bytes)`,
            offset: baseOffset + offset,
            length: remainingBytes,
        };
    }

    return details;
}
