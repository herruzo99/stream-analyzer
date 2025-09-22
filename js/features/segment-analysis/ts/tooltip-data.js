// Central repository for UI tooltip information related to the
// MPEG-2 Transport Stream specification. Each key corresponds to a
// field name, and the value contains its description and the
// relevant clause from the ITU-T H.222.0 standard.

export const tooltipData = {
    pid: {
        text: 'Packet Identifier. A 13-bit value used to uniquely identify elementary streams or tables within the transport stream.',
        ref: 'Table 2-3',
    },
    continuity_counter: {
        text: 'A 4-bit counter that increments with each TS packet of the same PID. Used to detect packet loss.',
        ref: 'Clause 2.4.3.3',
    },
    adaptation_field_control: {
        text: 'Indicates if this packet contains an adaptation field, a payload, or both.',
        ref: 'Table 2-5',
    },
    random_access_indicator: {
        text: 'A 1-bit flag in the Adaptation Field indicating that the current or next PES packet contains a key frame or other information to aid random access.',
        ref: 'Clause 2.4.3.5',
    },
};