/**
 * A comprehensive mapping of DASH MPD element and attribute names to their descriptions and ISO/IEC 23009-1:2022 standard references.
 * This structure provides rich, context-aware tooltips for developers and engineers, explaining the architectural implications of each field.
 * Format: 'ElementName' for elements, 'ElementName@attributeName' for attributes.
 */
export const dashTooltipData = {
    // ==========================================================================================
    // MPD Level
    // ==========================================================================================
    MPD: {
        text: "The root XML element representing the Media Presentation Description. It serves as the comprehensive index for the stream, defining the temporal alignment, available media components (Adaptation Sets), and the adaptive switching constraints required for the client to construct the playback session.",
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@schemaLocation': {
        text: 'Provides a hint to the XML processor regarding the physical location of schema documents. It pairs a namespace URI with a URI where the schema for that namespace can be found. This attribute is primarily used for validation purposes to ensure the MPD conforms to the XML structure defined in ISO/IEC 23009-1 Annex B.',
        isoRef: 'Clause 5.2.2 & W3C XML Schema Part 1',
    },
    'MPD@id': {
        text: 'An optional string identifier for the Media Presentation. While not strictly required for playback, it is essential for identifying the presentation context when using MPD Anchors, MPD Patching, or reporting metrics to an analytics server.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@profiles': {
        text: 'A mandatory list of URNs indicating the specific DASH profiles (e.g., ISO-BMFF Live, CMAF) to which this manifest conforms. This acts as a capability handshake; the client checks this list to ensure it supports the required feature set before attempting to parse the rest of the document.',
        isoRef: 'Clause 8.1 & 5.3.1.2, Table 3',
    },
    'MPD@type': {
        text: 'Specifies whether the Media Presentation is `static` (finite duration, VOD) or `dynamic` (continually evolving, Live). This determines the client\'s update logic: dynamic profiles require periodic refreshing of the MPD to discover new segments.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@availabilityStartTime': {
        text: 'Defines the zero point (epoch) on the wall-clock timeline for the Media Presentation. In dynamic profiles, all segment availability times are calculated as offsets relative to this timestamp, anchoring the stream to real-world time.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@availabilityEndTime': {
        text: "The UTC timestamp marking the absolute end of the presentation's availability. After this time, the client should assume the content is no longer accessible. Commonly used to signal the scheduled end of a live event.",
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@publishTime': {
        text: 'The wall-clock time when this specific instance of the MPD was generated. For dynamic streams, the client uses this to detect if it has received a newer version of the manifest compared to one it might have cached.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@mediaPresentationDuration': {
        text: 'The total duration of the content. Mandatory for static (VOD) profiles. In dynamic profiles, it may be present to signal a known fixed duration for an ongoing live event (e.g., a 90-minute soccer match).',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@minimumUpdatePeriod': {
        text: 'Governs the polling frequency for dynamic manifests. It specifies the minimum amount of time the client must wait after fetching an MPD before requesting an update. Setting this too low increases server load; too high delays the discovery of new segments.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@minBufferTime': {
        text: 'Specifies the minimum amount of data the client should buffer before starting playback. This value serves as a contract for the initial buffering logic to ensure continuous playback under ideal network conditions.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@timeShiftBufferDepth': {
        text: 'Defines the duration of the time shifting window (DVR window) available for the presentation. In dynamic streams, this value indicates how far back from the live edge the content is available on the server; segments older than this window are implicitly deleted.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@suggestedPresentationDelay': {
        text: 'The recommended latency delay behind the live edge. This provides a safety buffer against network jitter and segment production variance. Clients aiming for stability over low latency should respect this value.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@maxSegmentDuration': {
        text: 'The maximum duration of any single segment in the presentation. Clients use this for buffer allocation sizing and to determine the worst-case request frequency.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    'MPD@maxSubsegmentDuration': {
        text: 'The maximum duration of a subsegment (e.g., a CMAF Chunk). Critical for Ultra-Low Latency (ULL) scenarios, as it helps the client estimate the frequency of incoming chunks during HTTP chunked transfer.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },

    // ==========================================================================================
    // XML Schema / Namespace Attributes
    // ==========================================================================================
    'MPD@xmlns': {
        text: 'The default XML Namespace. Must be set to "urn:mpeg:dash:schema:mpd:2011" to identify the document structure as a valid DASH MPD.',
        isoRef: 'Clause 5.2.2',
    },
    'MPD@xmlns:xsi': {
        text: 'The XML Schema Instance namespace declaration. It allows the document to use attributes like `xsi:schemaLocation` to link to the XSD file for validation purposes.',
        isoRef: 'W3C XML Schema Part 1',
    },
    'MPD@xsi:schemaLocation': {
        text: 'Pairs the namespace URI with the actual URL of the XSD schema file. While ignored by most playback engines, it is essential for validators to verify the MPD structure.',
        isoRef: 'Clause 5.2.2 & W3C XML Schema Part 1',
    },
    'MPD@xmlns:cenc': {
        text: 'The Common Encryption (CENC) namespace declaration. Required when using ContentProtection elements that utilize CENC-specific attributes like `cenc:default_KID` or `cenc:pssh`.',
        isoRef: 'Clause 5.8.5.2.2',
    },
    'MPD@xmlns:xlink': {
        text: 'The XLink namespace declaration. Required if the MPD uses remote elements (e.g., dynamic ad insertion where a Period is resolved from an external URL) via `xlink:href`.',
        isoRef: 'Clause 5.5.2, Table 29',
    },

    // ==========================================================================================
    // BaseURL & Locations
    // ==========================================================================================
    BaseURL: {
        text: 'Defines a base URL that is prepended to relative URLs for segments and resources. BaseURLs can be defined at multiple levels (MPD, Period, AdaptationSet) and are resolved hierarchically to construct the absolute URI.',
        isoRef: 'Clause 5.6',
    },
    'BaseURL@serviceLocation': {
        text: 'A string identifier that groups BaseURLs resolving to the same physical service or CDN. This enables client-side load balancing/failover; if a request fails, the client should switch to a BaseURL with a different `serviceLocation`.',
        isoRef: 'Clause 5.6.2, Table 30',
    },
    'BaseURL@priority': {
        text: '(DVB Extension) Specifies the priority of the BaseURL. Lower values indicate higher priority. Clients should attempt highest priority locations first.',
        isoRef: 'ETSI TS 103 285 / DVB-DASH 10.8.2.1',
    },
    'BaseURL@weight': {
        text: '(DVB Extension) Specifies the relative weight of the BaseURL for load balancing among URLs of the same priority.',
        isoRef: 'ETSI TS 103 285 / DVB-DASH 10.8.2.1',
    },
    'BaseURL@timeShiftBufferDepth': {
        text: 'Allows overriding the MPD-level timeShiftBufferDepth for specific base URLs. This is useful if different CDNs or storage tiers have different retention policies for the DVR window.',
        isoRef: 'Clause 5.6.2, Table 30',
    },
    Location: {
        text: 'Defines the canonical absolute URL for the MPD. In dynamic scenarios, the client uses this URL for all future manifest update requests, ignoring the URL originally used to fetch the first MPD.',
        isoRef: 'Clause 5.3.1.2, Table 3',
    },
    PatchLocation: {
        text: 'Points to an MPD Patch document (mpp). Instead of redownloading the full XML manifest, the client downloads a small XML patch diff, reducing bandwidth overhead for manifest updates in live streams.',
        isoRef: 'Clause 5.15.2',
    },
    'PatchLocation@ttl': {
        text: "Time-To-Live (seconds). Indicates how long the patch file is valid. If the client's last update was older than this TTL, it must fall back to downloading the full MPD instead of the patch.",
        isoRef: 'Clause 5.15.2, Table 48',
    },

    // ==========================================================================================
    // Program Information
    // ==========================================================================================
    ProgramInformation: {
        text: 'A container for descriptive metadata regarding the content. This is strictly for display/informational purposes (e.g., "Now Playing" UI) and does not affect playback logic.',
        isoRef: 'Clause 5.7',
    },
    'ProgramInformation@lang': {
        text: 'The RFC 5646 language tag for the descriptive text within this element. Allows the manifest to carry localized metadata (e.g., English title vs. Spanish title).',
        isoRef: 'Clause 5.7.2, Table 31',
    },
    'ProgramInformation@moreInformationURL': {
        text: "A URL pointing to an external website or resource offering extended details about the content (e.g., a movie's IMDb page or a broadcaster's program guide).",
        isoRef: 'Clause 5.7.2, Table 31',
    },
    Title: {
        text: 'The human-readable title of the content.',
        isoRef: 'Clause 5.7.2, Table 31',
    },
    Source: {
        text: 'The name of the content distributor, publisher, or rights holder.',
        isoRef: 'Clause 5.7.2, Table 31',
    },
    Copyright: {
        text: 'The copyright statement associated with the media presentation.',
        isoRef: 'Clause 5.7.2, Table 31',
    },

    // ==========================================================================================
    // Period Level
    // ==========================================================================================
    Period: {
        text: 'A self-contained time interval within the Media Presentation. Periods partition the timeline, allowing for changes in the set of available Adaptation Sets (e.g., switching from main content to an ad break). Key properties like the base timeline often reset at Period boundaries.',
        isoRef: 'Clause 5.3.2',
    },
    'Period@id': {
        text: 'A unique identifier for the Period. In dynamic profiles, this is mandatory and is used to track Period identity across manifest updates, allowing the client to detect if a Period has been removed or if new ones have been added.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@start': {
        text: 'Specifies the start time of the Period relative to the MPD `availabilityStartTime`. This anchors the Period\'s internal timeline to the presentation time.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@duration': {
        text: 'The duration of the Period. If not present in a dynamic presentation, the Period is considered open-ended (the "Live Edge") and continues until a new MPD update signals its end or a new Period start.',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@bitstreamSwitching': {
        text: 'A default flag for the Period. If true, it asserts that all AdaptationSets within satisfy bitstream switching requirements (concatenation of segments from different Representations results in a valid bitstream).',
        isoRef: 'Clause 5.3.2.2, Table 4',
    },
    'Period@xlink:href': {
        text: 'Indicates that the content of the Period is defined in an external resource (Remote Period). The client must resolve this XLink reference to fetch the actual Period definition. This is commonly used for server-side ad insertions where ad breaks are essentially external "pointer" periods.',
        isoRef: 'Clause 5.5',
    },
    AssetIdentifier: {
        text: 'A descriptor used to identify the logical content "Asset" (e.g., a specific movie ID). If a Period is interrupted by ads, the subsequent Period resuming the content will share the same AssetIdentifier, telling the client it is the same content.',
        isoRef: 'Clause 5.8.4.10',
    },
    'AssetIdentifier@schemeIdUri': {
        text: 'Identifies the scheme used for the asset identifier (e.g., "urn:eidr").',
        isoRef: 'Clause 5.8.4.10',
    },
    'AssetIdentifier@value': {
        text: 'The value of the asset identifier.',
        isoRef: 'Clause 5.8.4.10',
    },

    // ==========================================================================================
    // AdaptationSet Level
    // ==========================================================================================
    AdaptationSet: {
        text: 'Encapsulates a set of interchangeable Representations that describe the same content component (e.g., all video tracks of different qualities). The client\'s switching logic operates primarily within an Adaptation Set to adapt to changing network conditions.',
        isoRef: 'Clause 5.3.3',
    },
    'AdaptationSet@id': {
        text: 'Unique identifier for the AdaptationSet. It allows correlating tracks across Period boundaries (Period Continuity) or linking audio tracks to video tracks.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@group': {
        text: 'An identifier used to group Adaptation Sets that can be rendered simultaneously. The client is expected to select one Adaptation Set from each distinct group (e.g., one from the "Video" group and one from the "Audio" group) to form the presentation.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@contentType': {
        text: 'Explicitly declares the media type contained in the set (e.g., "video", "audio", "text"). This helps the client filter and select tracks based on capabilities or user intent without needing to inspect deep codec strings.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@lang': {
        text: 'Specifies the language of the content using RFC 5646 codes. This is critical for the client to expose correct audio/subtitle selection options to the user.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@mimeType': {
        text: 'Describes the MIME type (container format) for the Representations in this set (e.g., "video/mp4", "audio/webm"). The client uses this to determine if it has the necessary demuxer components to process the stream.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@codecs': {
        text: 'Defines the codecs present in the media stream (RFC 6381). This string allows the client to query the underlying hardware or decoder to verify support for the specific profile and level (e.g., HEVC Main10) before attempting playback.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@width': {
        text: 'Horizontal resolution. If present here, it implies all Representations in the set share this width.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@height': {
        text: 'Vertical resolution. If present here, it implies all Representations in the set share this height.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@minBandwidth': {
        text: 'The lowest bandwidth value found among the contained Representations. Useful for high-level filtering (e.g., "don\'t select this 4K set on a 3G connection").',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxBandwidth': {
        text: 'The highest bandwidth value found among the contained Representations. Used to gauge the maximum network requirement for this media component.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@minWidth': {
        text: 'The smallest video width available in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxWidth': {
        text: 'The largest video width available in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@minHeight': {
        text: 'The smallest video height available in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxHeight': {
        text: 'The largest video height available in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@frameRate': {
        text: 'The video frame rate (e.g., "30000/1001" or "60"). If defined here, all Representations share this rate.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@minFrameRate': {
        text: 'The minimum frame rate available in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@maxFrameRate': {
        text: 'The maximum frame rate available in this set.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@par': {
        text: 'Picture Aspect Ratio (e.g., "16:9"). Indicates the aspect ratio of the *display* area, which may differ from the resolution ratio if non-square pixels are used.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@sar': {
        text: 'Sample Aspect Ratio. Defines the aspect ratio of the individual pixels (e.g. 1:1 for square, 12:11 for NTSC).',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@scanType': {
        text: 'Indicates the scan type of the video (e.g. "progressive", "interlaced").',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@audioSamplingRate': {
        text: 'The default audio sampling rate (e.g. 48000) for all Representations in this AdaptationSet.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@selectionPriority': {
        text: "A hint for the client's initial track selection. If multiple AdaptationSets match the user's criteria (e.g., Language=English), the one with the higher priority should be chosen.",
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@segmentAlignment': {
        text: 'If set to "true", this guarantees that segment boundaries are time-aligned across all Representations in the Adaptation Set. This alignment is a prerequisite for seamless bitrate switching, ensuring that a switch at segment N does not result in a time gap or overlap.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@subsegmentAlignment': {
        text: 'If "true", guarantees that Subsegments (e.g., CMAF Chunks) are aligned across Representations. This is critical for low-latency ABR, allowing quality switching even within a segment.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@startWithSAP': {
        text: 'Indicates the Stream Access Point (SAP) type at the start of segments. Value "1" or "2" means every segment starts with an IDR frame (clean random access point), enabling simple cutting/splicing and seeking.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'AdaptationSet@subsegmentStartsWithSAP': {
        text: 'Indicates if Subsegments start with a SAP. Essential for low-latency playback, ensuring the player can start decoding immediately upon receiving a new chunk.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@bitstreamSwitching': {
        text: 'If "true", segments from different Representations can be concatenated directly (appended to the source buffer) without resetting the decoder. This is vital for smooth ABR transitions.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@initializationPrincipal': {
        text: 'Specifies a URL to a "Principal" Initialization Segment (typically the highest quality one) that acts as a superset for decoding all Representations in the set. Used to optimize initialization overhead.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@initializationSetRef': {
        text: 'References a set of global Initialization properties (InitializationSet) defined at the MPD level. Allows sharing common initialization data (e.g. PSSH) across multiple AdaptationSets.',
        isoRef: 'Clause 5.3.3.2, Table 5',
    },
    'AdaptationSet@label': {
        text: 'A commonly used (though non-standard) attribute providing a human-readable title for the Adaptation Set (e.g., "Director\'s Commentary"), often used by players to populate track selection menus. The ISO/IEC 23009-1 standard prescribes using the <Label> child element for this purpose.',
        isoRef: 'See Clause 5.3.10 for standard <Label> element',
    },
    ContentComponent: {
        text: 'Used when an AdaptationSet contains multiplexed content (e.g., Audio+Video in one file). This describes the individual components inside the multiplex.',
        isoRef: 'Clause 5.3.4',
    },
    ContentPopularityRate: {
        text: 'Provides a popularity ranking for the AdaptationSet, intended to help CDNs or clients prioritize caching or pre-fetching of specific content components (e.g., the most popular camera angle).',
        isoRef: 'Clause 5.14 & Table 47',
    },

    // ==========================================================================================
    // Representation Level
    // ==========================================================================================
    Representation: {
        text: 'A single encoded version of the content with specific properties (bandwidth, resolution, codec). The client selects one Representation at a time to play, dynamically switching to others in the same Adaptation Set to optimize quality against network constraints.',
        isoRef: 'Clause 5.3.5',
    },
    'Representation@id': {
        text: 'A mandatory unique identifier for the Representation. This ID is often used as a substitution variable (`$RepresentationID$`) in `SegmentTemplate` patterns to generate unique URLs for segments belonging to this track.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@bandwidth': {
        text: 'Specifies the nominal bitrate of the Representation in bits per second. This is the primary metric used by the Adaptive Bitrate (ABR) algorithm to determine if the network throughput is sufficient to support this quality level.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@qualityRanking': {
        text: 'An optional integer indicating the subjective quality ranking of the Representation (lower value means higher quality). This assists the client in choosing between Representations that might have similar bitrates but different visual quality (e.g., efficient AV1 vs legacy H.264).',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@dependencyId': {
        text: 'Signals that this Representation depends on another (e.g., a Scalable Video Coding enhancement layer depends on the base layer). The client must download the dependency first.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@associationId': {
        text: 'Links this Representation to another non-dependent track (e.g., a "commentary" audio track associated with the "main" video).',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@associationType': {
        text: 'Defines the nature of the association declared in @associationId (e.g., "cdsc" for content description).',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@mediaStreamStructureId': {
        text: 'Used to identify Representations that share the exact same decoding dependencies structure (e.g. Open-GOP structure). If these IDs match, the client can perform Open-GOP switching.',
        isoRef: 'Clause 5.3.5.2, Table 9',
    },
    'Representation@codecs': {
        text: 'Specific codec parameters (RFC 6381). If the AdaptationSet defines a generic codec family, this attribute specifies the exact profile/level for this track.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@mimeType': {
        text: 'Overrides the AdaptationSet MIME type. Rarely used unless the set contains mixed formats (not recommended).',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@containerProfiles': {
        text: 'Specifies brands or profiles of the container format. Crucial for CMAF (e.g., "cmfc" for common media file format) to indicate structural conformance.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@width': {
        text: 'The horizontal resolution of this specific Representation.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@height': {
        text: 'The vertical resolution of this specific Representation.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@frameRate': {
        text: 'The frame rate of this specific Representation.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@sar': {
        text: 'Sample Aspect Ratio for this Representation.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@audioSamplingRate': {
        text: 'The audio sampling rate (e.g., 48000) for this specific track.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@scanType': {
        text: 'Indicates "progressive" or "interlaced" scanning.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    'Representation@startWithSAP': {
        text: 'Overrides the AdaptationSet SAP configuration. Indicates if segments in this specific track start with a random access point.',
        isoRef: 'Clause 5.3.7.2, Table 14',
    },
    SubRepresentation: {
        text: 'Describes a subset of the Representation that is independently decodable (e.g., the I-frames of a video track used for "trick mode" fast-forwarding, or a specific audio channel in a multiplex).',
        isoRef: 'Clause 5.3.6',
    },
    ExtendedBandwidth: {
        text: 'Allows defining a more complex bandwidth model for VBR (Variable Bitrate) content. It allows the manifest to declare different required bandwidths depending on the target buffer size.',
        isoRef: 'Clause 5.3.5.6',
    },
    Switching: {
        text: 'Explicitly defines valid switching points within the Representation, useful when segments do not strictly align or when bitstream switching is restricted to specific intervals.',
        isoRef: 'Clause 5.3.3.4',
    },
    RandomAccess: {
        text: ' explicitly signals the position of random access points (RAP) and their type (e.g., Open vs Closed GOP) to assist the client in efficient seeking.',
        isoRef: 'Clause 5.3.5.5',
    },

    // ==========================================================================================
    // Segment Info Level
    // ==========================================================================================
    SegmentBase: {
        text: 'Defines segment information for single-segment Representations (e.g., a single large mp4 file). The "segment" is defined by a byte range within the BaseURL resource.',
        isoRef: 'Clause 5.3.9.2',
    },
    'SegmentBase@timescale': {
        text: 'The integer clock frequency used for all duration and time values in this context. Common values: 90000 for video, 48000 for audio. Essential for converting integer timestamps to seconds.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentBase@indexRange': {
        text: 'The byte range in the file containing the Segment Index ("sidx") box. The client downloads this range first to learn the byte offsets of temporal subsegments (seeking).',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentBase@indexRangeExact': {
        text: 'If true, the client can rely on the index range being byte-perfect. If false, it might need to read slightly more data to ensure the full index box is captured.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    Initialization: {
        text: 'Defines the location of the Initialization Segment (e.g., "init.mp4"). This segment contains the codec configuration (decoder setup) and must be processed before any media segments.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'Initialization@range': {
        text: 'If the initialization segment is part of a larger file, this defines the specific byte range to download.',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    SegmentList: {
        text: 'A container for an explicit list of Segment URLs. Used when segment filenames do not follow a predictable pattern (e.g., hashed filenames).',
        isoRef: 'Clause 5.3.9.3',
    },
    SegmentURL: {
        text: 'An entry in a SegmentList defining a specific media segment.',
        isoRef: 'Clause 5.3.9.3.2, Table 19',
    },
    'SegmentURL@mediaRange': {
        text: 'The specific byte range for this segment if stored within a larger file.',
        isoRef: 'Clause 5.3.9.3.2, Table 19',
    },
    SegmentTemplate: {
        text: 'Provides a mechanism to construct Segment URLs using substitution parameters (`$Number$`, `$Time$`) rather than an explicit list. This significantly reduces manifest size for long-duration or live content by algorithmically defining the segment structure.',
        isoRef: 'Clause 5.3.9.4',
    },
    'SegmentTemplate@timescale': {
        text: 'Defines the time scale (ticks per second) for all timestamp and duration values within this template. For instance, a timescale of 90,000 means that a duration of 180,000 ticks equals 2 seconds. High precision timescales avoid rounding errors inherent in floating-point representations.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentTemplate@presentationTimeOffset': {
        text: 'A value subtracted from the internal media timestamps to align them with the Period timeline. Necessary when content from different sources (with different internal clocks) is spliced together.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentTemplate@initialization': {
        text: 'Usage template for the Initialization Segment. Typically contains the `$RepresentationID$` identifier to fetch the specific header file required to initialize the decoder for that track.',
        isoRef: 'Clause 5.3.9.4.2, Table 20',
    },
    'SegmentTemplate@media': {
        text: 'Usage template for Media Segments. Contains identifiers like `$Number$` or `$Time$` which the client replaces to generate the URL for a specific point in the timeline.',
        isoRef: 'Clause 5.3.9.4.2, Table 20',
    },
    'SegmentTemplate@duration': {
        text: 'Used for fixed-duration segments. The duration of every segment is constant, allowing simple index-based calculation: StartTime = StartNumber + (Index * Duration).',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    'SegmentTemplate@startNumber': {
        text: 'The index number of the first segment in the timeline. Defaults to 1 if not specified.',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    'SegmentTemplate@endNumber': {
        text: 'The index number of the last segment. In dynamic profiles, this is usually omitted as the stream is infinite.',
        isoRef: 'Clause 5.3.9.2.2, Table 17',
    },
    'SegmentTemplate@availabilityTimeOffset': {
        text: 'Allows the client to request a segment *before* its full duration has elapsed. This is the core enabler for Low Latency DASH (LL-DASH) using Chunked Transfer Encoding.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    'SegmentTemplate@availabilityTimeComplete': {
        text: 'If "false", it explicitly signals that the segment is available for download while it is still being generated (chunked transfer). If "true", the client must wait until the full segment duration has passed.',
        isoRef: 'Clause 5.3.9.2.2, Table 16',
    },
    SegmentTimeline: {
        text: 'Explicitly lists the duration of segments when they cannot be calculated via a constant global duration. This is essential for streams with variable segment lengths (e.g., to align with variable GOP structures) or to handle discontinuities.',
        isoRef: 'Clause 5.3.9.6',
    },
    S: {
        text: 'A "Segment Run" element describing one or more contiguous segments with the same duration. The `S` element allows for compact representation of the timeline by using the repeat count attribute.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@t': {
        text: 'Specifies the absolute start time (in timescale ticks) of the segment run. This is typically only required for the first segment in a timeline or after a discontinuity to re-anchor the relative calculations.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@d': {
        text: 'The duration of the segment(s) in this run, expressed in timescale ticks. This value is added to the start time to calculate the start of the subsequent segment.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@r': {
        text: 'The repeat count. Specifies how many *additional* contiguous segments share the same duration `@d`. For example, `r="5"` means the segment duration repeats 5 more times (6 segments total), compressing the XML size.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    'S@n': {
        text: 'The segment number index associated with this timeline entry. Used to handle discontinuities in numbering.',
        isoRef: 'Clause 5.3.9.6.2, Table 22',
    },
    FailoverContent: {
        text: 'A mechanism to signal that specific segments in the timeline are valid but contain "failover" content (e.g., a slate) due to an upstream encoder error. The client may choose to switch to a different Representation that has valid content for that time.',
        isoRef: 'Clause 5.3.9.7',
    },
    Resync: {
        text: 'Provides metadata about Resynchronization Points *inside* a segment. This allows a client to perform a partial HTTP GET to a specific byte offset to start playback mid-segment, facilitating faster seeking and channel switching.',
        isoRef: 'Clause 5.3.13',
    },

    // ==========================================================================================
    // Events & Timing
    // ==========================================================================================
    EventStream: {
        text: 'A container for timed metadata events defined directly in the MPD. These are "sparse" events (e.g., SCTE-35 ad markers) that the client application can subscribe to.',
        isoRef: 'Clause 5.10.2',
    },
    'EventStream@presentationTimeOffset': {
        text: 'An offset to align the event timestamps with the Period timeline, similar to the segment presentation time offset.',
        isoRef: 'Clause 5.10.2.2, Table 38',
    },
    'EventStream@timescale': {
        text: 'The time scale (ticks per second) for the Event Stream. Used to calculate the duration and presentation time of contained Events.',
        isoRef: 'Clause 5.10.2.2, Table 38',
    },
    'EventStream@schemeIdUri': {
        text: 'A URI identifying the scheme of the events contained in this stream (e.g., "urn:scte:scte35:2013:xml" for ad markers).',
        isoRef: 'Clause 5.10.2.2, Table 38',
    },
    'EventStream@value': {
        text: 'Specifies the value for the Event Stream, often used for additional configuration or identification depending on the scheme.',
        isoRef: 'Clause 5.10.2.2, Table 38',
    },
    Event: {
        text: 'A wrapper for the specific event message. Contains the payload (like SCTE-35 XML) or message data.',
        isoRef: 'Clause 5.10.2.2, Table 39',
    },
    'Event@duration': {
        text: 'Specifies the presentation duration of the event. If not present, the duration is unknown or implicit.',
        isoRef: 'Clause 5.10.2.2, Table 39',
    },
    'Event@presentationTime': {
        text: 'The presentation time of the event, relative to the Period start (or EventStream@presentationTimeOffset).',
        isoRef: 'Clause 5.10.2.2, Table 39',
    },
    'Event@id': {
        text: 'A unique identifier for this specific event instance.',
        isoRef: 'Clause 5.10.2.2, Table 39',
    },
    Signal: {
        text: 'Container for SCTE-35 signal messages (e.g., splice commands) when embedded in DASH Events.',
        isoRef: 'SCTE 35 / SCTE 214',
    },
    Binary: {
        text: 'Base64 encoded binary payload of the signal or event message.',
        isoRef: 'SCTE 35 / SCTE 214',
    },
    InbandEventStream: {
        text: 'Signals that events are embedded inside the media segments (e.g., `emsg` boxes in MP4). This ensures frame-accurate synchronization of metadata (like ID3 tags or ad markers) with the video.',
        isoRef: 'Clause 5.10.3',
    },
    'InbandEventStream@schemeIdUri': {
        text: 'Identifies the type of event (e.g., "urn:scte:scte35:2013:bin"). The client uses this to determine if it has a handler for this specific metadata format.',
        isoRef: 'Clause 5.10.3.2',
    },
    'InbandEventStream@value': {
        text: 'Additional configuration data for the event scheme.',
        isoRef: 'Clause 5.10.2.2, Table 38',
    },
    UTCTiming: {
        text: 'Defines the time synchronization source. Accurate time is vital for DASH clients to request the correct segments in a live stream. Without this, the client might request segments 10 seconds in the future (404 Error) or past (drift).',
        isoRef: 'Clause 5.8.4.11',
    },
    'UTCTiming@schemeIdUri': {
        text: 'The protocol used for time sync. Common schemes: "urn:mpeg:dash:utc:http-iso:2014" (header from HTTP URL) or "urn:mpeg:dash:utc:direct:2014" (time string in manifest).',
        isoRef: 'Clause 5.8.5.7, Table 35',
    },
    'UTCTiming@value': {
        text: 'The server URL or time string used for synchronization.',
        isoRef: 'Clause 5.8.5.7, Table 35',
    },
    LeapSecondInformation: {
        text: "Allows the client to account for Leap Seconds when converting between UTC (Wall Clock) and TAI (International Atomic Time), ensuring long-running live streams don't drift by seconds over time.",
        isoRef: 'Clause 5.13',
    },
    Metrics: {
        text: 'Defines Quality of Experience (QoE) metrics reporting. It specifies what to measure, when to measure it, and where to report it.',
        isoRef: 'Clause 5.9',
    },
    'Metrics@metrics': {
        text: 'A list of metric keys (comma-separated) to be collected (e.g., "TcpList,BufferLevel").',
        isoRef: 'Clause 5.9.2',
    },
    Reporting: {
        text: 'Specifies the mechanism and destination for reporting collected metrics.',
        isoRef: 'Clause 5.9.4',
    },
    'Reporting@schemeIdUri': {
        text: 'Identifies the reporting scheme (e.g. "urn:mpeg:dash:reporting:2014").',
        isoRef: 'Clause 5.9.4',
    },
    'Reporting@value': {
        text: 'Scheme-specific configuration value.',
        isoRef: 'Clause 5.9.4',
    },
    'Reporting@reportingUrl': {
        text: '(DVB Extension) The destination URL where metrics reports should be sent.',
        isoRef: 'ETSI TS 103 285',
    },
    'Reporting@probability': {
        text: '(DVB Extension) Probability (1/N) that a client should report metrics. Used to sample a subset of the audience.',
        isoRef: 'ETSI TS 103 285',
    },

    // ==========================================================================================
    // SCTE 35 (Digital Program Insertion)
    // ==========================================================================================
    SpliceInfoSection: {
        text: 'The root element for SCTE 35 Digital Program Insertion cueing messages in XML format. Signals ad breaks and program boundaries.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInfoSection@protocolVersion': {
        text: 'The version of the SCTE 35 protocol used.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInfoSection@ptsAdjustment': {
        text: 'An offset applied to PTS values within the command to align with the MPEG transport stream timeline.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInfoSection@tier': {
        text: 'Authorization tier for the message.',
        isoRef: 'SCTE 35 Standard',
    },
    SpliceInsert: {
        text: 'A command sent to signal a splice point (e.g., start or end of an ad break) or an insertion opportunity.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInsert@spliceEventId': {
        text: 'A unique identifier for this specific splice event. Used to identify the event for cancellation or updates.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInsert@spliceEventCancelIndicator': {
        text: 'If "true", indicates that a previously sent splice event with the same ID should be cancelled.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInsert@outOfNetworkIndicator': {
        text: 'Direction of the splice. "true" = Leave Network (Start Ad Break). "false" = Return to Network (End Ad Break).',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInsert@spliceImmediateFlag': {
        text: 'If "true", the splice should occur at the nearest opportunity. If "false", a specific time is provided.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInsert@uniqueProgramId': {
        text: 'Unique ID for the viewing event (service) associated with this message.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInsert@availNum': {
        text: 'The specific number of this avail (ad slot) within the program.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceInsert@availsExpected': {
        text: 'The expected total number of avails in the program.',
        isoRef: 'SCTE 35 Standard',
    },
    BreakDuration: {
        text: 'Optional structure within a SpliceInsert command that specifies the duration of the commercial break.',
        isoRef: 'SCTE 35 Standard',
    },
    'BreakDuration@autoReturn': {
        text: 'If "true", the splicing device is instructed to return to the network feed automatically after the break duration expires.',
        isoRef: 'SCTE 35 Standard',
    },
    'BreakDuration@duration': {
        text: 'The duration of the break expressed in 90kHz clock ticks.',
        isoRef: 'SCTE 35 Standard',
    },
    Program: {
        text: 'Container for splice time details specific to a program element.',
        isoRef: 'SCTE 35 Standard',
    },
    SpliceTime: {
        text: 'Specifies the precise time for the splice event.',
        isoRef: 'SCTE 35 Standard',
    },
    'SpliceTime@ptsTime': {
        text: 'The Presentation Time Stamp (PTS) indicating the exact moment of the splice.',
        isoRef: 'SCTE 35 Standard',
    },

    // ==========================================================================================
    // Descriptors & Properties
    // ==========================================================================================
    Accessibility: {
        text: 'Signaling for tracks intended for users with disabilities (e.g., Audio Description, Hard-of-Hearing captions). Clients use this to auto-select tracks based on user accessibility settings.',
        isoRef: 'Clause 5.8.4.3',
    },
    'Accessibility@schemeIdUri': {
        text: 'Identifies the standard used for the accessibility code (e.g. "urn:tva:metadata:cs:AudioPurposeCS:2007").',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'Accessibility@value': {
        text: 'The specific code indicating the type (e.g., "1" for Audio Description).',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    AudioChannelConfiguration: {
        text: 'Defines the speaker layout (e.g., Stereo vs 5.1 Surround). Critical for the client to select a track that matches the physical output capabilities of the device.',
        isoRef: 'Clause 5.8.4.7',
    },
    'AudioChannelConfiguration@schemeIdUri': {
        text: 'Often "urn:mpeg:dash:23003:3:audio_channel_configuration:2011".',
        isoRef: 'Clause 5.8.5.4',
    },
    'AudioChannelConfiguration@value': {
        text: 'The channel count (e.g., "2", "6") or a specific mapping code.',
        isoRef: 'Clause 5.8.5.4',
    },
    ContentProtection: {
        text: 'Contains metadata for Digital Rights Management (DRM). It signals which DRM systems (Widevine, PlayReady, FairPlay) are supported and provides the initialization data (PSSH) needed to request a license.',
        isoRef: 'Clause 5.8.4.1',
    },
    'ContentProtection@schemeIdUri': {
        text: 'The UUID of the specific DRM system (e.g., edef8ba9-79d6-4ace-a3c8-27dcd51d21ed for Widevine). Also used to signal Common Encryption (CENC).',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@value': {
        text: 'A human-readable name for the system (e.g., "cenc").',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@ref': {
        text: 'Used to reference a parent ContentProtection element (via refId) to avoid duplicating large PSSH blobs across every Representation.',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@refId': {
        text: 'The ID of a ContentProtection descriptor that can be referenced by others.',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    'ContentProtection@default_KID': {
        text: 'The Default Key ID. Identifies the specific encryption key required to decrypt the content. The client sends this ID to the license server.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    'ContentProtection@cenc:default_KID': {
        text: 'Namespace-prefixed version of the Default Key ID, common in CENC implementations.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    'ContentProtection@robustness': {
        text: 'Specifies the required hardware security level (e.g., "HW_SECURE_ALL"). If the device cannot meet this robustness requirement (e.g., strictly software DRM), the client must not attempt to play the stream.',
        isoRef: 'Clause 5.8.4.1.4, Table 33',
    },
    OutputProtection: {
        text: 'Signaling for output link protection (e.g., HDCP). It informs the client that the content requires a specific HDCP version on the HDMI link (e.g., HDCP 2.2 for 4K).',
        isoRef: 'Clause 5.8.4.12',
    },
    pssh: {
        text: 'Protection System Specific Header. A binary blob (Base64 encoded) containing the data payload the CDM (Content Decryption Module) sends to the license server to initiate a session.',
        isoRef: 'ISO/IEC 23001-7',
    },
    'cenc:pssh': {
        text: 'Namespace-prefixed PSSH box, standard for CENC.',
        isoRef: 'ISO/IEC 23001-7 & Clause 5.8.5.2.2',
    },
    Laurl: {
        text: 'License Acquisition URL. An element often used in ClearKey or specific DRM schemes to point directly to the license server endpoint.',
        isoRef: 'DASH-IF ClearKey Content Protection',
    },
    'Laurl@licenseType': {
        text: 'Indicates the version or type of license protocol (e.g., "EME-1.0").',
        isoRef: 'DASH-IF ClearKey Content Protection',
    },
    EssentialProperty: {
        text: "A generic descriptor for metadata that is **critical** for processing the content. If the client does not recognize the @schemeIdUri, it MUST ignore the parent element (e.g., if it doesn't understand a specific SRD scheme, it cannot play the tiled video).",
        isoRef: 'Clause 5.8.4.8',
    },
    'EssentialProperty@schemeIdUri': {
        text: 'The URI defining the scheme of the property.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'EssentialProperty@value': {
        text: 'Configuration data for the property.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    SupplementalProperty: {
        text: 'A generic descriptor for metadata that enhances the experience but is **optional**. If the client does not recognize the scheme, it can safely ignore the property and still play the content (e.g., ignoring thumbnail references).',
        isoRef: 'Clause 5.8.4.9',
    },
    'SupplementalProperty@schemeIdUri': {
        text: 'The URI defining the scheme.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    'SupplementalProperty@value': {
        text: 'Configuration data.',
        isoRef: 'Clause 5.8.2, Table 32',
    },
    Label: {
        text: 'A standard element for providing human-readable names for tracks (e.g., "Director\'s Commentary"). Preferred over the non-standard @label attribute.',
        isoRef: 'Clause 5.3.10',
    },
    'Label@id': {
        text: 'Allows grouping of labels.',
        isoRef: 'Clause 5.3.10',
    },
    'Label@lang': {
        text: 'The language of the label text itself.',
        isoRef: 'Clause 5.3.10',
    },
    GroupLabel: {
        text: 'Provides a label for a group of AdaptationSets. Useful for grouping related tracks in a UI (e.g., "Stereo Tracks" vs "Surround Tracks").',
        isoRef: 'Clause 5.3.10',
    },
    Role: {
        text: 'Defines the semantic role of the track (e.g., "main", "caption", "dub", "commentary"). The client uses this to automatically select the correct audio track based on user preferences.',
        isoRef: 'Clause 5.8.4.2',
    },
    'Role@schemeIdUri': {
        text: 'Usually "urn:mpeg:dash:role:2011".',
        isoRef: 'Clause 5.8.5.5',
    },
    'Role@value': {
        text: 'The role value (e.g., "main").',
        isoRef: 'Clause 5.8.5.5, Table 34',
    },
    InitializationSet: {
        text: 'A structure to define common initialization properties (like Codecs, PAR, Language) that apply across multiple AdaptationSets or Periods. It optimizes the MPD size and simplifies parsing for complex presentations.',
        isoRef: 'Clause 5.3.12',
    },
    InitializationGroup: {
        text: 'Groups InitializationSets to indicate minimum playback requirements. A client can determine if it supports the presentation by checking if it supports the requirements of the group.',
        isoRef: 'Clause 5.3.12.4',
    },
    InitializationPresentation: {
        text: 'Aggregates InitializationGroups to define a complete user experience.',
        isoRef: 'Clause 5.3.12.4',
    },
    Preselection: {
        text: 'Explicitly defines a combination of media components (e.g., a specific Video track + Main Audio + Commentary Audio) that creates a distinct "experience". This simplifies the client\'s task of selecting the correct combination of tracks for complex object-based audio or NGA.',
        isoRef: 'Clause 5.3.11',
    },

    // ==========================================================================================
    // Service Description Level (Annex K)
    // ==========================================================================================
    ServiceDescription: {
        text: "A container for Low-Latency control parameters. It allows the content provider to dictate strict rules regarding latency targets, playback speed control, and quality selection, overriding the player's default heuristics.",
        isoRef: 'Annex K.4',
    },
    'ServiceDescription@id': {
        text: 'Unique ID for the Service Description.',
        isoRef: 'Annex K.4.2.1, Table K.5',
    },
    Scope: {
        text: 'Filters the ServiceDescription to apply only to specific types of clients or geographic locations.',
        isoRef: 'Annex K.4.2.1, Table K.5',
    },
    Latency: {
        text: 'Defines the constraints for live latency. The client uses these values to adjust its live-edge calculation and catch-up logic.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@target': {
        text: 'The desired end-to-end latency (in ms). The client will use playback rate adjustment to try and maintain this distance from the live edge.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@min': {
        text: 'The absolute minimum allowed latency. If the client drifts closer than this, it must stall or slow down.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@max': {
        text: 'The maximum allowed latency. If the client falls behind this, it should seek forward to the live edge.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    'Latency@referenceId': {
        text: 'Links to a `ProducerReferenceTime` element to define exactly what clock is being used to measure latency.',
        isoRef: 'Annex K.4.2.2, Table K.6',
    },
    PlaybackRate: {
        text: 'Defines limits on how fast or slow the player is allowed to play content to achieve the Target Latency (e.g., speeding up by 5% to catch up).',
        isoRef: 'Annex K.4.2.3, Table K.7',
    },
    'PlaybackRate@min': {
        text: 'Minimum allowed playback rate (e.g., 0.95).',
        isoRef: 'Annex K.4.2.3, Table K.7',
    },
    'PlaybackRate@max': {
        text: 'Maximum allowed playback rate (e.g., 1.05).',
        isoRef: 'Annex K.4.2.3, Table K.7',
    },
    OperatingQuality: {
        text: 'Allows the service provider to restrict or guide the ABR algorithm, for example, by defining a target quality ranking or a maximum quality difference between tracks.',
        isoRef: 'Annex K.4.2.4, Table K.8',
    },
    OperatingBandwidth: {
        text: 'Provides guidelines for bandwidth consumption, allowing the provider to set min/max bandwidth caps for the ABR logic.',
        isoRef: 'Annex K.4.2.5, Table K.9',
    },
    ProducerReferenceTime: {
        text: 'Injects a wall-clock timestamp (e.g., from the encoder) correlated with a media presentation timestamp. This allows the player to calculate exactly how "old" a video frame is relative to when it was captured, which is the ground truth for latency calculations.',
        isoRef: 'Clause 5.12',
    },
    'ProducerReferenceTime@id': {
        text: 'ID used to reference this timestamp.',
        isoRef: 'Clause 5.12.2, Table 45',
    },
    'ProducerReferenceTime@type': {
        text: 'Source of the timestamp (e.g., "encoder", "captured").',
        isoRef: 'Clause 5.12.2, Table 45',
    },
    'ProducerReferenceTime@wallClockTime': {
        text: 'The UTC time string at the moment of capture/encoding.',
        isoRef: 'Clause 5.12.2, Table 45',
    },
    'ProducerReferenceTime@presentationTime': {
        text: 'The media timestamp corresponding to the wallClockTime.',
        isoRef: 'Clause 5.12.2, Table 45',
    },
};
