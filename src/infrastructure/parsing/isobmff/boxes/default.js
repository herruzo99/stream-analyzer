export const groupTooltipData = {
    moov: {
        name: 'Movie',
        text: 'Container for all metadata defining the presentation.',
        ref: 'ISO/IEC 14496-12, 8.2.1',
    },

    trak: {
        name: 'Track',
        text: 'Container for a single track.',
        ref: 'ISO/IEC 14496-12, 8.3.1',
    },

    meta: {
        name: 'Metadata',
        text: 'A container for metadata.',
        ref: 'ISO/IEC 14496-12, 8.11.1',
    },
    mdia: {
        name: 'Media',
        text: 'Container for media data information.',
        ref: 'ISO/IEC 14496-12, 8.4.1',
    },
    minf: {
        name: 'Media Information',
        text: 'Container for characteristic information of the media.',
        ref: 'ISO/IEC 14496-12, 8.4.4',
    },

    dinf: {
        name: 'Data Information',
        text: 'Container for objects that declare where media data is located.',
        ref: 'ISO/IEC 14496-12, 8.7.1',
    },
    stbl: {
        name: 'Sample Table',
        text: 'Contains all time and data indexing for samples.',
        ref: 'ISO/IEC 14496-12, 8.5.1',
    },

    edts: {
        name: 'Edit Box',
        text: 'A container for an edit list.',
        ref: 'ISO/IEC 14496-12, 8.6.5',
    },

    mvex: {
        name: 'Movie Extends',
        text: 'Signals that the movie may contain fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.1',
    },

    moof: {
        name: 'Movie Fragment',
        text: 'Container for all metadata for a single fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.4',
    },

    traf: {
        name: 'Track Fragment',
        text: "Container for metadata for a single track's fragment.",
        ref: 'ISO/IEC 14496-12, 8.8.6',
    },

    pssh: {
        name: 'Protection System Specific Header',
        text: 'Contains DRM initialization data.',
        ref: 'ISO/IEC 23001-7',
    },
    mdat: {
        name: 'Media Data',
        text: 'Contains the actual audio/video sample data.',
        ref: 'ISO/IEC 14496-12, 8.1.1',
    },
};
