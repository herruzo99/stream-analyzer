const Severity = {
    1: 'RECOVERABLE',
    2: 'CRITICAL',
};

const Category = {
    1: 'NETWORK',
    2: 'TEXT',
    3: 'MEDIA',
    4: 'MANIFEST',
    5: 'STREAMING',
    6: 'DRM',
    7: 'PLAYER',
    8: 'CAST',
    9: 'STORAGE',
    10: 'ADS',
};

const Code = {
    1000: {
        name: 'UNSUPPORTED_SCHEME',
        description:
            'A network request was made using an unsupported URI scheme.',
    },
    1001: {
        name: 'BAD_HTTP_STATUS',
        description:
            'An HTTP network request returned an HTTP status that indicated a failure.',
    },
    1002: {
        name: 'HTTP_ERROR',
        description:
            'An HTTP network request failed with an error, but not from the server.',
    },
    1003: { name: 'TIMEOUT', description: 'A network request timed out.' },
    1004: {
        name: 'MALFORMED_DATA_URI',
        description: 'A network request was made with a malformed data URI.',
    },
    1006: {
        name: 'REQUEST_FILTER_ERROR',
        description: 'A request filter threw an error.',
    },
    1007: {
        name: 'RESPONSE_FILTER_ERROR',
        description: 'A response filter threw an error.',
    },
    1010: {
        name: 'ATTEMPTS_EXHAUSTED',
        description: 'The number of retry attempts have run out.',
    },
    1011: { name: 'SEGMENT_MISSING', description: 'The segment is missing.' },
    2000: {
        name: 'INVALID_TEXT_HEADER',
        description:
            'The text parser failed to parse a text stream due to an invalid header.',
    },
    2001: {
        name: 'INVALID_TEXT_CUE',
        description:
            'The text parser failed to parse a text stream due to an invalid cue.',
    },
    2003: {
        name: 'UNABLE_TO_DETECT_ENCODING',
        description:
            'Was unable to detect the encoding of the response text. Suggest adding byte-order-markings to the response data.',
    },
    2004: {
        name: 'BAD_ENCODING',
        description:
            'The response data contains invalid Unicode character encoding.',
    },
    2005: {
        name: 'INVALID_XML',
        description:
            'The XML parser failed to parse an xml stream, or the XML lacks mandatory elements for TTML.',
    },
    2007: {
        name: 'INVALID_MP4_TTML',
        description: 'MP4 segment does not contain TTML.',
    },
    2008: {
        name: 'INVALID_MP4_VTT',
        description: 'MP4 segment does not contain VTT.',
    },
    2009: {
        name: 'UNABLE_TO_EXTRACT_CUE_START_TIME',
        description:
            'When examining media in advance, we were unable to extract the cue time.',
    },
    2010: {
        name: 'INVALID_MP4_CEA',
        description: 'MP4 segment for CEA data is invalid.',
    },
    2011: {
        name: 'TEXT_COULD_NOT_GUESS_MIME_TYPE',
        description: 'Unable to guess mime type of the text.',
    },
    2012: {
        name: 'CANNOT_ADD_EXTERNAL_TEXT_TO_SRC_EQUALS',
        description:
            "External text tracks cannot be added in src= because native platform doesn't support it.",
    },
    2013: {
        name: 'TEXT_ONLY_WEBVTT_SRC_EQUALS',
        description: 'Only WebVTT is supported when using src=.',
    },
    2014: {
        name: 'MISSING_TEXT_PLUGIN',
        description:
            'The compilation does not contain a required text plugin for this operation.',
    },
    2017: {
        name: 'UNSUPPORTED_EXTERNAL_THUMBNAILS_URI',
        description: 'Only external urls of WebVTT type are supported.',
    },
    3000: {
        name: 'BUFFER_READ_OUT_OF_BOUNDS',
        description:
            'Some component tried to read past the end of a buffer. The segment index, init segment, or PSSH may be malformed.',
    },
    3001: {
        name: 'JS_INTEGER_OVERFLOW',
        description:
            'Some component tried to parse an integer that was too large to fit in a JavaScript number without rounding error.',
    },
    3002: {
        name: 'EBML_OVERFLOW',
        description:
            'The EBML parser used to parse the WebM container encountered an integer, ID, or other field larger than the maximum supported by the parser.',
    },
    3003: {
        name: 'EBML_BAD_FLOATING_POINT_SIZE',
        description:
            'The EBML parser used to parse the WebM container encountered a floating-point field of a size not supported by the parser.',
    },
    3004: {
        name: 'MP4_SIDX_WRONG_BOX_TYPE',
        description:
            'The MP4 SIDX parser found the wrong box type. Either the segment index range is incorrect or the data is corrupt.',
    },
    3005: {
        name: 'MP4_SIDX_INVALID_TIMESCALE',
        description:
            'The MP4 SIDX parser encountered an invalid timescale. The segment index data may be corrupt.',
    },
    3006: {
        name: 'MP4_SIDX_TYPE_NOT_SUPPORTED',
        description:
            'The MP4 SIDX parser encountered a type of SIDX that is not supported.',
    },
    3007: {
        name: 'WEBM_CUES_ELEMENT_MISSING',
        description:
            'The WebM Cues parser was unable to locate the Cues element. The segment index data may be corrupt.',
    },
    3008: {
        name: 'WEBM_EBML_HEADER_ELEMENT_MISSING',
        description:
            'The WebM header parser was unable to locate the Ebml element. The init segment data may be corrupt.',
    },
    3009: {
        name: 'WEBM_SEGMENT_ELEMENT_MISSING',
        description:
            'The WebM header parser was unable to locate the Segment element. The init segment data may be corrupt.',
    },
    3010: {
        name: 'WEBM_INFO_ELEMENT_MISSING',
        description:
            'The WebM header parser was unable to locate the Info element. The init segment data may be corrupt.',
    },
    3011: {
        name: 'WEBM_DURATION_ELEMENT_MISSING',
        description:
            'The WebM header parser was unable to locate the Duration element. The init segment data may be corrupt or may have been incorrectly encoded.',
    },
    3012: {
        name: 'WEBM_CUE_TRACK_POSITIONS_ELEMENT_MISSING',
        description:
            'The WebM Cues parser was unable to locate the Cue Track Positions element. The segment index data may be corrupt.',
    },
    3013: {
        name: 'WEBM_CUE_TIME_ELEMENT_MISSING',
        description:
            'The WebM Cues parser was unable to locate the Cue Time element. The segment index data may be corrupt.',
    },
    3014: {
        name: 'MEDIA_SOURCE_OPERATION_FAILED',
        description: 'A MediaSource operation failed.',
    },
    3015: {
        name: 'MEDIA_SOURCE_OPERATION_THREW',
        description: 'A MediaSource operation threw an exception.',
    },
    3016: {
        name: 'VIDEO_ERROR',
        description: 'The video element reported an error.',
    },
    3017: {
        name: 'QUOTA_EXCEEDED_ERROR',
        description:
            'A MediaSource operation threw QuotaExceededError and recovery failed. The content cannot be played correctly because the segments are too large for the browser/platform.',
    },
    3018: {
        name: 'TRANSMUXING_FAILED',
        description: 'Transmuxing with our internal transmuxer failed.',
    },
    3019: {
        name: 'CONTENT_TRANSFORMATION_FAILED',
        description:
            'Content transformations required by the platform could not be performed for some reason (unsupported container, etc.).',
    },
    3020: {
        name: 'MSS_MISSING_DATA_FOR_TRANSMUXING',
        description:
            'Important data is missing to be able to do the transmuxing of MSS.',
    },
    3022: {
        name: 'MSS_TRANSMUXING_FAILED',
        description: 'MSS transmuxing failed for unknown reason.',
    },
    3023: {
        name: 'TRANSMUXING_NO_VIDEO_DATA',
        description:
            'An internal error which indicates that transmuxing operation has no video data. This should not be seen by applications.',
    },
    3024: {
        name: 'STREAMING_NOT_ALLOWED',
        description:
            'A MediaSource operation is not allowed because the streaming is not allowed.',
    },
    4000: {
        name: 'UNABLE_TO_GUESS_MANIFEST_TYPE',
        description:
            'The Player was unable to guess the manifest type based on file extension or MIME type.',
    },
    4001: {
        name: 'DASH_INVALID_XML',
        description: 'The DASH Manifest contained invalid XML markup.',
    },
    4002: {
        name: 'DASH_NO_SEGMENT_INFO',
        description:
            'The DASH Manifest contained a Representation with insufficient segment information.',
    },
    4003: {
        name: 'DASH_EMPTY_ADAPTATION_SET',
        description:
            'The DASH Manifest contained an AdaptationSet with no Representations.',
    },
    4004: {
        name: 'DASH_EMPTY_PERIOD',
        description:
            'The DASH Manifest contained an Period with no AdaptationSets.',
    },
    4005: {
        name: 'DASH_WEBM_MISSING_INIT',
        description:
            'The DASH Manifest does not specify an init segment with a WebM container.',
    },
    4006: {
        name: 'DASH_UNSUPPORTED_CONTAINER',
        description: 'The DASH Manifest contained an unsupported container format.',
    },
    4007: {
        name: 'DASH_PSSH_BAD_ENCODING',
        description: 'The embedded PSSH data has invalid encoding.',
    },
    4008: {
        name: 'DASH_NO_COMMON_KEY_SYSTEM',
        description:
            'There is an AdaptationSet whose Representations do not have any common key-systems.',
    },
    4009: {
        name: 'DASH_MULTIPLE_KEY_IDS_NOT_SUPPORTED',
        description:
            'Having multiple key IDs per Representation is not supported.',
    },
    4010: {
        name: 'DASH_CONFLICTING_KEY_IDS',
        description: 'The DASH Manifest specifies conflicting key IDs.',
    },
    4012: {
        name: 'RESTRICTIONS_CANNOT_BE_MET',
        description:
            'There exist some streams that could be decoded, but restrictions imposed by the application or the key system prevent us from playing.',
    },
    4015: {
        name: 'HLS_PLAYLIST_HEADER_MISSING',
        description: "HLS playlist doesn't start with a mandatory #EXTM3U tag.",
    },
    4016: {
        name: 'INVALID_HLS_TAG',
        description: "HLS tag has an invalid name that doesn't start with '#EXT'.",
    },
    4017: {
        name: 'HLS_INVALID_PLAYLIST_HIERARCHY',
        description: 'HLS playlist has both Master and Media/Segment tags.',
    },
    4018: {
        name: 'DASH_DUPLICATE_REPRESENTATION_ID',
        description:
            'A Representation has an id that is the same as another Representation in the same Period.',
    },
    4020: {
        name: 'HLS_MULTIPLE_MEDIA_INIT_SECTIONS_FOUND',
        description:
            'HLS manifest has several #EXT-X-MAP tags. We can only support one at the moment.',
    },
    4023: {
        name: 'HLS_REQUIRED_ATTRIBUTE_MISSING',
        description:
            'One of the required attributes was not provided, so the HLS manifest is invalid.',
    },
    4024: {
        name: 'HLS_REQUIRED_TAG_MISSING',
        description:
            'One of the required tags was not provided, so the HLS manifest is invalid.',
    },
    4025: {
        name: 'HLS_COULD_NOT_GUESS_CODECS',
        description:
            'The HLS parser was unable to guess codecs of a stream.',
    },
    4026: {
        name: 'HLS_KEYFORMATS_NOT_SUPPORTED',
        description:
            'The HLS parser has encountered encrypted content with unsupported KEYFORMAT attributes.',
    },
    4027: {
        name: 'DASH_UNSUPPORTED_XLINK_ACTUATE',
        description:
            'The manifest parser only supports xlink links with xlink:actuate="onLoad".',
    },
    4028: {
        name: 'DASH_XLINK_DEPTH_LIMIT',
        description:
            'The manifest parser has hit its depth limit on xlink link chains.',
    },
    4032: {
        name: 'CONTENT_UNSUPPORTED_BY_BROWSER',
        description:
            'The content container or codecs are not supported by this browser.',
    },
    4033: {
        name: 'CANNOT_ADD_EXTERNAL_TEXT_TO_LIVE_STREAM',
        description: 'External text tracks cannot be added to live streams.',
    },
    4036: {
        name: 'NO_VARIANTS',
        description: 'The Manifest contained no Variants.',
    },
    4037: {
        name: 'PERIOD_FLATTENING_FAILED',
        description:
            'We failed to find matching streams across DASH Periods, and the period-flattening algorithm has failed.',
    },
    4038: {
        name: 'INCONSISTENT_DRM_ACROSS_PERIODS',
        description:
            'We failed to find matching streams across DASH Periods due to inconsistent DRM systems across periods.',
    },
    4039: {
        name: 'HLS_VARIABLE_NOT_FOUND',
        description: 'The HLS manifest refers to an undeclared variables.',
    },
    4040: {
        name: 'HLS_MSE_ENCRYPTED_MP2T_NOT_SUPPORTED',
        description: 'We do not support playing encrypted mp2t with MSE.',
    },
    4041: {
        name: 'HLS_MSE_ENCRYPTED_LEGACY_APPLE_MEDIA_KEYS_NOT_SUPPORTED',
        description:
            'We do not support playing encrypted content (different than mp2t) with MSE and legacy Apple MediaKeys API.',
    },
    4042: {
        name: 'NO_WEB_CRYPTO_API',
        description:
            'Web Crypto API is not available (to decrypt AES-128 streams). Web Crypto only exists in secure origins like https.',
    },
    4045: {
        name: 'CANNOT_ADD_EXTERNAL_THUMBNAILS_TO_LIVE_STREAM',
        description: 'External thumbnails tracks cannot be added to live streams.',
    },
    4046: {
        name: 'MSS_INVALID_XML',
        description: 'The MSS Manifest contained invalid XML markup.',
    },
    4047: {
        name: 'MSS_LIVE_CONTENT_NOT_SUPPORTED',
        description: 'MSS parser encountered a live playlist.',
    },
    4048: {
        name: 'AES_128_INVALID_IV_LENGTH',
        description: 'AES-128 iv length should be 16 bytes.',
    },
    4049: {
        name: 'AES_128_INVALID_KEY_LENGTH',
        description: 'AES-128 encryption key length should be 16 bytes.',
    },
    4050: {
        name: 'DASH_CONFLICTING_AES_128',
        description: 'The DASH Manifest specifies conflicting AES-128 keys.',
    },
    4051: {
        name: 'DASH_UNSUPPORTED_AES_128',
        description: 'The DASH Manifest specifies a unsupported AES-128 encryption.',
    },
    4052: {
        name: 'DASH_INVALID_PATCH',
        description:
            'Patch requested during an update did not match original manifest.',
    },
    4053: {
        name: 'HLS_EMPTY_MEDIA_PLAYLIST',
        description: 'The media playlist has not segments or all segments are gap.',
    },
    4054: {
        name: 'DASH_MSE_ENCRYPTED_LEGACY_APPLE_MEDIA_KEYS_NOT_SUPPORTED',
        description:
            'We do not support playing encrypted content with MSE and legacy Apple MediaKeys API.',
    },
    4055: {
        name: 'CANNOT_ADD_EXTERNAL_CHAPTERS_TO_LIVE_STREAM',
        description: 'External chapters cannot be added to live streams.',
    },
    5006: {
        name: 'STREAMING_ENGINE_STARTUP_INVALID_STATE',
        description:
            'This would only happen if StreamingEngine were not started correctly, and should not be seen in production.',
    },
    6000: {
        name: 'NO_RECOGNIZED_KEY_SYSTEMS',
        description:
            'The manifest indicated protected content, but the manifest parser was unable to determine what key systems should be used.',
    },
    6001: {
        name: 'REQUESTED_KEY_SYSTEM_CONFIG_UNAVAILABLE',
        description:
            'None of the requested key system configurations are available.',
    },
    6002: {
        name: 'FAILED_TO_CREATE_CDM',
        description:
            'The browser found one of the requested key systems, but it failed to create an instance of the CDM for some unknown reason.',
    },
    6003: {
        name: 'FAILED_TO_ATTACH_TO_VIDEO',
        description:
            'The browser found one of the requested key systems and created an instance of the CDM, but it failed to attach the CDM to the video for some unknown reason.',
    },
    6004: {
        name: 'INVALID_SERVER_CERTIFICATE',
        description:
            'The CDM rejected the server certificate supplied by the application. The certificate may be malformed or in an unsupported format.',
    },
    6005: {
        name: 'FAILED_TO_CREATE_SESSION',
        description:
            'The CDM refused to create a session for some unknown reason.',
    },
    6006: {
        name: 'FAILED_TO_GENERATE_LICENSE_REQUEST',
        description:
            'The CDM was unable to generate a license request for the init data it was given. The init data may be malformed or in an unsupported format.',
    },
    6007: {
        name: 'LICENSE_REQUEST_FAILED',
        description:
            'The license request failed. This could be a timeout, a network failure, or a rejection by the server.',
    },
    6008: {
        name: 'LICENSE_RESPONSE_REJECTED',
        description:
            'The license response was rejected by the CDM. The server\'s response may be invalid or malformed for this CDM.',
    },
    6010: {
        name: 'ENCRYPTED_CONTENT_WITHOUT_DRM_INFO',
        description:
            'The manifest does not specify any DRM info, but the content is encrypted.',
    },
    6012: {
        name: 'NO_LICENSE_SERVER_GIVEN',
        description:
            'No license server was given for the key system signaled by the manifest. A license server URI is required for every key system.',
    },
    6013: {
        name: 'OFFLINE_SESSION_REMOVED',
        description: 'A required offline session was removed.',
    },
    6014: {
        name: 'EXPIRED',
        description:
            "The license has expired. This is triggered when all keys in the key status map have a status of 'expired'.",
    },
    6015: {
        name: 'SERVER_CERTIFICATE_REQUIRED',
        description:
            "A server certificate wasn't given when it is required. FairPlay requires setting an explicit server certificate in the configuration.",
    },
    6016: {
        name: 'INIT_DATA_TRANSFORM_ERROR',
        description:
            'An error was thrown while executing the init data transformation.',
    },
    6017: {
        name: 'SERVER_CERTIFICATE_REQUEST_FAILED',
        description: 'The server certificate request failed.',
    },
    6018: {
        name: 'MIN_HDCP_VERSION_NOT_MATCH',
        description: 'The HDCP version does not meet the requirements.',
    },
    6019: {
        name: 'ERROR_CHECKING_HDCP_VERSION',
        description: 'Error when checking HDCP version.',
    },
    6020: {
        name: 'MISSING_EME_SUPPORT',
        description:
            'The browser does not support EME APIs, so DRM content cannot be played.',
    },
    7000: {
        name: 'LOAD_INTERRUPTED',
        description:
            'The call to Player.load() was interrupted by a call to Player.unload() or another call to Player.load().',
    },
    7001: {
        name: 'OPERATION_ABORTED',
        description:
            'An internal error which indicates that an operation was aborted.',
    },
    7002: {
        name: 'NO_VIDEO_ELEMENT',
        description: 'The call to Player.load() failed because the Player does not have a video element.',
    },
    7003: {
        name: 'OBJECT_DESTROYED',
        description: 'The operation failed because the object has been destroyed.',
    },
    7004: {
        name: 'CONTENT_NOT_LOADED',
        description: 'The content has not been loaded in the Player.',
    },
    7005: {
        name: 'SRC_EQUALS_PRELOAD_NOT_SUPPORTED',
        description: 'The call to preload failed, due to being called on src= content.',
    },
    7006: {
        name: 'PRELOAD_DESTROYED',
        description:
            'The operation failed because the preload has been destroyed. This can happen by reusing the same preload in multiple load calls.',
    },
    7007: {
        name: 'QUEUE_INDEX_OUT_OF_BOUNDS',
        description:
            'It occurs when trying to reproduce an index in the QueueManager that is out of bounds.',
    },
    8000: {
        name: 'CAST_API_UNAVAILABLE',
        description: 'The Cast API is unavailable.',
    },
    8001: {
        name: 'NO_CAST_RECEIVERS',
        description: 'No cast receivers are available at this time.',
    },
    8002: { name: 'ALREADY_CASTING', description: 'The library is already casting.' },
    8003: {
        name: 'UNEXPECTED_CAST_ERROR',
        description: 'A Cast SDK error that we did not explicitly plan for has occurred.',
    },
    8004: {
        name: 'CAST_CANCELED_BY_USER',
        description: 'The cast operation was canceled by the user.',
    },
    8005: {
        name: 'CAST_CONNECTION_TIMED_OUT',
        description: 'The cast connection timed out.',
    },
    8006: {
        name: 'CAST_RECEIVER_APP_UNAVAILABLE',
        description:
            'The requested receiver app ID does not exist or is unavailable.',
    },
    9000: {
        name: 'STORAGE_NOT_SUPPORTED',
        description:
            'Offline storage is not supported on this browser; it is required for offline support.',
    },
    9001: {
        name: 'INDEXED_DB_ERROR',
        description: 'An unknown error occurred in the IndexedDB.',
    },
    9003: {
        name: 'REQUESTED_ITEM_NOT_FOUND',
        description: 'The specified item was not found in the IndexedDB.',
    },
    9004: {
        name: 'MALFORMED_OFFLINE_URI',
        description: 'A network request was made with a malformed offline URI.',
    },
    9005: {
        name: 'CANNOT_STORE_LIVE_OFFLINE',
        description:
            'The specified content is live or in-progress. Live and in-progress streams cannot be stored offline.',
    },
    9007: {
        name: 'NO_INIT_DATA_FOR_OFFLINE',
        description:
            'There was no init data available for offline storage.',
    },
    9008: {
        name: 'LOCAL_PLAYER_INSTANCE_REQUIRED',
        description:
            'shaka.offline.Storage was constructed with a Player proxy instead of a local player instance.',
    },
    9011: {
        name: 'NEW_KEY_OPERATION_NOT_SUPPORTED',
        description: 'The storage cell does not allow new operations that require new keys.',
    },
    9012: {
        name: 'KEY_NOT_FOUND',
        description: 'A key was not found in a storage cell.',
    },
    9013: {
        name: 'MISSING_STORAGE_CELL',
        description: 'A storage cell was not found.',
    },
    9014: {
        name: 'STORAGE_LIMIT_REACHED',
        description: 'The storage limit defined in downloadSizeCallback has been reached.',
    },
    9015: {
        name: 'DOWNLOAD_SIZE_CALLBACK_ERROR',
        description: 'downloadSizeCallback has produced an unexpected error.',
    },
    9016: {
        name: 'MODIFY_OPERATION_NOT_SUPPORTED',
        description: 'The storage cell does not allow new operations that significantly change existing data.',
    },
    9017: {
        name: 'INDEXED_DB_INIT_TIMED_OUT',
        description: 'When attempting to open an indexedDB instance, nothing happened for long enough for us to time out.',
    },
    10000: {
        name: 'CS_IMA_SDK_MISSING',
        description:
            'CS IMA SDK, required for ad insertion, has not been included on the page.',
    },
    10001: {
        name: 'CS_AD_MANAGER_NOT_INITIALIZED',
        description:
            'Client Side Ad Manager needs to be initialized to enable Client Side Ad Insertion.',
    },
    10002: {
        name: 'SS_IMA_SDK_MISSING',
        description:
            'SS IMA SDK, required for ad insertion, has not been included on the page.',
    },
    10003: {
        name: 'SS_AD_MANAGER_NOT_INITIALIZED',
        description:
            'Server Side Ad Manager needs to be initialized to enable Server Side Ad Insertion.',
    },
    10004: {
        name: 'CURRENT_DAI_REQUEST_NOT_FINISHED',
        description:
            'A new DAI steam was requested before the previous request had been resolved.',
    },
    10005: {
        name: 'MT_AD_MANAGER_NOT_INITIALIZED',
        description:
            'MediaTailor Ad Manager needs to be initialized to enable MediaTailor Ad Insertion.',
    },
    10006: {
        name: 'INTERSTITIAL_AD_MANAGER_NOT_INITIALIZED',
        description: 'Interstitial Ad Manager needs to be initialized to enable interstitial Ad Insertion.',
    },
    10007: {
        name: 'VAST_INVALID_XML',
        description: 'The VAST contained invalid XML markup.',
    },
};

/**
 * Parses a Shaka Player error object into a human-readable string.
 * @param {any} shakaError The error object from Shaka Player.
 * @returns {string} A formatted error message.
 */
export function parseShakaError(shakaError) {
    if (!shakaError || typeof shakaError.code !== 'number') {
        return shakaError.message || 'An unknown player error occurred.';
    }

    const categoryName = Category[shakaError.category] || 'UNKNOWN';
    const errorInfo = Code[shakaError.code];
    const codeName = errorInfo?.name || 'UNKNOWN_CODE';
    const description = errorInfo?.description || 'No description available.';
    
    let message = `${codeName} (Code ${shakaError.code}, ${categoryName}): ${description}`;

    if (shakaError.data && Array.isArray(shakaError.data) && shakaError.data.length > 0) {
        const dataDetails = shakaError.data.map(d => {
            if (d instanceof Error) return d.message;
            if (typeof d === 'object' && d !== null) {
                if (d.uri && d.status) return `[HTTP ${d.status} on ${d.uri}]`;
                return '[Object]';
            }
            return String(d);
        }).join(', ');
        message += ` | Details: ${dataDetails}`;
    }

    return message;
}