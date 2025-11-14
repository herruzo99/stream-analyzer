/**
 * A comprehensive mapping of HLS playlist tags to their descriptions and RFC 8216bis (HLS 2nd Edition) references.
 * This structure is designed to provide rich, context-aware tooltips for developers and systems engineers architecting HLS-based streaming solutions.
 * Each entry includes a `category` for logical grouping and a `isoRef` to the specific clause in the specification.
 * Format: 'TagName' for tags, 'TagName@AttributeName' for attributes.
 */
export const hlsTooltipData = {
    // --- Basic Tags (Media or Multivariant) ---
    EXTM3U: {
        text: 'The mandatory header for all HLS playlists. It indicates that the file is an Extended M3U playlist and MUST be the first line of the file. Its presence is the primary way clients identify an HLS manifest.',
        category: 'Basic',
        isoRef: 'HLS 2nd Ed: 4.4.1.1',
    },
    'EXT-X-VERSION': {
        text: 'Indicates the compatibility version of the playlist. The version number dictates which features and tags are valid. A server MUST provide a version number high enough to support all features used in the playlist to ensure interoperability with clients.',
        category: 'Basic',
        isoRef: 'HLS 2nd Ed: 4.4.1.2',
    },

    // --- Media or Multivariant Playlist Tags ---
    'EXT-X-DEFINE': {
        text: 'Defines a playlist variable. Its value can be substituted into other playlist elements, enabling the creation of dynamic, reusable, and less verbose playlist templates. Crucial for reducing manifest size and complexity.',
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@NAME': {
        text: 'The name of the variable being explicitly defined for substitution within the current playlist.',
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@VALUE': {
        text: 'The string value that will replace references to the variable.',
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@IMPORT': {
        text: 'The name of a variable to import from the parent Multivariant Playlist. This allows media playlists to inherit values, centralizing configuration.',
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@QUERYPARAM': {
        text: 'The name of a URI query parameter whose value will be used to define this variable. This enables client-specific parameterization of playlists.',
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-INDEPENDENT-SEGMENTS': {
        text: 'Indicates that all media samples in every segment can be decoded without information from other segments. This is a prerequisite for features like I-frame playlists and can improve seeking performance.',
        category: 'Playlist Control',
        isoRef: 'HLS 2nd Ed: 4.4.2.1',
    },
    'EXT-X-START': {
        text: 'Indicates a preferred starting point for playback. Useful for highlighting a specific point in a VOD asset or for setting a default live offset to ensure a good startup experience.',
        category: 'Playlist Control',
        isoRef: 'HLS 2nd Ed: 4.4.2.2',
    },
    'EXT-X-START@TIME-OFFSET': {
        text: 'A required floating-point number of seconds from the beginning of the playlist (positive) or from the end (negative), specifying the preferred start point.',
        category: 'Playlist Control',
        isoRef: 'HLS 2nd Ed: 4.4.2.2',
    },
    'EXT-X-START@PRECISE': {
        text: 'If YES, clients SHOULD not render media prior to the TIME-OFFSET, enabling frame-accurate starts. Important for precise ad-insertion or event start times. Default is NO.',
        category: 'Playlist Control',
        isoRef: 'HLS 2nd Ed: 4.4.2.2',
    },

    // --- Media Playlist Tags ---
    'EXT-X-TARGETDURATION': {
        text: "A required tag specifying the maximum media segment duration in seconds. It provides the fundamental time base for a client's reload logic in live streams.",
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.1',
    },
    'EXT-X-MEDIA-SEQUENCE': {
        text: 'Indicates the sequence number of the first media segment in the playlist. This number increments with each segment removed from a sliding-window live playlist, allowing clients to correctly sequence segments across playlist reloads.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.2',
    },
    'EXT-X-DISCONTINUITY-SEQUENCE': {
        text: 'Allows synchronization between different renditions of the same variant stream across discontinuities. Each discontinuity increments a shared counter, ensuring clients can switch renditions seamlessly even after ad breaks or encoding changes.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.3',
    },
    'EXT-X-ENDLIST': {
        text: 'Indicates that no more media segments will be added to the playlist. This signals the end of a VOD presentation or a live event, telling the client it can stop reloading the manifest.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.4',
    },
    'EXT-X-PLAYLIST-TYPE': {
        text: 'Provides mutability information about the Media Playlist. VOD means the playlist is static. EVENT means segments can only be appended but not removed, useful for DVR functionality.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.5',
    },
    'EXT-X-I-FRAMES-ONLY': {
        text: 'Indicates that each media segment in the playlist describes a single I-frame. This is a key enabler for trick-play modes (fast-forward, rewind), as I-frames are self-contained and can be decoded independently.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.6',
    },
    'EXT-X-PART-INF': {
        text: 'Provides information about the Partial Segments in the playlist. It is a required declaration for using the Low-Latency HLS extension.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.7',
    },
    'EXT-X-PART-INF@PART-TARGET': {
        text: 'A required attribute specifying the target duration of Partial Segments in seconds. This defines the smaller time base for low-latency playback.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.7',
    },
    'EXT-X-SERVER-CONTROL': {
        text: 'Allows the server to advertise support for low-latency HLS features, fundamentally changing the client-server interaction model from simple polling to more efficient methods like blocking requests.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@CAN-BLOCK-RELOAD': {
        text: 'If YES, the server supports Blocking Playlist Reload, where a client can request an update and the server will hold the request until the update is available. This significantly reduces polling traffic for live streams.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@HOLD-BACK': {
        text: 'The server-recommended minimum distance from the live edge (in seconds) for standard HLS playback. Its value MUST be at least three times the Target Duration.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@PART-HOLD-BACK': {
        text: 'The server-recommended minimum distance from the live edge (in seconds) for Low-Latency HLS playback. Its value MUST be at least twice the Part Target Duration.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@CAN-SKIP-UNTIL': {
        text: 'The "Skip Boundary" in seconds. If present, the server can generate Playlist Delta Updates, skipping segments older than this boundary from the live edge, making manifest updates smaller and faster.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },

    // --- Media Segment Tags ---
    EXTINF: {
        text: 'Specifies the duration (in seconds) of the media segment that immediately follows this tag. A required tag for every media segment.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.1',
    },
    'EXT-X-BYTERANGE': {
        text: 'Indicates that a media segment is a sub-range of the resource identified by its URI. Format is <length>[@<offset>]. This allows multiple segments to be stored in a single file, which can be more efficient for caching and storage.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.2',
    },
    'EXT-X-DISCONTINUITY': {
        text: 'Indicates a discontinuity between media segments, signaling a change in encoding parameters, timestamps, or format. Crucial for ad insertion and stream stitching, as it instructs the client to reset its decoder state.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.3',
    },
    'EXT-X-KEY': {
        text: 'Specifies the decryption key for media segments. It applies to all subsequent segments until overridden by another EXT-X-KEY tag.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@METHOD': {
        text: 'The encryption method. Valid values: NONE, AES-128, SAMPLE-AES. SAMPLE-AES-CTR is also used. Defines how segments are encrypted.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@URI': {
        text: 'The URI from which the encryption key can be fetched. Required unless METHOD is NONE.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@IV': {
        text: 'A 128-bit hexadecimal Initialization Vector. If absent, the Media Sequence Number is used as the IV. Varying the IV per segment is a critical security practice.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 5.2',
    },
    'EXT-X-KEY@KEYFORMAT': {
        text: 'Specifies how the key is represented in the resource identified by the URI (e.g., "identity", "skd", "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed" for Widevine). Defaults to "identity". Essential for DRM interoperability.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@KEYFORMATVERSIONS': {
        text: 'A slash-separated list of integers indicating which version(s) of a KEYFORMAT this instance complies with.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@KEYID': {
        text: 'A hexadecimal identifier for the key, specific to certain DRM systems (e.g., Widevine, FairPlay). This is not part of the HLS RFC but is common practice.',
        category: 'Encryption',
        isoRef: 'Vendor Specific',
    },
    'EXT-X-MAP': {
        text: 'Specifies the Media Initialization Section (e.g., fMP4 "moov" box) required to parse the segments that follow. Essential for fMP4-based HLS, as it contains decoder setup information.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.5',
    },
    'EXT-X-MAP@URI': {
        text: 'A required quoted-string containing a URI that identifies a resource that contains the Media Initialization Section.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.5',
    },
    'EXT-X-MAP@BYTERANGE': {
        text: 'A quoted-string specifying a byte range into the resource identified by the URI attribute. This allows the Media Initialization Section to be a sub-range of a larger file.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.5',
    },
    'EXT-X-PROGRAM-DATE-TIME': {
        text: 'Associates the first sample of the next media segment with an absolute wall-clock time (ISO 8601). This provides the anchor for timeline synchronization, seeking, and displaying program guides.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.6',
    },
    'EXT-X-GAP': {
        text: 'Indicates the segment URI it applies to is not available and SHOULD NOT be loaded. It represents a gap in the media timeline, often due to an upstream issue in a live workflow.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.7',
    },
    'EXT-X-BITRATE': {
        text: 'Identifies the approximate segment bit rate of the Media Segment(s) to which it applies. This can help clients make more informed ABR decisions when segment sizes are not yet known.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.8',
    },
    'EXT-X-PART': {
        text: 'Identifies a Partial Segment, a smaller portion of a Media Segment. This is the core mechanism for delivering media chunks in Low-Latency HLS.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@DURATION': {
        text: 'The required duration of the Partial Segment in seconds.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@INDEPENDENT': {
        text: 'If YES, indicates the Partial Segment contains an I-frame, making it a valid entry point for playback. Essential for fast channel changes and seeking in low-latency streams.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },

    // --- Media Metadata Tags ---
    'EXT-X-DATERANGE': {
        text: 'Associates a range of time with a set of custom attributes. Its primary use is for in-band ad signaling (SCTE-35) and other timed metadata events.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@ID': {
        text: 'A required, unique identifier for this date range instance.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@CLASS': {
        text: 'A client-defined string that specifies a set of attributes and their value semantics, e.g., "com.apple.hls.interstitial" for ads.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@START-DATE': {
        text: 'A required ISO 8601 date specifying the beginning of the date range.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@CUE': {
        text: 'A list of triggers (PRE, POST, ONCE) indicating when an action associated with the range should occur, allowing actions to happen outside the date range itself.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@END-DATE': {
        text: 'The date at which the range ends. MUST be equal to or later than START-DATE.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@DURATION': {
        text: 'The duration of the date range in seconds.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@PLANNED-DURATION': {
        text: 'The expected duration of the date range, used when the actual duration is not yet known.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@X-ASSET-URI': {
        text: '(Interstitial) An absolute URI for a single interstitial asset (e.g., an ad creative playlist).',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: Appendix D.2',
    },
    'EXT-X-DATERANGE@X-RESUME-OFFSET': {
        text: "(Interstitial) A time offset from the interstitial's start point at which primary content playback should resume.",
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: Appendix D.2',
    },
    'EXT-X-DATERANGE@X-RESTRICT': {
        text: '(Interstitial) Navigation restrictions during interstitial playback. Valid values include SKIP and JUMP.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: Appendix D.2',
    },
    'EXT-X-SKIP': {
        text: 'Used in a Playlist Delta Update to replace older Media Segments that have been skipped, making the playlist diff smaller and more efficient for live streams.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.2',
    },
    'EXT-X-PRELOAD-HINT': {
        text: 'Suggests that a client preload a resource (like a Partial Segment or MAP) before it appears in the main playlist, reducing latency on fetch. A cornerstone of Low-Latency HLS.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-RENDITION-REPORT': {
        text: "Provides an up-to-date report on the last media sequence/part number of another rendition, allowing a client to make informed ABR switches in low-latency mode without fetching that rendition's playlist.",
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.4',
    },

    // --- Multivariant (Master) Playlist Tags ---
    'EXT-X-MEDIA': {
        text: 'Defines an alternative rendition for a specific content component (AUDIO, VIDEO, SUBTITLES, CLOSED-CAPTIONS) and groups them via a GROUP-ID. This is the core tag for providing multiple languages, camera angles, etc.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@TYPE': {
        text: 'A required enumerated-string specifying the media type: AUDIO, VIDEO, SUBTITLES, or CLOSED-CAPTIONS.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@URI': {
        text: 'A quoted-string containing a URI that identifies the Media Playlist file for this rendition. Optional for AUDIO/VIDEO if multiplexed.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@GROUP-ID': {
        text: 'A required string that logically groups a set of alternative renditions. An EXT-X-STREAM-INF tag refers to this ID to associate itself with the group.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@LANGUAGE': {
        text: 'A quoted-string containing one of the standard Tags for Identifying Languages [RFC5646], which identifies the primary language used in the Rendition. This attribute is OPTIONAL.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@ASSOC-LANGUAGE': {
        text: 'A quoted-string containing a language tag [RFC5646] that identifies a language that is associated with the Rendition. An associated language is often used in a different role than the language specified by the LANGUAGE attribute (e.g., written versus spoken, or a fallback dialect). This attribute is OPTIONAL.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@NAME': {
        text: 'A required quoted-string containing a human-readable description of the Rendition. If the LANGUAGE attribute is present, then this description SHOULD be in that language.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@STABLE-RENDITION-ID': {
        text: "A quoted-string which is a stable identifier for the URI within the Multivariant Playlist. All characters in the quoted-string MUST be from the following set: [a-z], [A-Z], [0-9], '+', '/', '=', '.', '-', and '_'. This attribute is OPTIONAL.",
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@DEFAULT': {
        text: 'If YES, the client SHOULD play this Rendition in the absence of other user preferences. Valid values are YES and NO. Its absence indicates an implicit value of NO.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@AUTOSELECT': {
        text: 'If YES, the client MAY choose to play this Rendition if it matches the current playback environment (e.g. system language) and no explicit user preference is set. Its absence indicates an implicit value of NO.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@FORCED': {
        text: 'If YES, indicates the Rendition contains content considered essential to play (e.g. subtitles for foreign dialogue). Must only be present for SUBTITLES. Valid values are YES and NO.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@INSTREAM-ID': {
        text: 'Specifies a Rendition within the segments in the Media Playlist, such as "CC1" for CEA-608 closed captions or "SERVICE1" for CEA-708.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@BIT-DEPTH': {
        text: 'A non-negative decimal-integer specifying the audio bit depth of the Rendition. Allows players to select Renditions appropriate for available hardware.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@SAMPLE-RATE': {
        text: 'A non-negative decimal-integer specifying the audio sample rate of the Rendition. Useful for identifying Renditions that can be played without sample rate conversion.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@CHARACTERISTICS': {
        text: 'A comma-separated list of Uniform Type Identifiers (UTIs) indicating individual characteristics of the Rendition (e.g., "public.accessibility.describes-video").',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@CHANNELS': {
        text: 'A quoted-string specifying an ordered, slash-separated list of parameters describing the audio channel configuration, starting with the channel count.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-STREAM-INF': {
        text: 'Defines a Variant Stream, a specific combination of renditions at a given bandwidth. The URI of its primary Media Playlist follows on the next line.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@BANDWIDTH': {
        text: 'A required integer specifying the peak bit rate of the Variant Stream in bits per second. This is the primary input for ABR algorithms.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@AVERAGE-BANDWIDTH': {
        text: 'An optional integer specifying the average bit rate of the Variant Stream. Can provide a more stable metric for ABR logic than peak bandwidth.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@SCORE': {
        text: "An optional floating-point value indicating the author's preference for this variant. Higher scores are better. Used to guide ABR decisions beyond just bandwidth.",
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@CODECS': {
        text: 'A required, comma-separated list of RFC 6381 strings specifying all media sample types present in the Variant Stream.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@SUPPLEMENTAL-CODECS': {
        text: 'Describes media with a backward-compatible base layer (in CODECS) and a newer enhancement layer (e.g., for HDR formats like Dolby Vision).',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@RESOLUTION': {
        text: 'The optimal display resolution (width x height) for the video in this Variant Stream.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@FRAME-RATE': {
        text: 'The maximum frame rate for all video in the Variant Stream, rounded to three decimal places.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@HDCP-LEVEL': {
        text: 'Indicates that the stream may require a specific level of High-bandwidth Digital Content Protection (HDCP) to play.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@VIDEO-RANGE': {
        text: 'Specifies the video dynamic range. Valid values are SDR (Standard), HLG, and PQ (for HDR).',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@STABLE-VARIANT-ID': {
        text: 'A stable identifier for this variant stream that persists across manifest reloads, crucial for content steering and offline scenarios.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@PATHWAY-ID': {
        text: 'Associates the Variant Stream with a Content Steering Pathway, enabling server-side redundancy and load balancing.',
        category: 'Client Control',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@AUDIO': {
        text: 'A quoted-string matching a GROUP-ID of an EXT-X-MEDIA tag with TYPE=AUDIO, indicating the set of audio renditions for this variant.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2.1',
    },
    'EXT-X-STREAM-INF@VIDEO': {
        text: 'A quoted-string matching a GROUP-ID of an EXT-X-MEDIA tag with TYPE=VIDEO, indicating the set of video renditions for this variant.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2.1',
    },
    'EXT-X-STREAM-INF@SUBTITLES': {
        text: 'A quoted-string matching a GROUP-ID of an EXT-X-MEDIA tag with TYPE=SUBTITLES, indicating the set of subtitle renditions for this variant.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2.1',
    },
    'EXT-X-STREAM-INF@CLOSED-CAPTIONS': {
        text: 'A quoted-string matching a GROUP-ID of an EXT-X-MEDIA tag with TYPE=CLOSED-CAPTIONS, or NONE if no captions are available for this variant.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2.1',
    },
    'EXT-X-STREAM-INF@PROGRAM-ID': {
        text: 'A decimal-integer that uniquely identifies a program within the scope of the playlist. (Deprecated in protocol version 6).',
        category: 'Multivariant Playlist',
        isoRef: 'RFC 8216 (superseded)',
    },
    'EXT-X-STREAM-INF@NAME': {
        text: 'A quoted-string containing a human-readable name for the rendition. While not in the IETF RFC, it is commonly used by players to label variants in UI.',
        category: 'Multivariant Playlist',
        isoRef: 'Vendor Specific / Common Practice',
    },
    'EXT-X-I-FRAME-STREAM-INF': {
        text: 'Identifies a Media Playlist file containing the I-frames of a multimedia presentation. It is used to support client-side trick-play modes.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@URI': {
        text: 'A required quoted-string containing a URI that identifies the I-frame Media Playlist file. This playlist MUST contain an EXT-X-I-FRAMES-ONLY tag.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@BANDWIDTH': {
        text: 'The required peak bit rate of the I-frame Variant Stream in bits per second. This is a required attribute.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@AVERAGE-BANDWIDTH': {
        text: 'The optional average bit rate of the I-frame Variant Stream in bits per second.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@CODECS': {
        text: 'A required, comma-separated list of RFC 6381 strings specifying all media sample types present in the I-frame Variant Stream.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@RESOLUTION': {
        text: 'The optimal display resolution (width x height) for the video in this I-frame Variant Stream.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@FRAME-RATE': {
        text: 'The maximum frame rate for all video in the I-Frame playlist, specified as a decimal-floating-point number.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@VIDEO-RANGE': {
        text: 'Specifies the video dynamic range for the I-Frame stream. Valid values are SDR, HLG, and PQ.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-SESSION-DATA': {
        text: 'Allows arbitrary session data (e.g., a JSON object) to be carried in a Multivariant Playlist. Used for features like Localization Dictionaries or Custom Media Selection.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.4',
    },
    'EXT-X-SESSION-DATA@DATA-ID': {
        text: 'A required, unique quoted-string that identifies the data value within the Playlist. Its format is typically a reverse-DNS string.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.4',
    },
    'EXT-X-SESSION-DATA@VALUE': {
        text: 'A quoted-string containing the data value. It must be present if a URI is not.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.4',
    },
    'EXT-X-SESSION-KEY': {
        text: 'Specifies an encryption key that applies to the entire session. This allows clients to preload keys from the Multivariant Playlist before fetching media playlists.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.6.5',
    },
    'EXT-X-CONTENT-STEERING': {
        text: 'Provides a URI to a Content Steering Manifest, enabling dynamic, server-driven redirection of clients to alternate delivery pathways for improved reliability.',
        category: 'Client Control',
        isoRef: 'HLS 2nd Ed: 4.4.6.6',
    },
};