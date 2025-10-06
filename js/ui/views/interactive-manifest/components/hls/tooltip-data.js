/**
 * A mapping of HLS playlist tags to their descriptions and RFC 8216 references.
 * Format: 'TagName' for tags, 'TagName@AttributeName' for attributes.
 */
export const hlsTooltipData = {
    // --- Basic Tags ---
    EXTM3U: {
        text: 'Indicates that the file is an Extended M3U Playlist file. It MUST be the first line of every Media Playlist and every Multivariant Playlist.',
        isoRef: 'HLS 2nd Ed: 4.4.1.1',
    },
    'EXT-X-VERSION': {
        text: 'Indicates the compatibility version of the Playlist file. It applies to the entire Playlist file.',
        isoRef: 'HLS 2nd Ed: 4.4.1.2',
    },

    // --- Media Segment Tags ---
    EXTINF: {
        text: 'Specifies the duration of a Media Segment in seconds. It applies only to the Media Segment that follows it.',
        isoRef: 'HLS 2nd Ed: 4.4.4.1',
    },
    'EXT-X-BYTERANGE': {
        text: 'Indicates that a Media Segment is a sub-range of the resource identified by its URI.',
        isoRef: 'HLS 2nd Ed: 4.4.4.2',
    },
    'EXT-X-DISCONTINUITY': {
        text: 'Indicates a discontinuity between the Media Segment that follows it and the one that preceded it (e.g., format or timestamp change).',
        isoRef: 'HLS 2nd Ed: 4.4.4.3',
    },
    'EXT-X-KEY': {
        text: 'Specifies how to decrypt Media Segments.',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@METHOD': {
        text: 'The encryption method. Valid values are NONE, AES-128, and SAMPLE-AES. SAMPLE-AES-CTR is optional.',
        ref: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@URI': {
        text: 'The URI that specifies how to obtain the encryption key.',
        ref: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@IV': {
        text: 'A hexadecimal-sequence that specifies a 128-bit unsigned integer Initialization Vector.',
        ref: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@KEYFORMAT': {
        text: 'Specifies how the key is represented in the resource identified by the URI.',
        ref: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@KEYFORMATVERSIONS': {
        text: 'Indicates which version(s) of a KEYFORMAT this instance complies with.',
        ref: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-MAP': {
        text: 'Specifies how to obtain the Media Initialization Section required to parse the applicable Media Segments.',
        isoRef: 'HLS 2nd Ed: 4.4.4.5',
    },
    'EXT-X-MAP@URI': {
        text: 'The URI that identifies a resource containing the Media Initialization Section.',
        ref: 'HLS 2nd Ed: 4.4.4.5',
    },
    'EXT-X-MAP@BYTERANGE': {
        text: 'A byte range into the resource identified by the URI. The offset is required.',
        ref: 'HLS 2nd Ed: 4.4.4.5',
    },
    'EXT-X-PROGRAM-DATE-TIME': {
        text: 'Associates the first sample of a Media Segment with an absolute date and/or time.',
        isoRef: 'HLS 2nd Ed: 4.4.4.6',
    },
    'EXT-X-DATERANGE': {
        text: 'Associates a Date Range with a set of attribute/value pairs, often for carrying SCTE-35 ad signaling.',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@CUE': {
        text: 'A list of trigger identifiers (PRE, POST, ONCE) indicating when an action associated with the Date Range should be triggered.',
        ref: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-GAP': {
        text: 'Indicates that the segment URI to which it applies does not contain media data and should not be loaded.',
        isoRef: 'HLS 2nd Ed: 4.4.4.7',
    },
    'EXT-X-BITRATE': {
        text: 'Identifies the approximate segment bit rate of the Media Segment(s) to which it applies.',
        isoRef: 'HLS 2nd Ed: 4.4.4.8',
    },
    'EXT-X-PART': {
        text: 'Identifies a Partial Segment (a portion of a Media Segment). Used for low-latency streaming.',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@URI': {
        text: 'The URI for the Partial Segment resource. This attribute is REQUIRED.',
        ref: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@DURATION': {
        text: 'The duration of the Partial Segment in seconds. This attribute is REQUIRED.',
        ref: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@INDEPENDENT': {
        text: 'A value of YES indicates that the Partial Segment contains an I-frame or other independent frame.',
        ref: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@BYTERANGE': {
        text: 'Indicates that the Partial Segment is a sub-range of the resource specified by the URI attribute.',
        ref: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@GAP': {
        text: 'A value of YES indicates that the Partial Segment is not available.',
        ref: 'HLS 2nd Ed: 4.4.4.9',
    },

    // --- Media Playlist Tags ---
    'EXT-X-TARGETDURATION': {
        text: 'Specifies the maximum Media Segment duration in seconds. This tag is REQUIRED for all Media Playlists.',
        isoRef: 'HLS 2nd Ed: 4.4.3.1',
    },
    'EXT-X-MEDIA-SEQUENCE': {
        text: 'Indicates the Media Sequence Number of the first Media Segment that appears in a Playlist file.',
        isoRef: 'HLS 2nd Ed: 4.4.3.2',
    },
    'EXT-X-DISCONTINUITY-SEQUENCE': {
        text: 'Allows synchronization between different Renditions of the same Variant Stream.',
        isoRef: 'HLS 2nd Ed: 4.4.3.3',
    },
    'EXT-X-ENDLIST': {
        text: 'Indicates that no more Media Segments will be added to the Media Playlist file.',
        isoRef: 'HLS 2nd Ed: 4.4.3.4',
    },
    'EXT-X-PLAYLIST-TYPE': {
        text: 'Provides mutability information about the Media Playlist file. Can be EVENT or VOD.',
        isoRef: 'HLS 2nd Ed: 4.4.3.5',
    },
    'EXT-X-I-FRAMES-ONLY': {
        text: 'Indicates that each Media Segment in the Playlist describes a single I-frame.',
        isoRef: 'HLS 2nd Ed: 4.4.3.6',
    },
    'EXT-X-PART-INF': {
        text: 'Provides information about the Partial Segments in the Playlist. Required if the Playlist contains any EXT-X-PART tags.',
        isoRef: 'HLS 2nd Ed: 4.4.3.7',
    },
    'EXT-X-PART-INF@PART-TARGET': {
        text: 'The Part Target Duration, indicating the target duration of Partial Segments in seconds.',
        ref: 'HLS 2nd Ed: 4.4.3.7',
    },
    'EXT-X-SERVER-CONTROL': {
        text: 'Allows the Server to indicate support for Delivery Directives such as Blocking Playlist Reload and Playlist Delta Updates for low-latency streaming.',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@CAN-BLOCK-RELOAD': {
        text: 'A YES value indicates the server supports Blocking Playlist Reload, allowing clients to wait for updates instead of polling.',
        ref: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@PART-HOLD-BACK': {
        text: 'The server-recommended minimum distance from the end of the Playlist at which clients should begin to play in Low-Latency Mode.',
        ref: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@CAN-SKIP-UNTIL': {
        text: 'Indicates that the Server can produce Playlist Delta Updates. The value is the Skip Boundary in seconds.',
        ref: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@CAN-SKIP-DATERANGES': {
        text: 'A YES value indicates the Server can produce Playlist Delta Updates that skip older EXT-X-DATERANGE tags.',
        ref: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@HOLD-BACK': {
        text: 'The server-recommended minimum distance from the end of the Playlist at which clients should begin to play.',
        ref: 'HLS 2nd Ed: 4.4.3.8',
    },

    // --- Media Metadata Tags ---
    'EXT-X-SKIP': {
        text: 'Used in a Playlist Delta Update to replace older Media Segments.',
        isoRef: 'HLS 2nd Ed: 4.4.5.2',
    },
    'EXT-X-SKIP@SKIPPED-SEGMENTS': {
        text: 'The number of Media Segments replaced by this tag. Required.',
        ref: 'HLS 2nd Ed: 4.4.5.2',
    },
    'EXT-X-SKIP@RECENTLY-REMOVED-DATERANGES': {
        text: 'A tab-delimited list of EXT-X-DATERANGE IDs that have been removed recently.',
        ref: 'HLS 2nd Ed: 4.4.5.2',
    },
    'EXT-X-PRELOAD-HINT': {
        text: 'Allows a server to suggest that a client preload a resource, such as the next Partial Segment or a Media Initialization Section.',
        isoRef: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@TYPE': {
        text: 'Specifies the type of the hinted resource. Valid values are PART and MAP.',
        ref: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@URI': {
        text: 'The URI of the resource to be preloaded. This attribute is REQUIRED.',
        ref: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@BYTERANGE-START': {
        text: 'The byte offset of the first byte of the hinted resource.',
        ref: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@BYTERANGE-LENGTH': {
        text: 'The length of the hinted resource in bytes.',
        ref: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-RENDITION-REPORT': {
        text: 'Carries information about an associated Rendition that is as up-to-date as the Playlist that contains it.',
        isoRef: 'HLS 2nd Ed: 4.4.5.4',
    },
    'EXT-X-RENDITION-REPORT@URI': {
        text: 'The URI for the Media Playlist of the specified Rendition. This attribute is REQUIRED.',
        ref: 'HLS 2nd Ed: 4.4.5.4',
    },
    'EXT-X-RENDITION-REPORT@LAST-MSN': {
        text: 'The Media Sequence Number of the last Media Segment currently in the specified Rendition. Required.',
        ref: 'HLS 2nd Ed: 4.4.5.4',
    },
    'EXT-X-RENDITION-REPORT@LAST-PART': {
        text: 'The Part Index of the last Partial Segment currently in the specified Rendition. Required if the rendition contains parts.',
        ref: 'HLS 2nd Ed: 4.4.5.4',
    },

    // --- Multivariant Playlist Tags ---
    'EXT-X-MEDIA': {
        text: 'Used to relate Media Playlists that contain alternative Renditions (e.g., audio, video, subtitles) of the same content.',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@TYPE': {
        text: 'The type of the rendition. Valid strings are AUDIO, VIDEO, SUBTITLES, and CLOSED-CAPTIONS.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@URI': {
        text: 'A URI that identifies the Media Playlist file of the rendition.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@GROUP-ID': {
        text: 'A string that specifies the group to which the Rendition belongs.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@LANGUAGE': {
        text: 'Identifies the primary language used in the Rendition.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@ASSOC-LANGUAGE': {
        text: 'Identifies a language that is associated with the Rendition (e.g., written vs. spoken).',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@NAME': {
        text: 'A human-readable description of the Rendition.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@STABLE-RENDITION-ID': {
        text: 'A stable identifier for the URI within the Multivariant Playlist.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@DEFAULT': {
        text: 'If YES, the client SHOULD play this Rendition in the absence of other choices.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@AUTOSELECT': {
        text: 'If YES, the client MAY choose this Rendition due to matching the current playback environment.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@FORCED': {
        text: 'If YES, this SUBTITLES rendition contains content considered essential to play.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@INSTREAM-ID': {
        text: 'Specifies a rendition within the segments. Required for CLOSED-CAPTIONS (CC1-4, SERVICEn).',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@CHARACTERISTICS': {
        text: 'A comma-separated list of Uniform Type Identifiers indicating individual characteristics of the Rendition.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@CHANNELS': {
        text: 'Specifies the number of audio channels and spatial audio parameters.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@BIT-DEPTH': {
        text: 'The audio bit depth of the Rendition.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@SAMPLE-RATE': {
        text: 'The audio sample rate of the Rendition.',
        ref: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-STREAM-INF': {
        text: 'Specifies a Variant Stream. The URI of the Media Playlist follows on the next line.',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@BANDWIDTH': {
        text: 'The peak segment bit rate of the Variant Stream in bits per second.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@AVERAGE-BANDWIDTH': {
        text: 'The average segment bit rate of the Variant Stream in bits per second.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@SCORE': {
        text: 'An abstract, relative measure of the playback quality-of-experience of this Variant Stream.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@CODECS': {
        text: 'A comma-separated list of formats specifying media sample types present in the Variant Stream.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@SUPPLEMENTAL-CODECS': {
        text: 'Describes media samples with a backward-compatible base layer and a newer enhancement layer.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@RESOLUTION': {
        text: 'The optimal pixel resolution at which to display all video in the Variant Stream.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@FRAME-RATE': {
        text: 'The maximum frame rate for all video in the Variant Stream.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@HDCP-LEVEL': {
        text: 'Indicates that the Variant Stream could fail to play unless the output is protected by HDCP.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@ALLOWED-CPC': {
        text: 'Restricts playback to devices that guarantee a certain level of content protection robustness.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@VIDEO-RANGE': {
        text: 'Specifies the dynamic range of the video content (SDR, HLG, PQ).',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@REQ-VIDEO-LAYOUT': {
        text: 'Indicates whether the video content requires specialized rendering (e.g., stereoscopic, immersive).',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@STABLE-VARIANT-ID': {
        text: 'A stable identifier for the URI within the Multivariant Playlist.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@AUDIO': {
        text: 'The GROUP-ID of the audio renditions that should be used with this variant.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@VIDEO': {
        text: 'The GROUP-ID of the video renditions that should be used with this variant.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@SUBTITLES': {
        text: 'The GROUP-ID of the subtitle renditions that can be used with this variant.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@CLOSED-CAPTIONS': {
        text: 'The GROUP-ID of the closed-caption renditions that can be used. Can also be NONE.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@PATHWAY-ID': {
        text: 'Indicates that the Variant Stream belongs to the identified Content Steering Pathway.',
        ref: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-I-FRAME-STREAM-INF': {
        text: 'Identifies a Media Playlist file containing the I-frames of a multimedia presentation, for use in trick-play modes.',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-SESSION-DATA': {
        text: 'Allows arbitrary session data to be carried in a Multivariant Playlist.',
        isoRef: 'HLS 2nd Ed: 4.4.6.4',
    },
    'EXT-X-SESSION-KEY': {
        text: 'Allows encryption keys from Media Playlists to be specified in a Multivariant Playlist, enabling key preloading.',
        isoRef: 'HLS 2nd Ed: 4.4.6.5',
    },
    'EXT-X-CONTENT-STEERING': {
        text: 'Allows a server to provide a Content Steering Manifest for redundancy and load balancing.',
        isoRef: 'HLS 2nd Ed: 4.4.6.6',
    },
    'EXT-X-CONTENT-STEERING@SERVER-URI': {
        text: 'The URI to a Steering Manifest. Required.',
        ref: 'HLS 2nd Ed: 4.4.6.6',
    },
    'EXT-X-CONTENT-STEERING@PATHWAY-ID': {
        text: 'The initial Pathway that must be applied by a client until the Steering Manifest is loaded.',
        ref: 'HLS 2nd Ed: 4.4.6.6',
    },

    // --- Media or Multivariant Playlist Tags ---
    'EXT-X-INDEPENDENT-SEGMENTS': {
        text: 'Indicates that all media samples in a Media Segment can be decoded without information from other segments.',
        isoRef: 'HLS 2nd Ed: 4.4.2.1',
    },
    'EXT-X-START': {
        text: 'Indicates a preferred point at which to start playing a Playlist.',
        isoRef: 'HLS 2nd Ed: 4.4.2.2',
    },
    'EXT-X-START@TIME-OFFSET': {
        text: 'A time offset in seconds from the beginning of the Playlist (positive) or from the end (negative).',
        ref: 'HLS 2nd Ed: 4.4.2.2',
    },
    'EXT-X-START@PRECISE': {
        text: 'If YES, clients should not render media samples prior to the TIME-OFFSET.',
        ref: 'HLS 2nd Ed: 4.4.2.2',
    },
    'EXT-X-DEFINE': {
        text: 'Provides a Playlist variable definition or declaration for variable substitution.',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@NAME': {
        text: 'The name of the variable being defined.',
        ref: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@VALUE': {
        text: 'The string value to substitute for the variable.',
        ref: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@IMPORT': {
        text: 'The name of a variable to import from the Multivariant Playlist.',
        ref: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@QUERYPARAM': {
        text: 'The name of a URI query parameter whose value should be used for the variable.',
        ref: 'HLS 2nd Ed: 4.4.2.3',
    },
};