/**
 * A comprehensive mapping of DASH MPD element and attribute names to their descriptions and ISO/IEC 23009-1:2022 standard references.
 * This structure provides rich, context-aware tooltips for developers and engineers, explaining the architectural implications of each field.
 * Format: 'ElementName' for elements, 'ElementName@attributeName' for attributes.
 */
export const dashTooltipData = {
    // MPD Level
    MPD: {
        text: 'The root element of the Media Presentation Description. It aggregates all metadata required for a DASH client to understand and stream the content, from segment locations and timing to available bitrates and content protection schemes.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@id': {
        text: 'An optional, unique identifier for the Media Presentation. While optional, it is crucial for correlating MPD patch documents or for external referencing.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@profiles': {
        text: 'A mandatory, comma-separated list of profile identifiers. Each profile defines a set of allowed features and constraints. This is the primary mechanism for a client to verify its compatibility with the stream.',
        isoRef: 'Clause 8.1 & 5.3.1.2, Table 3',
    },
    'MPD@type': {
        text: 'Specifies the presentation type. "static" indicates on-demand content (VOD), where all segments are available at once. "dynamic" indicates a live or linear service where segments become available over time.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@availabilityStartTime': {
        text: 'The absolute anchor time (in UTC) for the entire presentation. For "dynamic" streams, all segment availability times are calculated relative to this point. It establishes the origin of the wall-clock timeline.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@availabilityEndTime': {
        text: 'An optional attribute specifying the wall-clock time at which the last segment in the presentation becomes unavailable. Useful for defining the content lifecycle.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@publishTime': {
        text: 'Mandatory for "dynamic" MPDs that are updated. It specifies the wall-clock time when this version of the MPD was published. A client uses this to sequence MPD updates correctly.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@mediaPresentationDuration': {
        text: 'The total duration of the media presentation in ISO 8601 format. Mandatory for "static" content. For "dynamic" content, it indicates the total duration if known (e.g., for a live event with a scheduled end).',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@minimumUpdatePeriod': {
        text: 'For "dynamic" MPDs, specifies the minimum time a client must wait after fetching one MPD before requesting an update. This prevents clients from overloading the manifest server.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@minBufferTime': {
        text: 'A mandatory value specifying the minimum buffer duration, in ISO 8601 format, that a client should maintain to ensure smooth playback under ideal network conditions. This value is a key input to ABR heuristics.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@timeShiftBufferDepth': {
        text: 'For "dynamic" presentations, this specifies the duration of the time-shifting buffer (DVR window) available to the client, in ISO 8601 format. It defines how far back in time a user can seek.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@suggestedPresentationDelay': {
        text: 'For "dynamic" presentations, a suggested delay from the live edge at which players should start presentation. This helps synchronize multiple clients and provides a stable buffer against network jitter.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@maxSegmentDuration': {
        text: "The maximum duration of any Segment in the Media Presentation. This provides an upper bound for a client's planning, especially for buffer allocation and request timing.",
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@maxSubsegmentDuration': {
        text: 'The maximum duration of any Media Subsegment (e.g., a CMAF Chunk). This is a critical parameter for low-latency DASH, as it defines the smallest independently addressable unit of media.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },

    // XML Schema / Namespace Attributes
    'MPD@xmlns': {
        text: 'XML Namespace. Declares the default namespace for elements in the document. For a valid DASH MPD, this must be "urn:mpeg:dash:schema:mpd:2011".',
        isoRef: 'Clause 5.2.2',
    },
    'MPD@xmlns:xsi': {
        text: 'XML Namespace for XML Schema Instance. Enables the use of schema-related attributes like xsi:schemaLocation, which are used for XML validation.',
        isoRef: 'W3C XML Schema Part 1',
    },
    'MPD@xsi:schemaLocation': {
        text: 'XML Schema Location. Provides a hint to XML validators, associating the DASH namespace URI with the physical location of its schema definition file (XSD). This is not required for playback but is good practice for manifest validation.',
        isoRef: 'Clause 5.2.2 & W3C XML Schema Part 1',
    },
    'MPD@schemaLocation': {
        text: 'XML Schema Location. Provides a hint to XML validators, associating the DASH namespace URI with the physical location of its schema definition file (XSD). This is not required for playback but is good practice for manifest validation.',
        isoRef: 'Clause 5.2.2 & W3C XML Schema Part 1',
    },
    'MPD@xmlns:cenc': {
        text: 'XML Namespace for MPEG Common Encryption (CENC). Declares the "cenc" prefix for elements defined in the CENC standard, most notably the <cenc:pssh> element.',
        isoRef: 'Clause 5.8.5.2.2',
    },
    'MPD@xmlns:xlink': {
        text: 'XML Namespace for XLink. Declares the "xlink" prefix, used for attributes like xlink:href that allow parts of the MPD to be defined in external documents.',
        isoRef: 'Clause 5.5.2, Table 29',
    },

    // BaseURL & Locations
    BaseURL: {
        text: 'Specifies a base URL for resolving relative URLs of segments or other resources. BaseURLs are hierarchical; a BaseURL at a lower level (e.g., AdaptationSet) overrides one at a higher level (e.g., MPD).',
        isoRef: 'Clause 5.6',
    },
    'BaseURL@serviceLocation': {
        text: 'A string used to group BaseURL elements that point to the same logical service location (e.g., a specific CDN). This helps a client make intelligent failover or load-balancing decisions.',
        isoRef: 'Clause 5.6.2, Table 30',
    },
    Location: {
        text: 'Specifies an alternative URL where the complete, updated MPD can be retrieved. This is a key mechanism for redundancy and load balancing of manifest delivery.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    PatchLocation: {
        text: 'Specifies a URL for fetching an MPD patch document. This enables efficient live stream updates by allowing the client to download only the changes to the manifest instead of the full document.',
        isoRef: 'Clause 5.15.2',
    },
    'PatchLocation@ttl': {
        text: 'Time-To-Live in seconds. Specifies how long after the MPD publish time the patch document at this location is guaranteed to be available. After this time, a client should fall back to fetching the full MPD.',
        isoRef: 'Clause 5.15.2, Table 48',
    },

    // Program Information
    ProgramInformation: {
        text: 'Contains human-readable descriptive metadata about the Media Presentation, such as title, source, and copyright information.',
        isoRef: 'Clause 5.7',
    },
    'ProgramInformation@lang': {
        text: 'Specifies the language of the descriptive information in this element, using RFC 5646 codes.',
        isoRef: 'Clause 5.7.2, Table 31',
    },
    'ProgramInformation@moreInformationURL': {
        text: 'A URL pointing to a resource with more detailed information about the program.',
        isoRef: 'Clause 5.7.2, Table 31',
    },
    Title: {
        text: 'The human-readable title for the Media Presentation.',
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
        text: 'A Period represents a continuous segment of content on the timeline. Multiple Periods are concatenated to form the full presentation. They are commonly used to stitch content, such as inserting advertisements.',
        isoRef: 'Clause 5.3.2',
    },
    'Period@id': {
        text: 'A unique identifier for the Period. It is mandatory for "dynamic" MPDs to allow clients to track periods across manifest updates and avoid re-parsing unchanged periods.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@start': {
        text: 'The start time of this Period on the Media Presentation Timeline. For the first Period, it is typically "PT0S". For subsequent Periods, it can be calculated from the previous Period\'s duration if not specified.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@duration': {
        text: 'The duration of the Period in ISO 8601 format. If not present for the last period of a "static" presentation, the end of the presentation is implied. In a "dynamic" stream, its absence indicates the Period is ongoing.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@bitstreamSwitching': {
        text: 'When "true", this acts as a default for all contained AdaptationSets, indicating that bitstream switching is possible. This implies Segments can be concatenated across Representations without decoder re-initialization.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@xlink:href': {
        text: 'A URL pointing to an external XML document containing the definition of this Period. This allows for modular manifest creation, often used for dynamic ad insertion.',
        isoRef: 'Clause 5.5',
    },
    AssetIdentifier: {
        text: "Specifies a unique asset identifier for the Period's content. Periods with the same AssetIdentifier belong to the same logical asset, helping clients maintain context across interruptions like ad breaks.",
        isoRef: 'Clause 5.8.4.10',
    },

    // AdaptationSet Level
    AdaptationSet: {
        text: 'A set of interchangeable, encoded versions (Representations) of one or more media components. For example, a video AdaptationSet contains all available bitrates and resolutions for the video.',
        isoRef: 'Clause 5.3.3',
    },
    'AdaptationSet@id': {
        text: 'An optional but recommended unique identifier for the AdaptationSet within the Period.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@group': {
        text: 'Assigns the AdaptationSet to a group. A client should present at most one Representation from each non-zero group simultaneously (e.g., one video, one audio, one subtitle). A group value of 0 indicates a multiplexed, self-contained presentation.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@contentType': {
        text: 'Specifies the high-level media type for this set (e.g., "video", "audio", "text", "application"). This helps the client categorize available tracks.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@lang': {
        text: 'Specifies the language of the content in this set, using RFC 5646 codes (e.g., "en" for English, "es-419" for Latin American Spanish).',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@label': {
        text: 'A non-standard but commonly used attribute providing a human-readable text string for its parent element, which can be used for UI display. The standard way to provide this information is with a child <Label> element.',
        isoRef: 'See Clause 5.3.10 for standard <Label> element',
    },
    'AdaptationSet@mimeType': {
        text: 'The MIME type for all Representations in this set. This is a common attribute that can be overridden on a per-Representation basis.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@codecs': {
        text: 'A string identifying the codec(s) common to all Representations in this set, as per RFC 6381. This is a critical parameter for a client to determine if it can decode the content.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@width': {
        text: 'The width of the video display area in pixels, common to all Representations in this set. It may differ from the coded resolution if a non-square Picture Aspect Ratio (@par) is used.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@height': {
        text: 'The height of the video display area in pixels, common to all Representations in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@minBandwidth': {
        text: 'The minimum bandwidth of any Representation in this set, in bits per second. Informs the client of the range of bitrates available.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxBandwidth': {
        text: 'The maximum bandwidth of any Representation in this set, in bits per second. Informs the client of the range of bitrates available.',
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
    'AdaptationSet@frameRate': {
        text: 'The frame rate of the video, expressed as a fraction (e.g., "25/1"). This can be a common property for all video Representations in the set.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@minFrameRate': {
        text: 'The minimum frame rate of any video Representation in this set, expressed as a fraction.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxFrameRate': {
        text: 'The maximum frame rate of any video Representation in this set, expressed as a fraction.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@par': {
        text: 'The Picture Aspect Ratio for the video content (e.g., "16:9"), common to all Representations in the set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@selectionPriority': {
        text: "A priority for this AdaptationSet relative to others of the same media type. Higher numbers are preferred. Can guide a client's initial track selection logic.",
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@segmentAlignment': {
        text: 'If true, indicates that segment boundaries are time-aligned across all Representations in this set. This is a crucial property that greatly simplifies seamless ABR switching.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@subsegmentAlignment': {
        text: 'If true, indicates that subsegment boundaries (e.g., CMAF chunks) are time-aligned across Representations. This is essential for achieving low-latency switching.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@startWithSAP': {
        text: 'Specifies that media segments start with a Stream Access Point (SAP) of a certain type (typically 1 or 2). This property is fundamental for enabling seeking and switching at segment boundaries.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@subsegmentStartsWithSAP': {
        text: 'Specifies that subsegments start with a Stream Access Point (SAP), which is critical for efficient seeking and ultra-low-latency streaming where switching occurs mid-segment.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@bitstreamSwitching': {
        text: 'If true, guarantees that segments from different Representations in this set can be concatenated to form a single, conforming bitstream. This allows a client to switch quality levels without re-initializing the media decoder.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@initializationPrincipal': {
        text: 'A URL to a CMAF Principal Header that is sufficient to initialize any Representation in this Adaptation Set. It promotes efficiency by allowing a single initialization segment to cover all quality levels.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    ContentComponent: {
        text: 'Describes a single media component (e.g., a specific audio track or video layer) within an AdaptationSet that contains multiplexed content.',
        isoRef: 'Clause 5.3.4',
    },

    // Representation Level
    Representation: {
        text: 'A specific, deliverable, and encoded version of one or more media streams (e.g., video at a particular bitrate and resolution, or an audio track in a specific language). This is the fundamental unit for ABR switching.',
        isoRef: 'Clause 5.3.5',
    },
    'Representation@id': {
        text: 'A mandatory and unique identifier for the Representation within the Period. This ID is used in segment templates and for dependency tracking.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@bandwidth': {
        text: 'The required bandwidth in bits per second for this Representation. Based on a "leaky bucket" model, a client with this bandwidth can stream continuously if it maintains a buffer of at least @minBufferTime.',
        isoRef: 'Clause 5.3.5.2, Table 9 & Clause 5.3.5.4',
    },
    'Representation@qualityRanking': {
        text: 'An optional integer that specifies a quality ranking relative to other Representations in the same AdaptationSet. Lower values represent higher quality, guiding ABR heuristics.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@dependencyId': {
        text: 'A space-separated list of other Representation IDs that this Representation depends on for decoding. This is used for scalable codecs (e.g., SVC) where a higher layer depends on a base layer.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@associationId': {
        text: 'A space-separated list of Representation IDs with which this Representation is associated (e.g., a timed metadata track that describes a video track). The association is supplemental, not required for decoding.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@associationType': {
        text: 'Specifies the type of association for each ID in @associationId, using 4CC codes. For example, "cdsc" indicates a content description relationship.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@mediaStreamStructureId': {
        text: 'Groups Representations that share a common stream structure (e.g., identical SAP timing), enabling more complex switching scenarios such as between Open GOP streams.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@codecs': {
        text: 'A mandatory string identifying the codec(s), profile, and level used in this Representation, as per RFC 6381. This is a primary parameter for a client to check decoding capability.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@mimeType': {
        text: 'The MIME type for this Representation. This must be present if not inherited from the AdaptationSet.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@containerProfiles': {
        text: "Specifies container profiles essential for processing the Representation. Crucial when using CMAF to indicate conformance to a structural brand like 'cmfc' or 'cmf2'.",
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
        text: 'The frame rate of the video, typically expressed as a fraction (e.g., "30000/1001").',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@sar': {
        text: 'The Sample Aspect Ratio of the video (e.g., "1:1" for square pixels), defining the shape of a pixel.',
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
    'Representation@startWithSAP': {
        text: 'Specifies that media segments start with a Stream Access Point (SAP) of a certain type (typically 1 or 2). This property is fundamental for enabling seeking and switching at segment boundaries.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    SubRepresentation: {
        text: 'Describes a dependent part of a Representation that can be extracted, such as a lower frame-rate track for trick modes or a specific audio channel from a multiplexed stream.',
        isoRef: 'Clause 5.3.6',
    },

    // Segment Info Level
    SegmentBase: {
        text: 'Provides default segment information, typically used for single-segment Representations where the URL is given by a BaseURL and the index is described by @indexRange.',
        isoRef: 'Clause 5.3.9.2',
    },
    'SegmentBase@timescale': {
        text: 'The number of time units that pass in one second (e.g., 90000 for video). This timescale provides the denominator for time and duration values within this segment information context, overriding any higher-level timescales.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentBase@indexRange': {
        text: "Specifies the byte range within the media segment file that contains the Segment Index ('sidx') box, enabling a client to fetch the index without downloading the entire segment.",
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentBase@indexRangeExact': {
        text: 'If true, the @indexRange is precise. If false (default), the client may need to parse the media to find the exact end of the index, as the range may be an overestimate.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    Initialization: {
        text: "Describes the Initialization Segment for this Representation. This segment contains metadata required to initialize the media decoder, such as the 'moov' box in ISOBFF.",
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'Initialization@range': {
        text: "The byte range of the Initialization Segment within the resource specified by the parent Representation's BaseURL.",
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    SegmentList: {
        text: 'Provides an explicit list of Segment URLs via SegmentURL elements. It is typically used for VOD content where segment locations are static but not predictable by a template.',
        isoRef: 'Clause 5.3.9.3',
    },
    SegmentURL: {
        text: 'Specifies the URL and optional byte range for a single Media Segment within a SegmentList.',
        isoRef: 'Clause 5.3.9.3.2, Table 19',
    },
    'SegmentURL@mediaRange': {
        text: 'The byte range of the media segment within the resource specified by the @media attribute (or inherited BaseURL).',
        isoRef: 'Clause 5.3.9.3.2, Table 19',
    },
    SegmentTemplate: {
        text: 'Defines a template for generating Segment URLs dynamically. This is the most common method for live and large-scale VOD, using identifiers like $Number$, $Time$, and $RepresentationID$.',
        isoRef: 'Clause 5.3.9.4',
    },
    'SegmentTemplate@timescale': {
        text: 'The number of time units that pass in one second (e.g., 90000 for video). This timescale provides the denominator for all time and duration values within this template context.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentTemplate@presentationTimeOffset': {
        text: "An offset in timescale units that aligns the segment's internal media timeline with the Period's timeline. This is critical for synchronizing different tracks and handling content stitching.",
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentTemplate@initialization': {
        text: 'A template for the URL of the Initialization Segment. It may contain identifiers like $RepresentationID$ and $Bandwidth$.',
        isoRef: 'Clause 5.3.9.4.2, Table 20',
    },
    'SegmentTemplate@media': {
        text: 'A template for generating the URLs of the Media Segments. Typically contains $Time$ (for SegmentTimeline) or $Number$ (for constant duration segments).',
        isoRef: 'Clause 5.3.9.4.2, Table 20',
    },
    'SegmentTemplate@duration': {
        text: 'Specifies the constant duration of each segment in timescale units. This is used in conjunction with the $Number$ identifier in the @media template to calculate segment start times.',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    'SegmentTemplate@startNumber': {
        text: 'The number to be used for the first Media Segment in this Representation. It defines the starting value for the $Number$ identifier.',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    'SegmentTemplate@endNumber': {
        text: 'An optional attribute specifying the number of the last Media Segment in this Representation for the Period.',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    'SegmentTemplate@availabilityTimeOffset': {
        text: 'An offset in seconds applied to the segment availability time. For low-latency, this allows segments (or chunks) to be advertised before they are fully available on the server.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentTemplate@availabilityTimeComplete': {
        text: 'If false, indicates that a segment might not be fully available at its announced availability time. This is a key signal for a client to use chunked transfer mode for low-latency streaming.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    SegmentTimeline: {
        text: 'Provides an explicit, ordered list of segments with potentially variable durations via <S> elements. It is a powerful alternative to the fixed @duration attribute, especially for live content or content with ads.',
        isoRef: 'Clause 5.3.9.6',
    },
    S: {
        text: 'A Segment Timeline entry. Defines a series of one or more contiguous segments that share the same duration.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@t': {
        text: 'The presentation start time of the first segment in this series, in units of the @timescale. If omitted, it follows contiguously from the previous <S> element.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@d': {
        text: 'The duration of each segment in this series, in units of the @timescale.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@r': {
        text: 'The repeat count. A value of "N" means there are a total of N+1 segments in this contiguous series. A value of -1 indicates the segment duration repeats until the end of the Period or the next MPD update.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@n': {
        text: 'The segment number of the first segment in this series. Can be used to signal discontinuities in the sequence of segment numbers.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },

    // Events & Timing
    EventStream: {
        text: 'An element within a Period that contains a sequence of timed events signaled directly in the MPD (out-of-band).',
        isoRef: 'Clause 5.10.2',
    },
    InbandEventStream: {
        text: 'Signals the presence of an event stream multiplexed within the media segments themselves (e.g., as `emsg` boxes). The client must parse the segments to extract these events.',
        isoRef: 'Clause 5.10.3',
    },
    'InbandEventStream@schemeIdUri': {
        text: 'A URI identifying the scheme for the in-band events. This tells the client what kind of events to look for (e.g., "urn:scte:scte35:2013:bin" for SCTE-35 ad markers).',
        isoRef: 'Clause 5.10.3.2',
    },
    'InbandEventStream@value': {
        text: 'A value that, in combination with @schemeIdUri, provides a unique identifier for the event stream. The semantics of this value are defined by the scheme owner.',
        isoRef: 'Clause 5.10.2.2, Table 38',
    },
    UTCTiming: {
        text: 'Provides a method for clients to synchronize their wall-clocks with the server. This is crucial for consistent live stream startup and calculating segment availability accurately.',
        isoRef: 'Clause 5.8.4.11',
    },
    'UTCTiming@schemeIdUri': {
        text: 'Identifies the clock synchronization method, e.g., "urn:mpeg:dash:utc:http-xsdate:2014" for an HTTP endpoint returning an ISO 8601 date, or "urn:mpeg:dash:utc:direct:2014" for a direct value.',
        isoRef: 'Clause 5.8.5.7, Table 35',
    },
    'UTCTiming@value': {
        text: 'The value associated with the synchronization scheme, typically a URL to a time server or the direct time value itself.',
        isoRef: 'Clause 5.8.5.7, Table 35',
    },
    LeapSecondInformation: {
        text: 'Provides information about leap seconds, allowing a client to perform accurate time calculations across leap second events without relying on an external, updated time source.',
        isoRef: 'Clause 5.13',
    },

    // Descriptors
    Accessibility: {
        text: 'Provides information about accessibility features for the content, such as audio descriptions or closed captions for the hard-of-hearing. It consists of a scheme and a value.',
        isoRef: 'Clause 5.8.4.3',
    },
    'Accessibility@schemeIdUri': {
        text: 'A URI that identifies the classification scheme for the accessibility feature. For example, "urn:tva:metadata:cs:AudioPurposeCS:2007" for audio descriptions.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'Accessibility@value': {
        text: 'A value whose meaning is defined by the scheme. For the audio purpose scheme, "6" indicates audio description for the visually impaired.',
        isoRef: 'Clause 5.8.2, Table 32 & TV-Anytime Content Referencing',
    },
    AudioChannelConfiguration: {
        text: 'Specifies the audio channel layout (e.g., stereo, 5.1 surround sound), allowing a client to select tracks compatible with its output hardware.',
        isoRef: 'Clause 5.8.4.7',
    },
    'AudioChannelConfiguration@schemeIdUri': {
        text: 'A URI that identifies the scheme used to define the audio channel configuration. A common value is "urn:mpeg:dash:23003:3:audio_channel_configuration:2011".',
        isoRef: 'Clause 5.8.5.4',
    },
    'AudioChannelConfiguration@value': {
        text: 'A value whose meaning is defined by the scheme. For the standard MPEG scheme, this is an integer representing the number of channels (e.g., "2" for stereo).',
        isoRef: 'Clause 5.8.5.4',
    },
    ContentProtection: {
        text: 'The central element for signaling content protection. It contains information about the DRM system(s) and encryption scheme(s) used, enabling a client to perform license acquisition.',
        isoRef: 'Clause 5.8.4.1',
    },
    'ContentProtection@schemeIdUri': {
        text: 'A URI that uniquely identifies the content protection scheme. For DRM systems, this is typically a UUID (e.g., for Widevine, PlayReady, or FairPlay). For encryption schemes, it may be "urn:mpeg:dash:mp4protection:2011".',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@value': {
        text: 'An optional string providing additional scheme-specific information. For Common Encryption, this often specifies the 4CC of the encryption scheme, like "cenc" or "cbcs".',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@ref': {
        text: 'References another ContentProtection descriptor by its @refId. This allows this element to inherit all attributes and child elements from the referenced "source" descriptor, promoting manifest efficiency.',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@refId': {
        text: 'A unique identifier for this ContentProtection descriptor. It can be referenced by other ContentProtection elements using the @ref attribute to avoid duplication.',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@default_KID': {
        text: 'The default Key ID for the content, as a UUID string without hyphens. This is the primary identifier used to request the correct decryption key from a license server.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    'ContentProtection@cenc:default_KID': {
        text: 'The default Key ID for the content, as a UUID string without hyphens. This is the primary identifier used to request the correct decryption key from a license server.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    'ContentProtection@robustness': {
        text: 'Specifies the minimum required security level for the client decryptor (e.g., a string indicating software vs. hardware DRM). A client can use this to filter out content it is not authorized to play.',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    pssh: {
        text: 'A Base64-encoded Protection System Specific Header (PSSH) box. This opaque blob contains initialization data required by a specific DRM system to generate a license request.',
        isoRef: 'ISO/IEC 23001-7',
    },
    'cenc:pssh': {
        text: 'A Base64-encoded Protection System Specific Header (PSSH) box. This opaque blob contains initialization data required by a specific DRM system (identified by the `cenc` namespace) to generate a license request.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    EssentialProperty: {
        text: 'Specifies a property that is essential for processing the parent element. If a client does not understand the scheme of an EssentialProperty, it MUST ignore the entire parent element (e.g., the AdaptationSet).',
        isoRef: 'Clause 5.8.4.8',
    },
    'EssentialProperty@schemeIdUri': {
        text: 'A URI that uniquely identifies the scheme for this essential property. A client must understand this scheme to process the parent element.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'EssentialProperty@value': {
        text: 'A scheme-specific value. Its meaning is defined by the specification associated with the @schemeIdUri.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    SupplementalProperty: {
        text: 'Specifies supplemental information that is not essential for playback but may be used by the client for optimization or enhanced functionality. If a client does not understand the scheme, it can safely ignore this descriptor.',
        isoRef: 'Clause 5.8.4.9',
    },
    'SupplementalProperty@schemeIdUri': {
        text: 'A URI that uniquely identifies the scheme for this supplemental property. A client can safely ignore this descriptor if the scheme is not understood.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'SupplementalProperty@value': {
        text: 'A scheme-specific value. Its meaning is defined by the specification associated with the @schemeIdUri.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    Label: {
        text: 'Provides a human-readable text string for its parent element, which can be used for UI display (e.g., showing "1080p (Best)" or "English AAC Stereo" in a track selector).',
        isoRef: 'Clause 5.3.10',
    },
    Role: {
        text: 'Describes the role or purpose of an AdaptationSet, helping the client automatically select the appropriate track (e.g., "main", "alternate", "commentary", "subtitle").',
        isoRef: 'Clause 5.8.4.2',
    },
    'Role@schemeIdUri': {
        text: 'A URI that identifies the scheme used to define the role. The default DASH scheme is "urn:mpeg:dash:role:2011".',
        isoRef: 'Clause 5.8.5.5',
    },
    'Role@value': {
        text: 'A string value whose meaning is defined by the scheme. For the default DASH scheme, common values are "main", "alternate", "supplementary", "commentary", "dub", and "caption".',
        isoRef: 'Clause 5.8.5.5, Table 34',
    },

    // Service Description Level (Annex K)
    ServiceDescription: {
        text: 'Provides guidance to the client on how the service provider expects the service to be consumed. It allows the provider to influence client heuristics for latency, playback rate, and quality selection.',
        isoRef: 'Annex K.4',
    },
    'ServiceDescription@id': {
        text: 'A unique identifier for this ServiceDescription element within the scope of the MPD.',
        isoRef: 'Annex K.4.2.1, Table K.5',
    },
    Latency: {
        text: 'Specifies latency targets for the service, including minimum, maximum, and a target live latency. This is a key element for tuning low-latency performance.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@target': {
        text: "The service provider’s preferred presentation latency in milliseconds, measured against a specified ProducerReferenceTime. This guides a low-latency client's target buffer level.",
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@min': {
        text: 'The service provider’s indicated minimum presentation latency in milliseconds. A client should not present media earlier than this latency.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@max': {
        text: 'The service provider’s indicated maximum presentation latency in milliseconds. A client should not present media if its latency exceeds this value.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@referenceId': {
        text: 'Identifies the ProducerReferenceTime element in the MPD against which this latency target is measured.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    PlaybackRate: {
        text: 'Specifies an acceptable range for playback rate adjustment (e.g., 0.98 to 1.02). This allows a client to slightly speed up or slow down playback to dynamically manage and correct its position relative to the target latency.',
        isoRef: 'Annex K.4.2.3, Table K.7',
    },
    'PlaybackRate@min': {
        text: 'The minimum playback rate (relative to normal speed 1.0) that the client may use for automatic latency adjustments.',
        isoRef: 'Annex K.4.2.3, Table K.7',
    },
    'PlaybackRate@max': {
        text: 'The maximum playback rate (relative to normal speed 1.0) that the client may use for automatic latency adjustments.',
        isoRef: 'Annex K.4.2.3, Table K.7',
    },
    ProducerReferenceTime: {
        text: 'Supplies a correlation between media timestamps and a real-world wall-clock time at the point of production (e.g., encoding). This is essential for latency calculation and control.',
        isoRef: 'Clause 5.12',
    },
    'ProducerReferenceTime@id': {
        text: 'A unique identifier for this ProducerReferenceTime instance, which can be referenced by a Latency element.',
        isoRef: 'Clause 5.12.2, Table 45',
    },
    'ProducerReferenceTime@type': {
        text: 'Specifies the point in the production chain where the timestamp was captured (e.g., "encoder", "captured").',
        isoRef: 'Clause 5.12.2, Table 45',
    },
    'ProducerReferenceTime@wallClockTime': {
        text: 'The wall-clock time (UTC) at the point of capture specified by the "type" attribute.',
        isoRef: 'Clause 5.12.2, Table 45',
    },
    'ProducerReferenceTime@presentationTime': {
        text: "The media presentation time that corresponds to the specified 'wallClockTime'.",
        isoRef: 'Clause 5.12.2, Table 45',
    },

    // 2022 Spec Additions & Refinements
    InitializationSet: {
        text: 'Defines a common set of properties (e.g., codecs, resolution) for a media type that is guaranteed to be available across different Periods. This allows a client to determine playback capabilities for the entire presentation upfront.',
        isoRef: 'Clause 5.3.12',
    },
    Preselection: {
        text: 'Specifies a curated combination of Adaptation Sets that form a specific, complete user experience (e.g., a main audio track plus a commentary track, or multiple audio objects for immersive sound). It simplifies track selection for complex content.',
        isoRef: 'Clause 5.3.11',
    },
    Resync: {
        text: 'Provides information on resynchronization points within Segments. This is a powerful feature for low-latency streaming and efficient seeking, as it allows a client to begin processing a segment from a point other than the beginning.',
        isoRef: 'Clause 5.3.13',
    },
    ExtendedBandwidth: {
        text: 'Provides a more detailed and accurate bandwidth model for Variable Bitrate (VBR) content. It specifies bandwidth requirements over different buffer time windows, allowing for more intelligent ABR decisions.',
        isoRef: 'Clause 5.3.5.6',
    },
    FailoverContent: {
        text: 'Signals time ranges within the content that have been replaced by failover material (e.g., a slate or color bars) due to an upstream error. This allows a client to know a segment is "bad" and switch to an alternate Representation if available.',
        isoRef: 'Clause 5.3.9.7',
    },
    OutputProtection: {
        text: 'Specifies the required output protection scheme and level (e.g., HDCP 2.2) necessary to render the content on an external display. A client can use this to pre-emptively filter out content it cannot display.',
        isoRef: 'Clause 5.8.4.12',
    },
};
