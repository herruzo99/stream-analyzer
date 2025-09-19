export const tooltipData = {
    ftyp: {
        name: 'File Type',
        text: "Declares the file's brand and compatibility.",
        ref: 'ISO/IEC 14496-12, 4.3',
    },
    'ftyp@Major Brand': {
        text: "The 'best use' specification for the file.",
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'ftyp@Minor Version': {
        text: 'An informative integer for the minor version of the major brand.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'ftyp@Compatible Brands': {
        text: 'A list of other specifications to which the file complies.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    styp: {
        name: 'Segment Type',
        text: "Declares the segment's brand and compatibility.",
        ref: 'ISO/IEC 14496-12, 8.16.2',
    },
    'styp@Major Brand': {
        text: "The 'best use' specification for the segment.",
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'styp@Minor Version': {
        text: 'An informative integer for the minor version of the major brand.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    'styp@Compatible Brands': {
        text: 'A list of other specifications to which the segment complies.',
        ref: 'ISO/IEC 14496-12, 4.3.3',
    },
    sidx: {
        name: 'Segment Index',
        text: 'Provides a compact index of media stream chunks within a segment.',
        ref: 'ISO/IEC 14496-12, 8.16.3',
    },
    'sidx@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and offset fields.',
        ref: 'ISO/IEC 14496-12, 8.16.3.2',
    },
    'sidx@reference_ID': {
        text: 'The stream ID for the reference stream (typically the track ID).',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@timescale': {
        text: 'The timescale for time and duration fields in this box, in ticks per second.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@earliest_presentation_time': {
        text: 'The earliest presentation time of any access unit in the first subsegment.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@first_offset': {
        text: 'The byte offset from the end of this box to the first byte of the indexed material.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_count': {
        text: 'The number of subsegment references that follow.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@reference_type_1': {
        text: 'The type of the first reference (0 = media, 1 = sidx box).',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@referenced_size_1': {
        text: 'The size in bytes of the referenced item.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    'sidx@subsegment_duration_1': {
        text: 'The duration of the referenced subsegment in the timescale.',
        ref: 'ISO/IEC 14496-12, 8.16.3.3',
    },
    moov: {
        name: 'Movie',
        text: 'Container for all metadata defining the presentation.',
        ref: 'ISO/IEC 14496-12, 8.2.1',
    },
    mvhd: {
        name: 'Movie Header',
        text: 'Contains global information for the presentation (timescale, duration).',
        ref: 'ISO/IEC 14496-12, 8.2.2',
    },
    'mvhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@creation_time': {
        text: 'The creation time of the presentation (in seconds since midnight, Jan. 1, 1904, UTC).',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@modification_time': {
        text: 'The most recent time the presentation was modified.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@timescale': {
        text: 'The number of time units that pass in one second for the presentation.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    'mvhd@duration': {
        text: 'The duration of the presentation in units of the timescale.',
        ref: 'ISO/IEC 14496-12, 8.2.2.3',
    },
    trak: {
        name: 'Track',
        text: 'Container for a single track.',
        ref: 'ISO/IEC 14496-12, 8.3.1',
    },
    tkhd: {
        name: 'Track Header',
        text: 'Specifies characteristics of a single track.',
        ref: 'ISO/IEC 14496-12, 8.3.2',
    },
    'tkhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@flags': {
        text: 'A bitmask of track properties (enabled, in movie, in preview).',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@track_ID': {
        text: 'A unique integer that identifies this track.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@duration': {
        text: "The duration of this track in the movie's timescale.",
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@width': {
        text: 'The visual presentation width of the track as a fixed-point 16.16 number.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
    },
    'tkhd@height': {
        text: 'The visual presentation height of the track as a fixed-point 16.16 number.',
        ref: 'ISO/IEC 14496-12, 8.3.2.3',
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
    mdhd: {
        name: 'Media Header',
        text: 'Declares media information (timescale, language).',
        ref: 'ISO/IEC 14496-12, 8.4.2',
    },
    'mdhd@version': {
        text: 'Version of this box (0 or 1). Affects the size of time and duration fields.',
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@timescale': {
        text: "The number of time units that pass in one second for this track's media.",
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@duration': {
        text: "The duration of this track's media in units of its own timescale.",
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    'mdhd@language': {
        text: 'The ISO-639-2/T language code for this media.',
        ref: 'ISO/IEC 14496-12, 8.4.2.3',
    },
    hdlr: {
        name: 'Handler Reference',
        text: "Declares the media type of the track (e.g., 'vide', 'soun').",
        ref: 'ISO/IEC 14496-12, 8.4.3',
    },
    'hdlr@handler_type': {
        text: "A four-character code identifying the media type (e.g., 'vide', 'soun', 'hint').",
        ref: 'ISO/IEC 14496-12, 8.4.3.3',
    },
    'hdlr@name': {
        text: 'A human-readable name for the track type (for debugging).',
        ref: 'ISO/IEC 14496-12, 8.4.3.3',
    },
    minf: {
        name: 'Media Information',
        text: 'Container for characteristic information of the media.',
        ref: 'ISO/IEC 14496-12, 8.4.4',
    },
    vmhd: {
        name: 'Video Media Header',
        text: 'Contains header information specific to video media.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2',
    },
    'vmhd@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2.2',
    },
    'vmhd@flags': {
        text: 'A bitmask of flags, should have the low bit set to 1.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2',
    },
    'vmhd@graphicsmode': {
        text: 'Specifies a composition mode for this video track.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2.2',
    },
    'vmhd@opcolor': {
        text: 'A set of RGB color values available for use by graphics modes.',
        ref: 'ISO/IEC 14496-12, 8.4.5.2.2',
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
    stsd: {
        name: 'Sample Description',
        text: 'Stores information for decoding samples (codec type).',
        ref: 'ISO/IEC 14496-12, 8.5.2',
    },
    'stsd@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.5.2.3',
    },
    'stsd@entry_count': {
        text: 'The number of sample entries that follow.',
        ref: 'ISO/IEC 14496-12, 8.5.2.3',
    },
    stts: {
        name: 'Decoding Time to Sample',
        text: 'Maps decoding times to sample numbers.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2',
    },
    'stts@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@entry_count': {
        text: 'The number of entries in the time-to-sample table.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@sample_count_1': {
        text: 'The number of consecutive samples with the same delta for the first table entry.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    'stts@sample_delta_1': {
        text: 'The delta (duration) for each sample in this run for the first table entry.',
        ref: 'ISO/IEC 14496-12, 8.6.1.2.3',
    },
    stsc: {
        name: 'Sample To Chunk',
        text: 'Maps samples to chunks.',
        ref: 'ISO/IEC 14496-12, 8.7.4',
    },
    'stsc@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@entry_count': {
        text: 'The number of entries in the sample-to-chunk table.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@first_chunk_1': {
        text: 'The index of the first chunk in a run of chunks with the same properties.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@samples_per_chunk_1': {
        text: 'The number of samples in each of these chunks.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    'stsc@sample_description_index_1': {
        text: 'The index of the sample description for the samples in this run.',
        ref: 'ISO/IEC 14496-12, 8.7.4.3',
    },
    stsz: {
        name: 'Sample Size',
        text: 'Specifies the size of each sample.',
        ref: 'ISO/IEC 14496-12, 8.7.3',
    },
    'stsz@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
    'stsz@sample_size': {
        text: 'Default sample size. If 0, sizes are in the entry table.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
    'stsz@sample_count': {
        text: 'The total number of samples in the track.',
        ref: 'ISO/IEC 14496-12, 8.7.3.2.2',
    },
    stco: {
        name: 'Chunk Offset',
        text: 'Specifies the offset of each chunk into the file.',
        ref: 'ISO/IEC 14496-12, 8.7.5',
    },
    'stco@version': {
        text: 'Version of this box, always 0.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
    'stco@entry_count': {
        text: 'The number of entries in the chunk offset table.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
    'stco@chunk_offset_1': {
        text: 'The file offset of the first chunk.',
        ref: 'ISO/IEC 14496-12, 8.7.5.3',
    },
    edts: {
        name: 'Edit Box',
        text: 'A container for an edit list.',
        ref: 'ISO/IEC 14496-12, 8.6.5',
    },
    elst: {
        name: 'Edit List',
        text: 'Maps the media time-line to the presentation time-line.',
        ref: 'ISO/IEC 14496-12, 8.6.6',
    },
    'elst@version': {
        text: 'Version of this box (0 or 1). Affects the size of duration and time fields.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@entry_count': {
        text: 'The number of entries in the edit list.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@segment_duration_1': {
        text: 'The duration of this edit segment in movie timescale units.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    'elst@media_time_1': {
        text: 'The starting time within the media of this edit segment. A value of -1 indicates an empty edit.',
        ref: 'ISO/IEC 14496-12, 8.6.6.3',
    },
    mvex: {
        name: 'Movie Extends',
        text: 'Signals that the movie may contain fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.1',
    },
    trex: {
        name: 'Track Extends',
        text: 'Sets default values for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3',
    },
    'trex@track_ID': {
        text: 'The track ID to which these defaults apply.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_description_index': {
        text: 'The default sample description index for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_duration': {
        text: 'The default duration for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_size': {
        text: 'The default size for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    'trex@default_sample_flags': {
        text: 'The default flags for samples in fragments.',
        ref: 'ISO/IEC 14496-12, 8.8.3.3',
    },
    moof: {
        name: 'Movie Fragment',
        text: 'Container for all metadata for a single fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.4',
    },
    mfhd: {
        name: 'Movie Fragment Header',
        text: 'Contains the sequence number of this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.5',
    },
    'mfhd@sequence_number': {
        text: 'The ordinal number of this fragment, in increasing order.',
        ref: 'ISO/IEC 14496-12, 8.8.5.3',
    },
    traf: {
        name: 'Track Fragment',
        text: "Container for metadata for a single track's fragment.",
        ref: 'ISO/IEC 14496-12, 8.8.6',
    },
    tfhd: {
        name: 'Track Fragment Header',
        text: 'Declares defaults for a track fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7',
    },
    'tfhd@track_ID': {
        text: 'The unique identifier of the track for this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@flags': {
        text: 'A bitfield indicating which optional fields are present.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@base_data_offset': {
        text: 'The base offset for data within the current mdat.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    'tfhd@sample_description_index': {
        text: 'The index of the sample description for this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.7.2',
    },
    tfdt: {
        name: 'Track Fragment Decode Time',
        text: 'Provides the absolute decode time for the first sample.',
        ref: 'ISO/IEC 14496-12, 8.8.12',
    },
    'tfdt@version': {
        text: 'Version of this box (0 or 1). Affects the size of the decode time field.',
        ref: 'ISO/IEC 14496-12, 8.8.12.3',
    },
    'tfdt@baseMediaDecodeTime': {
        text: 'The absolute decode time, in media timescale units, for the first sample in this fragment.',
        ref: 'ISO/IEC 14496-12, 8.8.12.3',
    },
    trun: {
        name: 'Track Run',
        text: 'Contains timing, size, and flags for a run of samples.',
        ref: 'ISO/IEC 14496-12, 8.8.8',
    },
    'trun@version': {
        text: 'Version of this box (0 or 1). Affects signed/unsigned composition time.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
    'trun@flags': {
        text: 'A bitfield indicating which optional per-sample fields are present.',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
    },
    'trun@sample_count': {
        text: 'The number of samples in this run.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@data_offset': {
        text: 'An optional offset added to the base_data_offset.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@first_sample_flags': {
        text: 'Flags for the first sample, overriding the default.',
        ref: 'ISO/IEC 14496-12, 8.8.8.3',
    },
    'trun@samples': {
        text: 'A table of sample-specific data (duration, size, flags, composition time offset).',
        ref: 'ISO/IEC 14496-12, 8.8.8.2',
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