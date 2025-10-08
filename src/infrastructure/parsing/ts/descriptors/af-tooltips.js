export const afDescriptorTooltipData = {
    Timeline_descriptor: {
        text: 'Carries timing information to synchronize external data with the media timeline.',
        ref: 'ISO/IEC 13818-1, Annex U.3.6',
    },
    'Timeline_descriptor@has_timestamp': {
        text: 'Indicates if a media timestamp is present and its size (0: no, 1: 32-bit, 2: 64-bit).',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@has_ntp': {
        text: 'If set to 1, indicates an NTP timestamp is present.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@has_ptp': {
        text: 'If set to 1, indicates a PTP timestamp is present.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@has_timecode': {
        text: 'Indicates if a frame timecode is present and its type.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@force_reload': {
        text: 'If set to 1, indicates that prior add-on descriptions may be obsolete and should be reloaded.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@paused': {
        text: 'If set to 1, indicates that the timeline identified by timeline_id is currently paused.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@discontinuity': {
        text: 'If set to 1, indicates that a discontinuity has occurred in the timeline.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@timeline_id': {
        text: 'Identifies the active timeline to which this timing information applies.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@timescale': {
        text: 'The number of time units that pass in one second for the media_timestamp.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@media_timestamp': {
        text: 'The media time in `timescale` units corresponding to the associated PTS value.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@ntp_timestamp': {
        text: 'A 64-bit NTP timestamp corresponding to the associated PTS value.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@ptp_timestamp': {
        text: 'An 80-bit PTP timestamp.',
        ref: 'Table U.8',
    },
    'Timeline_descriptor@timecode_data': {
        text: 'Timecode data structures.',
        ref: 'Table U.8',
    },
};
