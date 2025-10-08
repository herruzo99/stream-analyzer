/**
 * A comprehensive mapping of DASH MPD element and attribute names to their descriptions and ISO/IEC 23009-1:2022 standard references.
 * This structure is designed to provide rich, context-aware tooltips for developers and engineers working with DASH manifests.
 * Format: 'ElementName' for elements, 'ElementName@attributeName' for attributes.
 */
export const dashTooltipData = {
    // MPD Level
    MPD: {
        text: 'The root element of the Media Presentation Description (MPD). It contains all metadata required for a client to stream the content.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@id': {
        text: 'A unique identifier for the Media Presentation. Recommended to be unique within the publishing scope.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@profiles': {
        text: 'A comma-separated list of profile identifiers. This signals the specific DASH features and constraints the MPD and its segments conform to, ensuring client compatibility.',
        isoRef: 'Clause 8.1 & 5.3.1.2, Table 3',
    },
    'MPD@type': {
        text: 'Specifies the presentation type. "static" is for on-demand content (VOD), while "dynamic" is for live streaming services.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@availabilityStartTime': {
        text: 'For "dynamic" presentations, this is the anchor time (in UTC) from which all media times are calculated. For "static" presentations, it specifies when segments become available.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@availabilityEndTime': {
        text: 'The latest point in wall-clock time at which any segment in the presentation is available.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@publishTime': {
        text: 'For "dynamic" presentations, this specifies the wall-clock time when this version of the MPD was generated. A later publishTime indicates an updated MPD.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@mediaPresentationDuration': {
        text: 'The total duration of the media presentation for "static" content. If not present for dynamic content, the duration is unknown.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@minimumUpdatePeriod': {
        text: 'For "dynamic" MPDs, specifies the minimum time a client should wait before requesting an updated MPD. If not present, the MPD is not expected to change.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@minBufferTime': {
        text: 'Specifies a minimum buffer duration that a client should maintain to ensure smooth playback across all Representations.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@timeShiftBufferDepth': {
        text: 'For "dynamic" presentations, this specifies the duration of the time-shifting buffer (DVR window) that is guaranteed to be available.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@suggestedPresentationDelay': {
        text: 'For "dynamic" presentations, a suggested delay from the live edge at which players should start presentation. This helps synchronize clients and maintain a stable buffer.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@maxSegmentDuration': {
        text: 'The maximum duration of any Segment in the Media Presentation. Provides an upper bound for client buffer and request planning.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@maxSubsegmentDuration': {
        text: 'The maximum duration of any Media Subsegment (e.g., CMAF Chunk) in the Media Presentation. Important for low-latency streaming calculations.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },

    // XML Schema / Namespace Attributes
    'MPD@xmlns': {
        text: 'XML Namespace. Declares the default namespace for elements in the document, which must be "urn:mpeg:dash:schema:mpd:2011".',
        isoRef: 'W3C XML Namespaces & Clause 5.2.2',
    },
    'MPD@xmlns:xsi': {
        text: 'XML Namespace for XML Schema Instance. Enables the use of schema-related attributes like xsi:schemaLocation.',
        isoRef: 'W3C XML Schema Part 1',
    },
    'MPD@xsi:schemaLocation': {
        text: 'XML Schema Location. Associates the DASH namespace URI with the physical location of its schema definition file (XSD) for validation.',
        isoRef: 'W3C XML Schema Part 1 & Clause 5.2.2',
    },
    'MPD@schemaLocation': {
        text: 'XML Schema Location. Associates the DASH namespace URI with the physical location of its schema definition file (XSD) for validation.',
        isoRef: 'W3C XML Schema Part 1 & Clause 5.2.2',
    },
    'MPD@xmlns:cenc': {
        text: 'XML Namespace for MPEG Common Encryption (CENC). Declares the "cenc" prefix, typically used for the <cenc:pssh> element inside a ContentProtection descriptor.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },

    // BaseURL & Locations
    BaseURL: {
        text: 'Specifies a base URL used for resolving relative URLs of segments, initialization files, or other resources. Can be specified at multiple levels (MPD, Period, etc.).',
        isoRef: 'Clause 5.6',
    },
    Location: {
        text: 'Specifies an alternative URL where the complete MPD can be retrieved. This is used for redundancy and load balancing.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    PatchLocation: {
        text: 'Specifies a URL for fetching an MPD patch document. This allows for efficient updates in live services by sending only the changes to the manifest.',
        isoRef: 'Clause 5.15.2',
    },

    // Program Information
    ProgramInformation: {
        text: 'Provides descriptive metadata about the Media Presentation, such as title and source.',
        isoRef: 'Clause 5.7',
    },
    'ProgramInformation@lang': {
        text: 'Specifies the language of the descriptive information in this element.',
        isoRef: 'Clause 5.7.2, Table 31',
    },
    'ProgramInformation@moreInformationURL': {
        text: 'A URL pointing to a web page or resource with more detailed information about the program.',
        isoRef: 'Clause 5.7.2, Table 31',
    },
    Title: {
        text: 'A human-readable title for the Media Presentation.',
        isoRef: 'Clause 5.7.2, Table 31',
    },
    Source: {
        text: 'Information about the original source of the content, such as a broadcaster or production company.',
        isoRef: 'Clause 5.7.2, Table 31',
    },
    Copyright: {
        text: 'A copyright statement for the Media Presentation.',
        isoRef: 'Clause 5.7.2, Table 31',
    },

    // Period Level
    Period: {
        text: 'A Period represents a continuous segment of content time. Multiple Periods can be concatenated to form the full presentation, often used for ad insertion.',
        isoRef: 'Clause 5.3.2',
    },
    'Period@id': {
        text: 'A unique identifier for the Period. It is mandatory for dynamic MPDs to allow clients to track periods across manifest updates.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@start': {
        text: 'The start time of the Period on the Media Presentation Timeline. For the first period, this is typically "PT0S".',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@duration': {
        text: 'The duration of the Period in ISO 8601 format. If not present for the last period, the presentation continues until ended by other means.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@bitstreamSwitching': {
        text: 'When "true", indicates that bitstream switching is possible between Representations within this Period, implying Segments can be concatenated without re-initialization.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    AssetIdentifier: {
        text: 'Specifies an asset identifier for the Period. Periods with the same AssetIdentifier belong to the same logical asset, which helps clients maintain context across ad breaks.',
        isoRef: 'Clause 5.8.4.10',
    },

    // AdaptationSet Level
    AdaptationSet: {
        text: 'A set of interchangeable, encoded versions of one or more media components. For example, all video bitrates, or all audio language tracks.',
        isoRef: 'Clause 5.3.3',
    },
    'AdaptationSet@id': {
        text: 'A unique identifier for the AdaptationSet within the Period.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@group': {
        text: 'Assigns the AdaptationSet to a group. A client should present at most one Representation from each non-zero group simultaneously.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@contentType': {
        text: 'Specifies the high-level media type for this set, such as "video", "audio", or "text".',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@lang': {
        text: 'Specifies the language of the content in this set, using RFC 5646 codes (e.g., "en", "es-419").',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@mimeType': {
        text: 'The MIME type for all Representations in this set. This is a common attribute that can also be specified per-Representation.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@codecs': {
        text: 'A string identifying the codec(s) common to all Representations in this set, as per RFC 6381. This is a common attribute.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@minBandwidth': {
        text: 'The minimum bandwidth of any Representation in this set, in bits per second.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxBandwidth': {
        text: 'The maximum bandwidth of any Representation in this set, in bits per second.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@minWidth': {
        text: 'The minimum width in pixels of any video Representation in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxWidth': {
        text: 'The maximum width in pixels of any video Representation in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@minHeight': {
        text: 'The minimum height in pixels of any video Representation in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxHeight': {
        text: 'The maximum height in pixels of any video Representation in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@minFrameRate': {
        text: 'The minimum frame rate of any video Representation in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxFrameRate': {
        text: 'The maximum frame rate of any video Representation in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@frameRate': {
        text: "The frame rate of the video content, common to all Representations in this set. It is typically expressed as a fraction (e.g., '@/1', '30000/1001').",
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@par': {
        text: 'The picture aspect ratio for the video content (e.g., "16:9"), common to all Representations in the set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@width': {
        text: 'Specifies the horizontal visual presentation size of the video media type on a grid determined by the @sar attribute.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@height': {
        text: 'Specifies the vertical visual presentation size of the video media type, on a grid determined by the @sar attribute.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@selectionPriority': {
        text: 'A priority for this AdaptationSet. Higher numbers are preferred. Can guide client selection logic when multiple suitable sets are available.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@segmentAlignment': {
        text: 'If true, indicates that segment boundaries are aligned across all Representations in this set, simplifying seamless ABR switching.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@subsegmentAlignment': {
        text: 'If true, indicates that subsegment boundaries (e.g., CMAF chunks) are aligned across Representations, enabling low-latency switching.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@startWithSAP': {
        text: 'Specifies that media segments start with a Stream Access Point (SAP) of a certain type. A value of 1 or 2 is typical, enabling easier stream switching and seeking.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@subsegmentStartsWithSAP': {
        text: 'Specifies that subsegments start with a Stream Access Point (SAP), essential for efficient seeking and low-latency streaming.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@bitstreamSwitching': {
        text: 'If true, indicates that segments from different Representations in this set can be concatenated to form a single, conforming bitstream, enabling switching without re-initializing the decoder.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@initializationPrincipal': {
        text: 'A URL to a CMAF Principal Header that is sufficient to initialize any Representation in this Adaptation Set. This promotes efficiency by allowing a single initialization segment to cover all quality levels.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    ContentComponent: {
        text: 'Describes a single media component (e.g. a specific audio track) within an AdaptationSet that contains multiplexed content.',
        isoRef: 'Clause 5.3.4',
    },

    // Representation Level
    Representation: {
        text: 'A specific, deliverable, and encoded version of one or more media streams (e.g., video at a particular bitrate and resolution).',
        isoRef: 'Clause 5.3.5',
    },
    'Representation@id': {
        text: 'A unique identifier for the Representation within the Period.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@bandwidth': {
        text: 'The required bandwidth in bits per second. A client with this bandwidth can stream the Representation without buffering, assuming it maintains a buffer of at least @minBufferTime.',
        isoRef: 'Clause 5.3.5.2, Table 9 & Clause 5.3.5.4',
    },
    'Representation@qualityRanking': {
        text: 'Specifies a quality ranking relative to other Representations in the same AdaptationSet. Lower integer values represent higher quality.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@dependencyId': {
        text: 'A space-separated list of other Representation IDs that this Representation depends on for decoding or presentation (e.g., for Scalable Video Coding).',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@associationId': {
        text: 'A space-separated list of Representation IDs that this Representation is associated with (e.g., a metadata track associated with a video track).',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@associationType': {
        text: 'Specifies the type of association for each ID in @associationId. Uses 4CC codes like "cdsc" for content description.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@mimeType': {
        text: 'Defines the MIME type for this specific Representation, as per RFC 6838. If present, it overrides any mimeType inherited from the parent AdaptationSet.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@mediaStreamStructureId': {
        text: 'Identifies a group of Representations that share a common stream structure (e.g. SAP timing), enabling more complex switching scenarios like Open GOP.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@codecs': {
        text: 'A string identifying the codec(s) and profile/level used in this Representation, as per RFC 6381.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@containerProfiles': {
        text: "Specifies container profiles essential for processing the Representation, often used with CMAF to indicate 'cmfc' or 'cmf2' conformance.",
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@width': {
        text: 'The width of the video in this Representation, in pixels.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@height': {
        text: 'The height of the video in this Representation, in pixels.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@frameRate': {
        text: 'The frame rate of the video, expressed as a fraction (e.g., "30000/1001").',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@sar': {
        text: 'The Sample Aspect Ratio of the video (e.g., "1:1" for square pixels).',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@audioSamplingRate': {
        text: 'The sampling rate of the audio in samples per second (Hz).',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@scanType': {
        text: 'The scan type of the source video, either "progressive" or "interlaced".',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    SubRepresentation: {
        text: 'Describes a subset of a Representation that can be extracted, such as a lower frame-rate track for trick modes or a specific audio channel.',
        isoRef: 'Clause 5.3.6',
    },

    // Segment Info Level
    SegmentBase: {
        text: 'Provides default segment information, typically used for single-segment Representations where the URL is given by a BaseURL element.',
        isoRef: 'Clause 5.3.9.2',
    },
    'SegmentBase@indexRange': {
        text: "Specifies the byte range within the media segment that contains the Segment Index ('sidx') box.",
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentBase@indexRangeExact': {
        text: 'If true, specifies that the byte range in @indexRange is exact. If false, the client may need to parse the media to find the end of the index.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentBase@availabilityTimeOffset': {
        text: 'An offset in seconds applied to the segment availability time. For low-latency, this allows segments to be advertised before they are fully available.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentBase@availabilityTimeComplete': {
        text: 'If false, indicates that a segment might not be fully available at its announced availability time, used in low-latency chunked transfer.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    SegmentList: {
        text: 'Provides an explicit list of Segment URLs, typically used for VOD when segment locations are not predictable.',
        isoRef: 'Clause 5.3.9.3',
    },
    SegmentURL: {
        text: 'Specifies the URL and optional byte range for a single Media Segment within a SegmentList.',
        isoRef: 'Clause 5.3.9.3.2, Table 19',
    },
    'SegmentURL@mediaRange': {
        text: 'The byte range of the media segment within the resource specified by the @media attribute.',
        isoRef: 'Clause 5.3.9.3.2, Table 19',
    },
    SegmentTemplate: {
        text: 'Defines a template for generating Segment URLs dynamically, using identifiers like $Number$ or $Time$.',
        isoRef: 'Clause 5.3.9.4',
    },
    'SegmentTemplate@timescale': {
        text: 'The number of time units that pass in one second. This timescale is used for calculating segment durations and start times specified in this template.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentTemplate@presentationTimeOffset': {
        text: "An offset in timescale units applied to the media presentation time. This aligns the segment's internal timeline with the Period's timeline.",
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentTemplate@initialization': {
        text: 'A template for the URL of the Initialization Segment. May contain identifiers like $RepresentationID$.',
        isoRef: 'Clause 5.3.9.4.2, Table 20',
    },
    'SegmentTemplate@media': {
        text: 'A template for the URLs of the Media Segments. Typically contains $Time$ or $Number$ for dynamic URL generation.',
        isoRef: 'Clause 5.3.9.4.2, Table 20',
    },
    'SegmentTemplate@duration': {
        text: 'Specifies the constant duration of each segment in timescale units. This is used when the media template uses the $Number$ identifier.',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    'SegmentTemplate@startNumber': {
        text: 'The number of the first Media Segment in this Representation. Used with the $Number$ identifier.',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    'SegmentTemplate@endNumber': {
        text: 'The number of the last Media Segment in this Representation for the Period.',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    SegmentTimeline: {
        text: 'Provides an explicit, ordered list of segments with potentially variable durations. It is an alternative to using the @duration attribute on SegmentTemplate.',
        isoRef: 'Clause 5.3.9.6',
    },
    S: {
        text: 'A Segment Timeline entry. Defines a series of one or more contiguous segments with the same duration.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@t': {
        text: 'The presentation start time of the first segment in this series, in units of the @timescale.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@d': {
        text: 'The duration of each segment in this series, in units of the @timescale.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@r': {
        text: 'The repeat count. A value of "N" means there are N+1 segments in this contiguous series. A value of -1 means the segment repeats until the next S element or the end of the Period.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@n': {
        text: 'The segment number of the first segment in this series. Can be used to signal discontinuities in segment numbering.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@k': {
        text: 'The number of segments included in a Segment Sequence, used for hierarchical templating.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },

    // Events & Timing
    EventStream: {
        text: 'An element within a Period that contains a sequence of timed events signaled directly in the MPD.',
        isoRef: 'Clause 5.10.2',
    },
    InbandEventStream: {
        text: 'Signals the presence of an event stream multiplexed within the media segments of a Representation.',
        isoRef: 'Clause 5.10.3.2',
    },
    Event: {
        text: 'A single timed event within an EventStream.',
        isoRef: 'Clause 5.10.2.2, Table 39',
    },
    'Event@presentationTime': {
        text: 'The presentation time of the event relative to the start of the Period.',
        isoRef: 'Clause 5.10.2.2, Table 39',
    },
    'Event@duration': {
        text: 'The duration of the event.',
        isoRef: 'Clause 5.10.2.2, Table 39',
    },

    // Descriptors
    Accessibility: {
        text: 'Provides information about accessibility features, such as audio descriptions or subtitles for the hard-of-hearing.',
        isoRef: 'Clause 5.8.4.3',
    },
    AudioChannelConfiguration: {
        text: 'Specifies the audio channel layout (e.g., stereo, 5.1 surround sound).',
        isoRef: 'Clause 5.8.4.7',
    },
    'AudioChannelConfiguration@schemeIdUri': {
        text: 'A URI identifying the scheme used to define the audio channel configuration (e.g., "urn:mpeg:dash:23003:3:audio_channel_configuration:2011").',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'AudioChannelConfiguration@value': {
        text: 'A code representing the channel configuration according to the specified scheme (e.g., "2" for stereo).',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    ContentProtection: {
        text: 'Contains information about a DRM system or encryption scheme used to protect the content, enabling a client to perform license acquisition.',
        isoRef: 'Clause 5.8.4.1',
    },
    'ContentProtection@schemeIdUri': {
        text: 'A URI that uniquely identifies the content protection scheme (e.g., the UUID for Widevine, PlayReady, or FairPlay).',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@value': {
        text: 'An optional string providing additional scheme-specific information. For Common Encryption, this may be "cenc".',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@cenc:default_KID': {
        text: 'The default Key ID for the content, as a UUID. This is the primary identifier for the decryption key.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    'ContentProtection@default_KID': {
        text: 'The default Key ID for the content, as a UUID. This is the primary identifier for the decryption key.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    'ContentProtection@robustness': {
        text: 'Specifies the minimum required security level for the client decryptor (e.g., software vs. hardware DRM).',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'cenc:pssh': {
        text: 'Base64-encoded Protection System Specific Header. This opaque blob contains initialization data required by a specific DRM system to generate a license request.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    pssh: {
        text: 'Base64-encoded Protection System Specific Header. This opaque blob contains initialization data required by a specific DRM system to generate a license request.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    EssentialProperty: {
        text: 'Specifies a property that is essential for processing the parent element. If a client does not understand an EssentialProperty, it MUST ignore the parent element.',
        isoRef: 'Clause 5.8.4.8',
    },
    FramePacking: {
        text: 'Describes the arrangement of frames for stereoscopic 3D video content.',
        isoRef: 'Clause 5.8.4.6',
    },
    ProducerReferenceTime: {
        text: 'Provides a mapping between media presentation time and a wall-clock time at the point of production (capture or encoding), useful for live latency calculations.',
        isoRef: 'Clause 5.12',
    },
    SupplementalProperty: {
        text: 'Specifies supplemental information that is not essential for playback but may be used by the client for optimization or enhanced functionality.',
        isoRef: 'Clause 5.8.4.9',
    },
    'SupplementalProperty@schemeIdUri': {
        text: 'A URI that identifies the scheme for the supplemental property (e.g., "urn:mpeg:dash:adaptation-set-switching:2016" for signaling switchable Adaptation Sets).',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'SupplementalProperty@value': {
        text: 'The value for the supplemental property, with semantics defined by the scheme (e.g., a comma-separated list of AdaptationSet IDs for adaptation-set-switching).',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    Label: {
        text: 'Provides a human-readable text string for its parent element, which can be used for UI display (e.g., "1080p", "English AAC").',
        isoRef: 'Clause 5.3.10',
    },
    Rating: {
        text: 'Specifies a content rating (e.g., for parental control) using a defined rating scheme.',
        isoRef: 'Clause 5.8.4.4',
    },
    Role: {
        text: 'Describes the role or purpose of an AdaptationSet, helping the client select the appropriate track (e.g., "main", "alternate", "commentary", "subtitle").',
        isoRef: 'Clause 5.8.4.2',
    },
    'Role@schemeIdUri': {
        text: 'A URI identifying the role scheme, typically "urn:mpeg:dash:role:2011".',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'Role@value': {
        text: 'The specific role value within the defined scheme (e.g., "main", "dub").',
        isoRef: 'Clause 5.8.5.5, Table 34',
    },
    UTCTiming: {
        text: 'Provides a timing source for clients to synchronize their wall-clocks, which is crucial for consistent live stream startup and timeline management.',
        isoRef: 'Clause 5.8.4.11',
    },
    'UTCTiming@schemeIdUri': {
        text: 'Identifies the clock synchronization method (e.g., "urn:mpeg:dash:utc:http-xsdate:2014" for an HTTP endpoint returning an ISO 8601 date).',
        isoRef: 'Clause 5.8.5.7, Table 35',
    },
    'UTCTiming@value': {
        text: 'The value associated with the synchronization scheme, often a URL to a time server.',
        isoRef: 'Clause 5.8.5.7, Table 35',
    },
    Viewpoint: {
        text: 'Describes the viewpoint of the media content, used for multi-view or immersive experiences.',
        isoRef: 'Clause 5.8.4.5',
    },

    // Service Description Level (Annex K)
    ServiceDescription: {
        text: 'Provides guidance to the client on how the service provider expects the service to be consumed, particularly regarding latency and playback rate.',
        isoRef: 'Annex K.4',
    },
    Scope: {
        text: 'Defines the scope to which a ServiceDescription applies, allowing different rules for different clients or environments.',
        isoRef: 'Annex K.4.2.1, Table K.5',
    },
    Latency: {
        text: 'Specifies latency targets for the service, including minimum, maximum, and target latency values.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@target': {
        text: 'The service provider’s preferred presentation latency in milliseconds, measured against a ProducerReferenceTime.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@min': {
        text: 'The minimum allowed presentation latency in milliseconds.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@max': {
        text: 'The maximum allowed presentation latency in milliseconds.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    PlaybackRate: {
        text: 'Specifies the acceptable range for playback rate adjustment, allowing the client to slightly speed up or slow down playback to manage latency.',
        isoRef: 'Annex K.4.2.3, Table K.7',
    },
    'PlaybackRate@min': {
        text: 'The minimum playback rate relative to normal speed (1.0).',
        isoRef: 'Annex K.4.2.3, Table K.7',
    },
    'PlaybackRate@max': {
        text: 'The maximum playback rate relative to normal speed (1.0).',
        isoRef: 'Annex K.4.2.3, Table K.7',
    },

    // 2022 Spec Additions & Refinements
    InitializationSet: {
        text: 'Specifies a suitable initialization for a specific media type. This allows clients to determine playback capabilities for the entire presentation upfront.',
        isoRef: 'Clause 5.3.12',
    },
    'AdaptationSet@initializationSetRef': {
        text: 'A space-separated list of InitializationSet IDs that this AdaptationSet conforms to.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    Preselection: {
        text: 'Specifies a combination of Adaptation Sets that form a specific, complete user experience (e.g., a main audio track plus a commentary track).',
        isoRef: 'Clause 5.3.11',
    },
    'Preselection@preselectionComponents': {
        text: 'A space-separated list of AdaptationSet and/or ContentComponent IDs that constitute this preselection.',
        isoRef: 'Clause 5.3.11.3, Table 26',
    },
    Resync: {
        text: 'Provides information on resynchronization points within Segments, enabling low-latency streaming and more efficient seeking by allowing clients to process a segment from the middle.',
        isoRef: 'Clause 5.3.13',
    },
    'Resync@type': {
        text: 'Specifies the type of the Resync Point. A value > 0 indicates properties of a Stream Access Point (SAP) of that type or lower.',
        isoRef: 'Clause 5.3.13.2, Table 28',
    },
    'Resync@marker': {
        text: 'If true, indicates that each resynchronization point includes a specific binary marker that can be found by scanning the segment bytes.',
        isoRef: 'Clause 5.3.13.2, Table 28',
    },
    ExtendedBandwidth: {
        text: 'Provides a more detailed and accurate bandwidth model, especially for Variable Bitrate (VBR) content, by specifying bandwidth requirements over different buffer times.',
        isoRef: 'Clause 5.3.5.6',
    },
    'ExtendedBandwidth@vbr': {
        text: 'If true, indicates that the content has Variable Bitrate characteristics and that the ModelPair elements provide a more accurate bandwidth model than the main @bandwidth attribute.',
        isoRef: 'Clause 5.3.5.6, Table 12',
    },
    ModelPair: {
        text: 'A pair of bufferTime and bandwidth values that further define the characteristics of a VBR Representation.',
        isoRef: 'Clause 5.3.5.6',
    },
    'ModelPair@bufferTime': {
        text: 'The buffer duration for which the associated bandwidth is specified.',
        isoRef: 'Clause 5.3.5.6, Table 12',
    },
    'ModelPair@bandwidth': {
        text: 'The bandwidth required to sustain playback for the associated bufferTime.',
        isoRef: 'Clause 5.3.5.6, Table 12',
    },
    FailoverContent: {
        text: 'Signals time ranges within the content that have been replaced by failover content (e.g., a slate or color bars) due to an upstream error.',
        isoRef: 'Clause 5.3.9.7',
    },
    FCS: {
        text: 'Failover Content Section. Specifies the start time (@t) and duration (@d) of a section containing failover content.',
        isoRef: 'Clause 5.3.9.7.2, Table 23',
    },
    OutputProtection: {
        text: 'Specifies the required output protection scheme and level (e.g., HDCP 2.2) necessary to render the content on an external display.',
        isoRef: 'Clause 5.8.4.12',
    },
    'OutputProtection@schemeIdUri': {
        text: 'A URI identifying the output protection scheme (e.g., "urn:mpeg:dash:output-protection:hdcp:2020").',
        isoRef: 'Clause 5.8.5.14',
    },
    'OutputProtection@value': {
        text: 'A value specifying the minimum required version or level of the protection scheme (e.g., "2.2" for HDCP 2.2).',
        isoRef: 'Clause 5.8.5.14.2, Table 36',
    },
};