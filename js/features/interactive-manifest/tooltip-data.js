/**
 * A mapping of DASH MPD element and attribute names to their descriptions and ISO standard references.
 * Format: 'ElementName' for elements, 'ElementName@attributeName' for attributes.
 */
export const dashTooltipData = {
    // MPD Level
    MPD: {
        text: 'The root element of the Media Presentation Description.',
        isoRef: 'Clause 5.3.1.2',
    },
    'MPD@profiles': {
        text: 'A comma-separated list of profiles the MPD conforms to. Essential for client compatibility.',
        isoRef: 'Clause 8.1',
    },
    'MPD@type': {
        text: 'Indicates if the presentation is static (VOD) or dynamic (live).',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@minBufferTime': {
        text: 'The minimum buffer time a client should maintain to ensure smooth playback.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@mediaPresentationDuration': {
        text: 'The total duration of the on-demand content.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@availabilityStartTime': {
        text: 'The anchor time for a dynamic presentation, defining the point from which all media times are calculated.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@publishTime': {
        text: 'The time this version of the MPD was generated on the server.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@minimumUpdatePeriod': {
        text: 'For dynamic MPDs, the minimum time a client should wait before requesting an updated MPD.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@timeShiftBufferDepth': {
        text: 'The duration of the seekable live window (DVR) available to the client.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@suggestedPresentationDelay': {
        text: 'A suggested delay from the live edge for players to begin presentation, helping to synchronize clients.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },

    // Period Level
    Period: {
        text: 'A Period represents a continuous segment of content. Multiple Periods can be used for things like ad insertion.',
        isoRef: 'Clause 5.3.2',
    },
    'Period@id': {
        text: 'A unique identifier for the Period. Mandatory for dynamic MPDs.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@start': {
        text: 'The start time of the Period on the Media Presentation Timeline.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@duration': {
        text: 'The duration of the Period.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },

    // AdaptationSet Level
    AdaptationSet: {
        text: 'A set of interchangeable encoded versions of one or several media components (e.g., all video bitrates, or all audio languages).',
        isoRef: 'Clause 5.3.3',
    },
    'AdaptationSet@id': {
        text: 'A unique identifier for the AdaptationSet within the Period.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@contentType': {
        text: 'Specifies the media content type (e.g., "video", "audio").',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@mimeType': {
        text: 'The MIME type for all Representations in this set.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@lang': {
        text: 'Specifies the language of the content, using RFC 5646 codes (e.g., "en", "es").',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@segmentAlignment': {
        text: 'If true, indicates that segments are aligned across Representations, simplifying seamless switching.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxWidth': {
        text: 'The maximum width of any video Representation in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxHeight': {
        text: 'The maximum height of any video Representation in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@par': {
        text: 'The picture aspect ratio for the video content (e.g., "16:9").',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },

    // Representation Level
    Representation: {
        text: 'A specific, deliverable encoded version of media content (e.g., video at a particular bitrate and resolution).',
        isoRef: 'Clause 5.3.5',
    },
    'Representation@id': {
        text: 'A unique identifier for the Representation within the Period.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@bandwidth': {
        text: 'The required bandwidth in bits per second to stream this Representation.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@codecs': {
        text: 'A string identifying the codec(s) used, as per RFC 6381.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@width': {
        text: 'The width of the video in this Representation.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@height': {
        text: 'The height of the video in this Representation.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@frameRate': {
        text: 'The frame rate of the video.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@sar': {
        text: 'The Sample Aspect Ratio of the video.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@audioSamplingRate': {
        text: 'The sampling rate of the audio in samples per second.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },

    // Segment Info Level
    SegmentTemplate: {
        text: 'Defines a template for generating Segment URLs.',
        isoRef: 'Clause 5.3.9.4',
    },
    'SegmentTemplate@timescale': {
        text: 'The number of time units that pass in one second. Used for calculating segment durations and start times.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentTemplate@initialization': {
        text: 'A template for the URL of the Initialization Segment.',
        isoRef: 'Clause 5.3.9.4.2, Table 20',
    },
    'SegmentTemplate@media': {
        text: 'A template for the URLs of the Media Segments. Often contains $Time$ or $Number$.',
        isoRef: 'Clause 5.3.9.4.2, Table 20',
    },
    SegmentTimeline: {
        text: 'Provides an explicit timeline for media segments, allowing for variable durations.',
        isoRef: 'Clause 5.3.9.6',
    },
    S: {
        text: 'A Segment Timeline entry. Defines a series of one or more contiguous segments.',
        isoRef: 'Clause 5.3.9.6.2',
    },
    'S@t': {
        text: 'The start time of the first segment in this series, in units of the @timescale.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@d': {
        text: 'The duration of each segment in this series, in units of the @timescale.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@r': {
        text: 'The repeat count. A value of "N" means there are N+1 segments in this series.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },

    // Descriptors
    ContentProtection: {
        text: 'Contains information about a DRM or encryption scheme used to protect the content.',
        isoRef: 'Clause 5.8.4.1',
    },
    'ContentProtection@schemeIdUri': {
        text: 'A URI that uniquely identifies the content protection scheme (e.g., the UUID for Widevine or PlayReady).',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'ContentProtection@value': {
        text: 'An optional string providing additional scheme-specific information.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    AudioChannelConfiguration: {
        text: 'Specifies the audio channel layout (e.g., stereo, 5.1 surround).',
        isoRef: 'Clause 5.8.4.7',
    },
    Role: {
        text: 'Describes the role or purpose of an AdaptationSet (e.g., "main", "alternate", "commentary").',
        isoRef: 'Clause 5.8.4.2',
    },
    'Role@schemeIdUri': {
        text: 'Identifies the scheme used for the Role descriptor.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'Role@value': {
        text: 'The specific role value within the defined scheme.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
};