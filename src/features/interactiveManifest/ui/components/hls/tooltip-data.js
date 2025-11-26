/**
 * A comprehensive mapping of HLS playlist tags to their descriptions and RFC 8216bis (HLS 2nd Edition) references.
 * This structure is designed to provide rich, context-aware tooltips for developers and systems engineers architecting HLS-based streaming solutions.
 * Format: 'TagName' for tags, 'TagName@AttributeName' for attributes.
 */
export const hlsTooltipData = {
    // --- Basic Tags (Media or Multivariant) ---
    EXTM3U: {
        text: 'The mandatory file header. It identifies the file as an Extended M3U playlist. It MUST be the very first line of every HLS playlist file. Without this tag, most players will refuse to parse the file.',
        category: 'Basic',
        isoRef: 'HLS 2nd Ed: 4.4.1.1',
    },
    'EXT-X-VERSION': {
        text: 'Specifies the protocol compatibility version. If the playlist uses features introduced in later HLS versions (like floating-point durations or specific encryption methods), this tag MUST indicate a version number high enough to support them. Clients compliant only with lower versions may refuse to play the stream.',
        category: 'Basic',
        isoRef: 'HLS 2nd Ed: 4.4.1.2',
    },

    // --- Media or Multivariant Playlist Tags ---
    'EXT-X-DEFINE': {
        text: 'Declares a variable for substitution. Variables allow dynamic replacement of values (like URIs or query parameters) elsewhere in the playlist using the `{$NAME}` syntax. This reduces playlist size and allows for flexible, template-based stream generation.',
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@NAME': {
        text: "The specific case-sensitive name of the variable being defined. Future references to `{$NAME}` in the playlist will be replaced by this variable's value.",
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@VALUE': {
        text: 'The literal string value assigned to the variable. When the variable is referenced, this exact string is substituted.',
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@IMPORT': {
        text: 'Directs the client to import the value of a variable with this name from the parent Multivariant Playlist. This allows global configuration (like session tokens) to be passed down to individual Media Playlists.',
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-DEFINE@QUERYPARAM': {
        text: "Directs the client to read the value from a specific query parameter in the URL used to request the playlist. This enables dynamic configuration based on the client's request URL.",
        category: 'Variable Substitution',
        isoRef: 'HLS 2nd Ed: 4.4.2.3',
    },
    'EXT-X-INDEPENDENT-SEGMENTS': {
        text: 'Signals that every media segment in the playlist can be decoded completely independently of others (e.g., every segment starts with an IDR frame). This capability is required for features like I-Frame playlists and improves seeking performance.',
        category: 'Playlist Control',
        isoRef: 'HLS 2nd Ed: 4.4.2.1',
    },
    'EXT-X-START': {
        text: 'Specifies the preferred starting position for playback when the client first loads the playlist. It is commonly used in VOD to skip pre-roll content or in Live streams to define a specific "catch-up" offset.',
        category: 'Playlist Control',
        isoRef: 'HLS 2nd Ed: 4.4.2.2',
    },
    'EXT-X-START@TIME-OFFSET': {
        text: 'The time offset in seconds. A positive value is an offset from the beginning of the playlist; a negative value is an offset from the end of the last segment in the playlist.',
        category: 'Playlist Control',
        isoRef: 'HLS 2nd Ed: 4.4.2.2',
    },
    'EXT-X-START@PRECISE': {
        text: 'A boolean (YES/NO) indicating precision. If YES, the client should start decoding exactly at the TIME-OFFSET (potentially requiring decoding previous frames without rendering them). If NO, the client starts at the beginning of the segment containing the offset.',
        category: 'Playlist Control',
        isoRef: 'HLS 2nd Ed: 4.4.2.2',
    },

    // --- Media Playlist Tags ---
    'EXT-X-TARGETDURATION': {
        text: 'Specifies the maximum duration (in seconds) of any single Media Segment in the playlist. This value is critical because it defines the timing needed for the client to determine when to reload the playlist in live streaming scenarios. The server MUST NOT produce segments longer than this target.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.1',
    },
    'EXT-X-MEDIA-SEQUENCE': {
        text: 'The sequence number of the first segment currently appearing in the playlist file. In live streams where segments are removed from the top, this number increments, allowing the client to track continuity and maintain the correct playback order across playlist reloads.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.2',
    },
    'EXT-X-DISCONTINUITY-SEQUENCE': {
        text: 'A counter that allows synchronization of timestamps across different Variant Streams. It increments for every `EXT-X-DISCONTINUITY` tag encountered. This ensures that if a client switches bitrates during an ad break, it maps the segments correctly even if the timestamps reset.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.3',
    },
    'EXT-X-ENDLIST': {
        text: 'Marks the end of the presentation. It indicates that no further media segments will be appended to the playlist. If present, the client stops reloading the playlist. Used for VOD or completed live events.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.4',
    },
    'EXT-X-PLAYLIST-TYPE': {
        text: 'Defines the mutability of the playlist. `VOD` implies the playlist will never change. `EVENT` implies segments are only appended (growing file), allowing the user to seek back to the start of the event.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.5',
    },
    'EXT-X-I-FRAMES-ONLY': {
        text: 'Used in I-Frame Media Playlists. It indicates that the segments referred to in this playlist contain only I-frames (key frames). These playlists are used for "scrubbing" or high-speed seeking (trick play) operations.',
        category: 'Media Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.3.6',
    },
    'EXT-X-PART-INF': {
        text: 'Required when using Low-Latency HLS (LL-HLS). It acts as a global header declaring that this playlist contains Partial Segments and defines their expected duration.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.7',
    },
    'EXT-X-PART-INF@PART-TARGET': {
        text: 'The target duration for Partial Segments in seconds. Similar to TARGETDURATION, but for the smaller chunks used in Low-Latency HLS. Partial segments should typically not exceed this value.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.7',
    },
    'EXT-X-SERVER-CONTROL': {
        text: 'Advertises server capabilities for delivery optimizations, specifically for Low-Latency HLS. It tells the client if the server supports advanced features like blocking playlist reloads or delta updates.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@CAN-BLOCK-RELOAD': {
        text: 'If YES, the server accepts blocking requests. The client can request a specific future segment/part, and the server will hold the connection open until that data is available, reducing latency compared to standard polling.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@HOLD-BACK': {
        text: 'The recommended safe distance (in seconds) from the live edge for standard player buffering. Clients should not attempt to play closer to the live edge than this value to ensure stability.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@PART-HOLD-BACK': {
        text: 'The recommended safe distance (in seconds) from the live edge specifically for Low-Latency playback. This value is typically much smaller than HOLD-BACK.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@CAN-SKIP-UNTIL': {
        text: 'The "Skip Boundary". If the client requests a playlist delta update, the server can omit segments older than this duration from the response, significantly reducing playlist size overhead.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },
    'EXT-X-SERVER-CONTROL@CAN-SKIP-DATERANGES': {
        text: 'If YES, the server allows the client to request a Playlist Delta Update that omits older EXT-X-DATERANGE tags, further reducing the size of playlist responses.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.3.8',
    },

    // --- Media Segment Tags ---
    EXTINF: {
        text: 'Specifies the duration of the immediately following media segment. This is a mandatory tag for every segment. For version 3+ playlists, this should be a floating-point number to ensure accurate synchronization and prevent timing drift.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.1',
    },
    'EXT-X-BYTERANGE': {
        text: 'Indicates that the segment is a specific sub-range of the resource identified by its URI. Format: `length@offset`. This allows multiple logical segments to be packed into a single physical file, reducing HTTP request overhead.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.2',
    },
    'EXT-X-DISCONTINUITY': {
        text: 'Signals a significant change in the media stream properties (e.g., timestamp reset, file format change, encoding parameters). The player must reset its decoder state. Commonly found at the boundaries of inserted ads.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.3',
    },
    'EXT-X-KEY': {
        text: 'Defines encryption parameters for the media segments that follow. It remains in effect until a new EXT-X-KEY tag is encountered. HLS allows restarting the encryption chain or changing keys mid-stream.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@METHOD': {
        text: 'The encryption algorithm used. Common values: `AES-128` (Whole Segment), `SAMPLE-AES` (Sample level), `NONE`. Defines how the client should decrypt the payload.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@URI': {
        text: 'The URI where the client can fetch the decryption key. The response is usually binary key data. Required unless METHOD is NONE.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@IV': {
        text: 'Initialization Vector (128-bit hex). Used to seed the cipher block chaining. If omitted, the Sequence Number is used. Explicit IVs are recommended for better security and are required if the Sequence Number resets (e.g., after discontinuity).',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 5.2',
    },
    'EXT-X-KEY@KEYFORMAT': {
        text: 'Identifies the DRM system or key format (e.g., "identity", "urn:uuid:..."). Defaults to "identity" (Clear Key). This tells the client which CDM (Content Decryption Module) to use.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@KEYFORMATVERSIONS': {
        text: 'A slash-separated list of version numbers indicating which versions of the KEYFORMAT specification this key complies with.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.4.4',
    },
    'EXT-X-KEY@KEYID': {
        text: 'A vendor-specific attribute (commonly used with Widevine or FairPlay) to identify the specific key ID required for decryption within the DRM system.',
        category: 'Encryption',
        isoRef: 'Vendor Specific',
    },
    'EXT-X-MAP': {
        text: 'Defines the Media Initialization Section (e.g., the "moov" box in fMP4). This must be loaded and processed before any segments that follow can be decoded. Required for Fragmented MPEG-4.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.5',
    },
    'EXT-X-MAP@URI': {
        text: 'The URI of the resource containing the initialization data.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.5',
    },
    'EXT-X-MAP@BYTERANGE': {
        text: 'If the map is part of a larger file, this specifies the byte range `length@offset` for the initialization section.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.5',
    },
    'EXT-X-PROGRAM-DATE-TIME': {
        text: 'Maps the beginning of the segment to an absolute wall-clock time (ISO 8601). This allows the client to display the time of day, support "seek to live" functionality, and synchronize playback with external events (like SCTE-35 ad breaks).',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.6',
    },
    'EXT-X-GAP': {
        text: 'Indicates that the segment defined by the URI is missing or otherwise unavailable. The client should skip this duration without stalling. Useful in live archives where a segment failed to upload.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.7',
    },
    'EXT-X-BITRATE': {
        text: 'Specifies the approximate bitrate (in kilobits per second) for the segments that follow. This optional tag helps the client make better ABR decisions when only a portion of the playlist has been analyzed.',
        category: 'Media Segment',
        isoRef: 'HLS 2nd Ed: 4.4.4.8',
    },
    'EXT-X-PART': {
        text: 'Defines a Partial Segment (a small chunk of a full segment). Used in Low-Latency HLS to publish media to the client as soon as it is encoded, rather than waiting for the full segment to finish.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@URI': {
        text: 'The URI of the partial segment resource.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@DURATION': {
        text: 'The duration of the partial segment in seconds.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@INDEPENDENT': {
        text: 'If YES, the partial segment contains an Instantaneous Decoder Refresh (IDR) or independent frame. This allows the player to start playback at this partial segment without needing previous data.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@BYTERANGE': {
        text: 'Specifies the sub-range `length[@offset]` within the resource if the partial segment is part of a larger file.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },
    'EXT-X-PART@GAP': {
        text: 'If YES, indicates that this partial segment is unavailable and should be skipped.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.4.9',
    },

    // --- Media Metadata Tags ---
    'EXT-X-DATERANGE': {
        text: 'A versatile metadata tag used to define time-bound events, such as SCTE-35 ad breaks, program boundaries, or ID3 tags. It maps wall-clock time to specific metadata attributes.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@ID': {
        text: 'A required, unique string identifier for this date range. Used to track the event across playlist updates.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@CLASS': {
        text: 'A user-defined category for the range (e.g., "com.apple.hls.interstitial"). Clients can use this to filter and handle specific types of events differently.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@START-DATE': {
        text: 'The ISO 8601 date/time indicating exactly when the range begins. The client maps this to the EXT-X-PROGRAM-DATE-TIME of the segments.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@CUE': {
        text: 'Indicates event triggers relative to the range. Values: `PRE` (trigger before range), `POST` (after range), `ONCE` (only trigger the first time).',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@END-DATE': {
        text: 'The ISO 8601 date/time when the range ends. MUST be equal to or greater than START-DATE.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@DURATION': {
        text: 'The duration of the range in seconds. An alternative to specifying END-DATE.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@PLANNED-DURATION': {
        text: "The expected duration of the range. Used when the actual duration isn't known yet (e.g., start of a live ad break).",
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1',
    },
    'EXT-X-DATERANGE@X-ASSET-URI': {
        text: 'Used for Interstitials. Points to the URI of the content (e.g., an ad) that should replace or overlay the primary content during this range.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: Appendix D.2',
    },
    'EXT-X-DATERANGE@X-RESUME-OFFSET': {
        text: 'Used for Interstitials. Defines the time offset from the start of the interruption where the primary playback should resume after the interstitial finishes.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: Appendix D.2',
    },
    'EXT-X-DATERANGE@X-RESTRICT': {
        text: 'Used for Interstitials. Controls UI behavior, such as disabling seeking (`SKIP`) or forcing the user to watch the interstitial before seeking past it (`JUMP`).',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: Appendix D.2',
    },
    'EXT-X-DATERANGE@SCTE35-CMD': {
        text: 'Carries raw SCTE-35 command data (as a hex string) associated with the range.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1.1',
    },
    'EXT-X-DATERANGE@SCTE35-OUT': {
        text: 'Carries the SCTE-35 "out" command (splice_insert with out_of_network_indicator=1), signaling the start of a break.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1.1',
    },
    'EXT-X-DATERANGE@SCTE35-IN': {
        text: 'Carries the SCTE-35 "in" command (splice_insert with out_of_network_indicator=0), signaling the return to network feed.',
        category: 'Ad Insertion / Metadata',
        isoRef: 'HLS 2nd Ed: 4.4.5.1.1',
    },
    'EXT-X-SKIP': {
        text: 'Used in Playlist Delta Updates. It replaces a contiguous range of older segments that have "slid off" the top of the playlist window. This keeps the response size small by not re-transmitting data the client already has.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.2',
    },
    'EXT-X-SKIP@SKIPPED-SEGMENTS': {
        text: 'The number of media segments that have been replaced by this SKIP tag.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.2',
    },
    'EXT-X-SKIP@RECENTLY-REMOVED-DATERANGES': {
        text: 'A tab-delimited list of DATERANGE IDs that were removed from the playlist in the skipped region. This ensures the client knows metadata was removed even if the tags are gone.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.2',
    },
    'EXT-X-PRELOAD-HINT': {
        text: 'Provides a hint to the client to request a resource (like the next Partial Segment) before it is actually available. The server blocks the response until the data is ready. This minimizes round-trip latency.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@TYPE': {
        text: 'The type of resource being hinted. Typically `PART` (Partial Segment) or `MAP` (Media Initialization Section).',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@URI': {
        text: 'The URI of the future resource. The client sends a request for this URI immediately upon seeing the hint.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@BYTERANGE-START': {
        text: 'The byte offset of the start of the hinted resource within the target URI.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-PRELOAD-HINT@BYTERANGE-LENGTH': {
        text: 'The length of the hinted resource. If omitted, the client usually requests to the end of the file.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.3',
    },
    'EXT-X-RENDITION-REPORT': {
        text: 'Provides synchronization data (last sequence number and part) for *other* renditions in the Multivariant Playlist. This allows the client to switch renditions (ABR) in Low-Latency mode without incurring the penalty of fetching a stale playlist.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.4',
    },
    'EXT-X-RENDITION-REPORT@URI': {
        text: "The URI of the other rendition's Media Playlist.",
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.4',
    },
    'EXT-X-RENDITION-REPORT@LAST-MSN': {
        text: 'The Media Sequence Number of the last segment currently available in that rendition.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.4',
    },
    'EXT-X-RENDITION-REPORT@LAST-PART': {
        text: 'The index of the last Partial Segment currently available in that rendition.',
        category: 'Low-Latency HLS',
        isoRef: 'HLS 2nd Ed: 4.4.5.4',
    },

    // --- Multivariant (Master) Playlist Tags ---
    'EXT-X-MEDIA': {
        text: 'Defines an alternative rendition (Audio, Video, Subtitles, Closed Captions) that can be associated with a Variant Stream. This is how HLS handles multi-language audio tracks or different camera angles.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@TYPE': {
        text: 'The type of media. Valid values: `AUDIO`, `VIDEO`, `SUBTITLES`, `CLOSED-CAPTIONS`.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@URI': {
        text: 'The URI of the Media Playlist for this rendition. Optional for Audio/Video if the data is muxed into the main stream.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@GROUP-ID': {
        text: 'An identifier string. All EXT-X-MEDIA tags with the same GROUP-ID belong to the same group. Variant Streams (`EXT-X-STREAM-INF`) reference this ID to determine which audio/subtitle tracks are available to them.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@LANGUAGE': {
        text: 'The primary language of the rendition (RFC 5646, e.g., "en", "es-ES"). Used by the player to select the correct track based on user preferences.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@ASSOC-LANGUAGE': {
        text: 'An associated language tag. Often used when the written and spoken languages differ, or to identify a dialect.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@NAME': {
        text: 'A human-readable description of the rendition (e.g., "Director\'s Commentary"). This text is typically displayed in the player\'s settings UI.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@STABLE-RENDITION-ID': {
        text: 'A stable identifier that persists across playlist reloads. Allows specific renditions to be tracked even if URLs change (e.g., for Content Steering or analytics).',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@DEFAULT': {
        text: 'If YES, this is the default selection if the user has no other language preference. Implicitly NO if omitted.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@AUTOSELECT': {
        text: 'If YES, the client may automatically select this rendition based on system environment (e.g., system language matches LANGUAGE). If NO, the user must explicitly select it.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@FORCED': {
        text: 'Applies only to SUBTITLES. If YES, these subtitles are "forced" (e.g., alien language translation in an English movie) and should be shown even if subtitles are globally off, provided the language matches.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@INSTREAM-ID': {
        text: 'Maps the rendition to a specific track within the media stream. For Closed Captions, values are `CC1`-`CC4` or `SERVICE1`-`SERVICE63`.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@BIT-DEPTH': {
        text: 'The audio bit depth (e.g., 16, 24). Helps the player choose the highest quality audio supported by the hardware.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@SAMPLE-RATE': {
        text: 'The audio sample rate in Hz. Useful for identifying high-resolution audio tracks.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@CHARACTERISTICS': {
        text: 'A comma-separated list of UTIs indicating specific features, such as `public.accessibility.describes-video` (Audio Description) or `public.easy-to-read`.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-MEDIA@CHANNELS': {
        text: 'Details the audio channel count and configuration (e.g., "6" for 5.1 surround, or specific spatial audio parameters).',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.1',
    },
    'EXT-X-STREAM-INF': {
        text: 'Defines a Variant Stream—a version of the content at a specific quality level/bitrate. The line following this tag MUST be the URI of the Media Playlist for this variant.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@BANDWIDTH': {
        text: 'The peak segment bitrate of the stream in bits per second. This is the primary metric used by the Adaptive Bitrate (ABR) algorithm to decide which stream to play based on available network speed.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@AVERAGE-BANDWIDTH': {
        text: 'The average bitrate of the stream. This provides a more accurate long-term measurement for ABR than the peak BANDWIDTH.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@SCORE': {
        text: 'A preference score (float). When multiple variants have similar technical attributes, the player should prefer the one with the higher SCORE.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@CODECS': {
        text: 'A list of codecs present in the stream (e.g., "avc1.4d401e,mp4a.40.2"). Critical for the player to determine if the device hardware supports decoding the stream before attempting playback.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@SUPPLEMENTAL-CODECS': {
        text: 'Lists codecs for backward-compatible enhancement layers (like Dolby Vision). Allows devices that support the enhancement to identify it, while legacy devices look only at CODECS.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@RESOLUTION': {
        text: 'The resolution (Width x Height) of the video in the stream.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@FRAME-RATE': {
        text: 'The maximum frame rate of the video. Important for devices that may support 4K at 30fps but not 60fps.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@HDCP-LEVEL': {
        text: 'Advisory. Indicates if the content requires High-bandwidth Digital Content Protection (HDCP) on the output (e.g., `TYPE-0`, `TYPE-1`). If the device cannot enforce this, it should not pick this stream.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@ALLOWED-CPC': {
        text: "Content Protection Configuration. Allows filtering variants based on the robustness of the device's DRM implementation (e.g., limiting 4K to hardware-backed DRM).",
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@VIDEO-RANGE': {
        text: 'Specifies dynamic range: `SDR`, `HLG`, or `PQ`. Essential for identifying HDR content.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@REQ-VIDEO-LAYOUT': {
        text: 'Indicates specialized rendering requirements, such as Stereo Video (3D) or specific VR projections.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@STABLE-VARIANT-ID': {
        text: 'A stable ID for this variant. Required for Content Steering to map variants across different Content Delivery Networks (CDNs).',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@PATHWAY-ID': {
        text: 'Identifies the Content Steering Pathway (e.g., "CDN-A") this variant belongs to. The Content Steering manifest uses this to prioritize traffic.',
        category: 'Client Control',
        isoRef: 'HLS 2nd Ed: 4.4.6.2',
    },
    'EXT-X-STREAM-INF@AUDIO': {
        text: 'Links this variant to a specific `EXT-X-MEDIA` group of type AUDIO via its GROUP-ID.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2.1',
    },
    'EXT-X-STREAM-INF@VIDEO': {
        text: 'Links this variant to a specific `EXT-X-MEDIA` group of type VIDEO via its GROUP-ID. Used for alternate camera angles.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2.1',
    },
    'EXT-X-STREAM-INF@SUBTITLES': {
        text: 'Links this variant to a specific `EXT-X-MEDIA` group of type SUBTITLES via its GROUP-ID.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2.1',
    },
    'EXT-X-STREAM-INF@CLOSED-CAPTIONS': {
        text: 'Links this variant to a specific `EXT-X-MEDIA` group of type CLOSED-CAPTIONS, or `NONE`.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.2.1',
    },
    'EXT-X-STREAM-INF@PROGRAM-ID': {
        text: 'Uniquely identifies a program within the scope of the playlist. (This attribute was removed in protocol version 6).',
        category: 'Multivariant Playlist',
        isoRef: 'RFC 8216 (superseded)',
    },
    'EXT-X-STREAM-INF@NAME': {
        text: 'A non-standard but commonly used attribute providing a human-readable name for the variant stream for debugging or UI selection.',
        category: 'Multivariant Playlist',
        isoRef: 'Vendor Specific / Common Practice',
    },
    'EXT-X-I-FRAME-STREAM-INF': {
        text: 'Defines a variant stream comprised solely of I-frames (thumbnails). These are used for scrubbing/seeking UIs.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@URI': {
        text: 'The URI of the I-Frame Media Playlist.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@BANDWIDTH': {
        text: 'The peak bitrate of the I-frame stream.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@AVERAGE-BANDWIDTH': {
        text: 'The average bitrate of the I-frame stream.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@CODECS': {
        text: 'The codecs used in the I-frame stream.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@RESOLUTION': {
        text: 'The resolution of the I-frames.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@FRAME-RATE': {
        text: 'The maximum frame rate of the video in the I-frame playlist.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-I-FRAME-STREAM-INF@VIDEO-RANGE': {
        text: 'The dynamic range (SDR/HLG/PQ) of the I-frames.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.3',
    },
    'EXT-X-SESSION-DATA': {
        text: 'Carries arbitrary session data in the Multivariant Playlist. Used for metadata, analytics IDs, or HLS feature extensions like "Localization Dictionaries".',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.4',
    },
    'EXT-X-SESSION-DATA@DATA-ID': {
        text: 'A unique identifier for the data (e.g., "com.example.movie.title").',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.4',
    },
    'EXT-X-SESSION-DATA@VALUE': {
        text: 'The string value of the data. Must be present if URI is omitted.',
        category: 'Multivariant Playlist',
        isoRef: 'HLS 2nd Ed: 4.4.6.4',
    },
    'EXT-X-SESSION-KEY': {
        text: 'Allows the client to load encryption keys from the Multivariant Playlist *before* selecting a specific variant. This improves startup time for encrypted streams.',
        category: 'Encryption',
        isoRef: 'HLS 2nd Ed: 4.4.6.5',
    },
    'EXT-X-CONTENT-STEERING': {
        text: 'Enables Content Steering. Points to an external "Steering Manifest" JSON that the client polls to determine which CDN pathway to use. Allows real-time traffic shifting by the content provider.',
        category: 'Client Control',
        isoRef: 'HLS 2nd Ed: 4.4.6.6',
    },
};
