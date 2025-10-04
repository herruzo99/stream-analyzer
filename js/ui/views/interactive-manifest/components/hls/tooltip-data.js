/**
 * A mapping of HLS playlist tags to their descriptions and RFC 8216 references.
 * Format: 'TagName' for tags, 'TagName@AttributeName' for attributes.
 */
export const hlsTooltipData = {
    // --- Basic Tags ---
    EXTM3U: {
        text: 'Indicates that the file is an Extended M3U Playlist file. It MUST be the first line of every Media Playlist and every Master Playlist.',
        isoRef: 'RFC 8216, Section 4.3.1.1',
    },
    'EXT-X-VERSION': {
        text: 'Indicates the compatibility version of the Playlist file. It applies to the entire Playlist file.',
        isoRef: 'RFC 8216, Section 4.3.1.2',
    },

    // --- Media Segment Tags ---
    EXTINF: {
        text: 'Specifies the duration of a Media Segment in seconds. It applies only to the Media Segment that follows it.',
        isoRef: 'RFC 8216, Section 4.3.2.1',
    },
    'EXT-X-BYTERANGE': {
        text: 'Indicates that a Media Segment is a sub-range of the resource identified by its URI.',
        isoRef: 'RFC 8216, Section 4.3.2.2',
    },
    'EXT-X-DISCONTINUITY': {
        text: 'Indicates a discontinuity between the Media Segment that follows it and the one that preceded it (e.g., format or timestamp change).',
        isoRef: 'RFC 8216, Section 4.3.2.3',
    },
    'EXT-X-KEY': {
        text: 'Specifies how to decrypt Media Segments. It applies to every Media Segment that appears after it until the next EXT-X-KEY tag.',
        isoRef: 'RFC 8216, Section 4.3.2.4',
    },
    'EXT-X-KEY@METHOD': {
        text: 'The encryption method. Valid values are NONE, AES-128, and SAMPLE-AES.',
        isoRef: 'RFC 8216, Section 4.3.2.4',
    },
    'EXT-X-KEY@URI': {
        text: 'The URI that specifies how to obtain the encryption key.',
        isoRef: 'RFC 8216, Section 4.3.2.4',
    },
    'EXT-X-KEY@IV': {
        text: 'A hexadecimal-sequence that specifies a 128-bit unsigned integer Initialization Vector.',
        isoRef: 'RFC 8216, Section 4.3.2.4',
    },
    'EXT-X-KEY@KEYFORMAT': {
        text: 'Specifies how the key is represented in the resource identified by the URI.',
        isoRef: 'RFC 8216, Section 4.3.2.4',
    },
    'EXT-X-KEY@KEYFORMATVERSIONS': {
        text: 'Indicates which version(s) of a KEYFORMAT this instance complies with.',
        isoRef: 'RFC 8216, Section 4.3.2.4',
    },

    'EXT-X-MAP': {
        text: 'Specifies how to obtain the Media Initialization Section required to parse the applicable Media Segments.',
        isoRef: 'RFC 8216, Section 4.3.2.5',
    },
    'EXT-X-MAP@URI': {
        text: 'The URI that identifies a resource containing the Media Initialization Section.',
        isoRef: 'RFC 8216, Section 4.3.2.5',
    },
    'EXT-X-MAP@BYTERANGE': {
        text: 'A byte range into the resource identified by the URI.',
        isoRef: 'RFC 8216, Section 4.3.2.5',
    },

    'EXT-X-PROGRAM-DATE-TIME': {
        text: 'Associates the first sample of a Media Segment with an absolute date and/or time.',
        isoRef: 'RFC 8216, Section 4.3.2.6',
    },
    'EXT-X-DATERANGE': {
        text: 'Associates a Date Range with a set of attribute/value pairs, often for carrying SCTE-35 ad signaling.',
        isoRef: 'RFC 8216, Section 4.3.2.7',
    },
    'EXT-X-PART': {
        text: 'Identifies a Partial Segment (a portion of a Media Segment). Used for low-latency streaming.',
        isoRef: 'RFC 8216bis, Section 4.4.4.9',
    },
    'EXT-X-PART@URI': {
        text: 'The URI for the Partial Segment resource. This attribute is REQUIRED.',
        isoRef: 'RFC 8216bis, Section 4.4.4.9',
    },
    'EXT-X-PART@DURATION': {
        text: 'The duration of the Partial Segment in seconds. This attribute is REQUIRED.',
        isoRef: 'RFC 8216bis, Section 4.4.4.9',
    },
    'EXT-X-PART@INDEPENDENT': {
        text: 'A value of YES indicates that the Partial Segment contains an I-frame or other independent frame.',
        isoRef: 'RFC 8216bis, Section 4.4.4.9',
    },

    // --- Media Playlist Tags ---
    'EXT-X-TARGETDURATION': {
        text: 'Specifies the maximum Media Segment duration in seconds. This tag is REQUIRED for all Media Playlists.',
        isoRef: 'RFC 8216, Section 4.3.3.1',
    },
    'EXT-X-MEDIA-SEQUENCE': {
        text: 'Indicates the Media Sequence Number of the first Media Segment that appears in a Playlist file.',
        isoRef: 'RFC 8216, Section 4.3.3.2',
    },
    'EXT-X-DISCONTINUITY-SEQUENCE': {
        text: 'Allows synchronization between different Renditions of the same Variant Stream.',
        isoRef: 'RFC 8216, Section 4.3.3.3',
    },
    'EXT-X-ENDLIST': {
        text: 'Indicates that no more Media Segments will be added to the Media Playlist file.',
        isoRef: 'RFC 8216, Section 4.3.3.4',
    },
    'EXT-X-PLAYLIST-TYPE': {
        text: 'Provides mutability information about the Media Playlist file. Can be EVENT or VOD.',
        isoRef: 'RFC 8216, Section 4.3.3.5',
    },
    'EXT-X-I-FRAMES-ONLY': {
        text: 'Indicates that each Media Segment in the Playlist describes a single I-frame.',
        isoRef: 'RFC 8216, Section 4.3.3.6',
    },
    'EXT-X-PART-INF': {
        text: 'Provides information about the Partial Segments in the Playlist. Required if the Playlist contains any EXT-X-PART tags.',
        isoRef: 'RFC 8216bis, Section 4.4.3.7',
    },
    'EXT-X-PART-INF@PART-TARGET': {
        text: 'The Part Target Duration, indicating the target duration of Partial Segments in seconds.',
        isoRef: 'RFC 8216bis, Section 4.4.3.7',
    },
    'EXT-X-SERVER-CONTROL': {
        text: 'Allows the Server to indicate support for Delivery Directives such as Blocking Playlist Reload and Playlist Delta Updates for low-latency streaming.',
        isoRef: 'RFC 8216bis, Section 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@CAN-BLOCK-RELOAD': {
        text: 'A YES value indicates the server supports Blocking Playlist Reload, allowing clients to wait for updates instead of polling.',
        isoRef: 'RFC 8216bis, Section 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@PART-HOLD-BACK': {
        text: 'The server-recommended minimum distance from the end of the Playlist at which clients should begin to play in Low-Latency Mode.',
        isoRef: 'RFC 8216bis, Section 4.4.3.8',
    },
    // --- Media Metadata Tags ---
    'EXT-X-PRELOAD-HINT': {
        text: 'Allows a server to suggest that a client preload a resource, such as the next Partial Segment or a Media Initialization Section.',
        isoRef: 'RFC 8216bis, Section 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@TYPE': {
        text: 'Specifies the type of the hinted resource. Valid values are PART and MAP.',
        isoRef: 'RFC 8216bis, Section 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@URI': {
        text: 'The URI of the resource to be preloaded. This attribute is REQUIRED.',
        isoRef: 'RFC 8216bis, Section 4.4.5.3',
    },
    'EXT-X-RENDITION-REPORT': {
        text: 'Carries information about an associated Rendition that is as up-to-date as the Playlist that contains it.',
        isoRef: 'RFC 8216bis, Section 4.4.5.4',
    },
    'EXT-X-RENDITION-REPORT@URI': {
        text: 'The URI for the Media Playlist of the specified Rendition. This attribute is REQUIRED.',
        isoRef: 'RFC 8216bis, Section 4.4.5.4',
    },

    // --- Master Playlist Tags ---
    'EXT-X-MEDIA': {
        text: 'Used to relate Media Playlists that contain alternative Renditions (e.g., audio, video, subtitles) of the same content.',
        isoRef: 'RFC 8216, Section 4.3.4.1',
    },
    'EXT-X-MEDIA@TYPE': {
        text: 'The type of the rendition. Valid strings are AUDIO, VIDEO, SUBTITLES, and CLOSED-CAPTIONS.',
        isoRef: 'RFC 8216, Section 4.3.4.1',
    },
    'EXT-X-MEDIA@URI': {
        text: 'A URI that identifies the Media Playlist file of the rendition.',
        isoRef: 'RFC 8216, Section 4.3.4.1',
    },
    'EXT-X-MEDIA@GROUP-ID': {
        text: 'A string that specifies the group to which the Rendition belongs.',
        isoRef: 'RFC 8216, Section 4.3.4.1',
    },
    'EXT-X-MEDIA@LANGUAGE': {
        text: 'Identifies the primary language used in the Rendition.',
        isoRef: 'RFC 8216, Section 4.3.4.1',
    },
    'EXT-X-MEDIA@NAME': {
        text: 'A human-readable description of the Rendition.',
        isoRef: 'RFC 8216, Section 4.3.4.1',
    },
    'EXT-X-MEDIA@DEFAULT': {
        text: 'If YES, the client SHOULD play this Rendition in the absence of other choices.',
        isoRef: 'RFC 8216, Section 4.3.4.1',
    },
    'EXT-X-MEDIA@AUTOSELECT': {
        text: 'If YES, the client MAY choose this Rendition due to matching the current playback environment.',
        isoRef: 'RFC 8216, Section 4.3.4.1',
    },
    'EXT-X-MEDIA@CHANNELS': {
        text: 'Specifies the number of independent audio channels.',
        isoRef: 'RFC 8216, Section 4.3.4.1',
    },

    'EXT-X-STREAM-INF': {
        text: 'Specifies a Variant Stream. The URI of the Media Playlist follows on the next line.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@BANDWIDTH': {
        text: 'The peak segment bit rate of the Variant Stream in bits per second.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@AVERAGE-BANDWIDTH': {
        text: 'The average segment bit rate of the Variant Stream in bits per second.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@CODECS': {
        text: 'A comma-separated list of formats specifying media sample types present in the Variant Stream.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@RESOLUTION': {
        text: 'The optimal pixel resolution at which to display all video in the Variant Stream.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@FRAME-RATE': {
        text: 'The maximum frame rate for all video in the Variant Stream.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@NAME': {
        text: 'A human-readable name for the variant stream. This is not part of the HLS specification but is a common extension used by many packagers.',
        isoRef: 'Community Extension',
    },
    'EXT-X-STREAM-INF@AUDIO': {
        text: 'The GROUP-ID of the audio renditions that should be used with this variant.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@VIDEO': {
        text: 'The GROUP-ID of the video renditions that should be used with this variant.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@SUBTITLES': {
        text: 'The GROUP-ID of the subtitle renditions that can be used with this variant.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@CLOSED-CAPTIONS': {
        text: 'The GROUP-ID of the closed-caption renditions that can be used. If the value is NONE, all other Variant Streams must also have this attribute with a value of NONE.',
        isoRef: 'RFC 8216, Section 4.3.4.2',
    },
    'EXT-X-STREAM-INF@PROGRAM-ID': {
        text: 'A deprecated attribute that uniquely identified a program within the scope of the Playlist. Removed in protocol version 6.',
        isoRef: 'RFC 8216, Section 7',
    },

    'EXT-X-I-FRAME-STREAM-INF': {
        text: 'Identifies a Media Playlist file containing the I-frames of a multimedia presentation, for use in trick-play modes.',
        isoRef: 'RFC 8216, Section 4.3.4.3',
    },
    'EXT-X-SESSION-DATA': {
        text: 'Allows arbitrary session data to be carried in a Master Playlist.',
        isoRef: 'RFC 8216, Section 4.3.4.4',
    },
    'EXT-X-SESSION-KEY': {
        text: 'Allows encryption keys from Media Playlists to be specified in a Master Playlist, enabling key preloading.',
        isoRef: 'RFC 8216, Section 4.3.4.5',
    },

    // --- Media or Master Playlist Tags ---
    'EXT-X-INDEPENDENT-SEGMENTS': {
        text: 'Indicates that all media samples in a Media Segment can be decoded without information from other segments.',
        isoRef: 'RFC 8216, Section 4.3.5.1',
    },
    'EXT-X-START': {
        text: 'Indicates a preferred point at which to start playing a Playlist.',
        isoRef: 'RFC 8216, Section 4.3.5.2',
    },
    'EXT-X-START@TIME-OFFSET': {
        text: 'A time offset in seconds from the beginning of the Playlist (positive) or from the end (negative).',
        isoRef: 'RFC 8216, Section 4.3.5.2',
    },
    'EXT-X-START@PRECISE': {
        text: 'Whether clients should start playback precisely at the TIME-OFFSET (YES) or at the beginning of the segment (NO).',
        isoRef: 'RFC 8216, Section 4.3.5.2',
    },
};
