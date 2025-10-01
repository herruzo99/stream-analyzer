/**
 * @typedef {object} Label
 * @property {string} id
 * @property {string | null} lang
 * @property {string} text
 */

/**
 * @typedef {object} Descriptor
 * @property {string} schemeIdUri
 * @property {string | null} value
 * @property {string | null} id
 */

/**
 * @typedef {object} AudioChannelConfiguration
 * @property {string} schemeIdUri
 * @property {string | null} value
 */

/**
 * @typedef {object} URLType
 * @property {string | null} sourceURL
 * @property {string | null} range
 */

/**
 * @typedef {object} FailoverContent
 * @property {boolean} valid
 * @property {{t: number, d: number}[]} fcs
 */

/**
 * @typedef {object} Representation
 * @property {string} id
 * @property {string} codecs
 * @property {number} bandwidth
 * @property {number} width
 * @property {number} height
 * @property {string | null} mimeType
 * @property {string | null} profiles
 * @property {number | null} qualityRanking
 * @property {number} selectionPriority
 * @property {boolean | null} codingDependency
 * @property {'progressive' | 'interlaced' | 'unknown' | null} scanType
 * @property {string | null} associationId
 * @property {string | null} associationType
 * @property {string | null} segmentProfiles
 * @property {string | null} mediaStreamStructureId
 * @property {number | null} maximumSAPPeriod
 * @property {number | null} startWithSAP
 * @property {number | null} maxPlayoutRate
 * @property {string | null} tag
 * @property {number | null} eptDelta
 * @property {number | null} pdDelta
 * @property {URLType | null} representationIndex
 * @property {FailoverContent | null} failoverContent
 * @property {AudioChannelConfiguration[]} audioChannelConfigurations
 * @property {Descriptor[]} framePackings
 * @property {Descriptor[]} ratings
 * @property {Descriptor[]} viewpoints
 * @property {Descriptor[]} accessibility
 * @property {Label[]} labels
 * @property {Label[]} groupLabels
 * @property {string | undefined} videoRange
 */

/**
 * @typedef {object} ContentProtection
 * @property {string} schemeIdUri
 * @property {string} system
 * @property {string | null} defaultKid
 */

/**
 * @typedef {object} AdaptationSet
 * @property {string} id
 * @property {string} contentType
 * @property {string} lang
 * @property {string} mimeType
 * @property {string | null} profiles
 * @property {number | null} group
 * @property {boolean | null} bitstreamSwitching
 * @property {number | null} maxWidth
 * @property {number | null} maxHeight
 * @property {string | null} maxFrameRate
 * @property {Representation[]} representations
 * @property {ContentProtection[]} contentProtection
 * @property {Descriptor[]} framePackings
 * @property {Descriptor[]} ratings
 * @property {Descriptor[]} viewpoints
 * @property {Descriptor[]} accessibility
 * @property {Label[]} labels
 * @property {Label[]} groupLabels
 * @property {Descriptor[]} roles
 */

/**
 * @typedef {object} Event
 * @property {number} startTime - The start time of the event in seconds.
 * @property {number} duration - The duration of the event in seconds.
 * @property {string} message - A descriptive message for the event.
 * @property {string | null} messageData
 * @property {string} type - A category for the event (e.g., 'dash-event', 'hls-daterange').
 */

/**
 * @typedef {object} EventStream
 * @property {string} schemeIdUri
 * @property {string | null} value
 * @property {number} timescale
 * @property {number} presentationTimeOffset
 * @property {Event[]} events
 */

/**
 * @typedef {object} AssetIdentifier
 * @property {string} schemeIdUri
 * @property {string | null} value
 */

/**
 * @typedef {object} Subset
 * @property {string[]} contains
 * @property {string | null} id
 */

/**
 * @typedef {object} Period
 * @property {string} id
 * @property {number} start
 * @property {number} duration
 * @property {boolean | null} bitstreamSwitching
 * @property {AssetIdentifier | null} assetIdentifier
 * @property {AdaptationSet[]} adaptationSets
 * @property {Subset[]} subsets
 * @property {EventStream[]} eventStreams
 * @property {Event[]} events
 */

/**
 * @typedef {object} ProgramInformation
 * @property {string | null} title
 * @property {string | null} source
 * @property {string | null} copyright
 * @property {string | null} lang
 * @property {string | null} moreInformationURL
 */

/**
 * @typedef {object} Metrics
 * @property {string} metrics
 * @property {object[]} ranges
 * @property {Descriptor[]} reportings
 */

/**
 * @typedef {object} VideoTrackSummary
 * @property {string} id
 * @property {string | null} profiles
 * @property {string} bitrateRange
 * @property {string[]} resolutions
 * @property {string[]} codecs
 * @property {string | null} scanType
 * @property {string | null} videoRange
 * @property {string[]} roles
 */

/**
 * @typedef {object} AudioTrackSummary
 * @property {string} id
 * @property {string | null} lang
 * @property {string[]} codecs
 * @property {string[]} channels
 * @property {boolean} isDefault
 * @property {boolean} isForced
 * @property {string[]} roles
 */

/**
 * @typedef {object} TextTrackSummary
 * @property {string} id
 * @property {string | null} lang
 * @property {string[]} codecsOrMimeTypes
 * @property {boolean} isDefault
 * @property {boolean} isForced
 * @property {string[]} roles
 */

/**
 * @typedef {object} ManifestSummary
 * @property {{
 *   protocol: 'DASH' | 'HLS',
 *   streamType: 'Live / Dynamic' | 'VOD / Static',
 *   streamTypeColor: 'text-red-400' | 'text-blue-400',
 *   duration: number | null,
 *   segmentFormat: string,
 *   title: string | null,
 *   locations: string[],
 *   segmenting: string,
 * }} general
 * @property {{
 *   profiles: string,
 *   minBufferTime: number | null,
 *   timeShiftBufferDepth: number | null,
 *   minimumUpdatePeriod: number | null,
 *   availabilityStartTime: Date | null,
 *   publishTime: Date | null,
 * } | null} dash
 * @property {{
 *   version: number,
 *   targetDuration: number | null,
 *   iFramePlaylists: number,
 *   mediaPlaylistDetails: {
 *       segmentCount: number,
 *       averageSegmentDuration: number | null,
 *       hasDiscontinuity: boolean,
 *       isIFrameOnly: boolean,
 *   } | null
 * } | null} hls
 * @property {{
 *  isLowLatency: boolean,
 *  partTargetDuration: number | null,
 *  partHoldBack: number | null,
 *  canBlockReload: boolean,
 *  targetLatency: number | null,
 *  minLatency: number | null,
 *  maxLatency: number | null,
 * } | null} lowLatency
 * @property {{
 *   periods: number,
 *   videoTracks: number,
 *   audioTracks: number,
 *   textTracks: number,
 *   mediaPlaylists: number,
 * }} content
 * @property {VideoTrackSummary[]} videoTracks
 * @property {AudioTrackSummary[]} audioTracks
 * @property {TextTrackSummary[]} textTracks
 * @property {{
 *   isEncrypted: boolean,
 *   systems: string[],
 *   kids: string[],
 * } | null} security
 */

/**
 * @typedef {object} Manifest
 * @property {string | null} id
 * @property {'static' | 'dynamic'} type
 * @property {string} profiles
 * @property {number} minBufferTime
 * @property {Date | null} publishTime
 * @property {Date | null} availabilityStartTime
 * @property {number | null} timeShiftBufferDepth
 * @property {number | null} minimumUpdatePeriod
 * @property {number | null} duration
 * @property {number | null} maxSegmentDuration
 * @property {number | null} maxSubsegmentDuration
 * @property {ProgramInformation[]} programInformations
 * @property {Metrics[]} metrics
 * @property {string[]} locations
 * @property {'isobmff' | 'ts' | 'unknown'} segmentFormat
 * @property {Event[]} events
 * @property {Period[]} periods
 * @property {Element | object} rawElement - Reference to the original parsed element or object.
 * @property {ManifestSummary} summary - Pre-calculated summary data for the UI.
 * @property {object | null} serverControl - HLS-specific low-latency data
 * @property {Map<string, {value: string, source: string}>=} [hlsDefinedVariables]
 * @property {any[]=} tags - HLS-specific
 * @property {boolean=} isMaster - HLS-specific
 * @property {any[]=} variants - HLS-specific
 * @property {any[]=} segments - HLS-specific
 * @property {any[]=} preloadHints - HLS-specific
 * @property {any[]=} renditionReports - HLS-specific
 * @property {any=} partInf - HLS-specific
 */

/**
 * @typedef {{ manifest: Manifest, rawManifest: string, lastFetched: Date }} MediaPlaylist
 */

/**
 * @typedef {object} FeatureAnalysisResult
 * @property {boolean} used
 * @property {string} details
 */

/**
 * @typedef {object} FeatureAnalysisState
 * @property {Map<string, FeatureAnalysisResult>} results
 * @property {number} manifestCount
 */

/**
 * @typedef {object} HlsVariantState
 * @property {object[]} segments
 * @property {Set<string>} freshSegmentUrls
 * @property {boolean} isLoading
 * @property {boolean} isPolling
 * @property {boolean} isExpanded
 * @property {'all' | 'last10'} displayMode
 * @property {string | null} error
 */

/**
 * @typedef {object} DashRepresentationState
 * @property {object[]} segments
 * @property {Set<string>} freshSegmentUrls
 */

/**
 * @typedef {object} ManifestUpdate
 * @property {string} timestamp
 * @property {string} diffHtml
 */

/**
 * @typedef {object} DecodedNalUnit
 * @property {string} type - e.g., 'SPS', 'PPS', 'IDR Slice'
 * @property {number} size - Size in bytes.
 */

/**
 * @typedef {object} DecodedH264Sample
 * @property {'H.264'} format
 * @property {'key' | 'delta'} frameType
 * @property {number} duration - in microseconds
 * @property {number} timestamp - in microseconds
 * @property {DecodedNalUnit[]} nalUnits
 */

/**
 * @typedef {object} DecodedAacFrame
 * @property {'AAC'} format
 * @property {string} objectType - e.g., 'AAC-LC'
 * @property {number} samplingFrequency
 * @property {number} channelCount
 * @property {number} frameLength
 */

/** @typedef {DecodedH264Sample | DecodedAacFrame} DecodedSample */

/**
 * @typedef {object} Stream
 * @property {number} id
 * @property {string} name
 * @property {string} originalUrl
 * @property {string} baseUrl
 * @property {'dash' | 'hls' | 'unknown'} protocol
 * @property {boolean} isPolling - The current polling state for this stream.
 * @property {Manifest | null} manifest - The currently active manifest (master or media).
 * @property {string} rawManifest - The raw text of the currently active manifest.
 * @property {ManifestUpdate[]} manifestUpdates
 * @property {number} activeManifestUpdateIndex
 * @property {Map<string, MediaPlaylist>} mediaPlaylists - A cache of fetched media playlists for HLS.
 * @property {string | null} activeMediaPlaylistUrl - The URL of the currently viewed media playlist.
 * @property {Manifest | null} activeManifestForView - The manifest to be displayed in the interactive view.
 * @property {FeatureAnalysisState} featureAnalysis - Aggregated feature analysis results.
 * @property {Map<string, HlsVariantState>} hlsVariantState - State for each HLS variant playlist in the segment explorer.
 * @property {Map<string, DashRepresentationState>} dashRepresentationState
 * @property {Map<string, {value: string, source: string}>=} hlsDefinedVariables
 * @property {Map<string, any>} semanticData
 */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {string | null} activeSegmentUrl
 * @property {number | null} segmentFreshnessChecker
 * @property {number} streamIdCounter
 * @property {LRUCache} segmentCache
 * @property {string[]} segmentsForCompare
 * @property {Map<string, DecodedSample>} decodedSamples
 * @property {Map<number, any>} activeByteMap
 */
import { LRUCache } from './lru-cache.js';

const SEGMENT_CACHE_SIZE = 200;

/** @type {AnalysisState} */
export let analysisState = {
    streams: [],
    activeStreamId: null,
    activeSegmentUrl: null,
    segmentFreshnessChecker: null,
    streamIdCounter: 0,
    segmentCache: new LRUCache(SEGMENT_CACHE_SIZE),
    segmentsForCompare: [],
    decodedSamples: new Map(),
    activeByteMap: new Map(),
};

/**
 * @typedef {object} DOM_ELEMENTS
 * @property {HTMLElement} mainHeader
 * @property {HTMLDivElement} headerTitleGroup
 * @property {HTMLDivElement} headerUrlDisplay
 * @property {HTMLDivElement} streamInputs
 * @property {HTMLButtonElement} addStreamBtn
 * @property {HTMLButtonElement} analyzeBtn
 * @property {HTMLDivElement} toastContainer
 * @property {HTMLDivElement} results
 * @property {HTMLDivElement} inputSection
 * @property {HTMLButtonElement} newAnalysisBtn
 * @property {HTMLButtonElement} shareAnalysisBtn
 * @property {HTMLElement} tabs
 * @property {HTMLDivElement} contextSwitcherWrapper
 * @property {HTMLSelectElement} contextSwitcher
 * @property {Record<string, HTMLDivElement>} tabContents
 * @property {HTMLDivElement} segmentModal
 * @property {HTMLHeadingElement} modalTitle
 * @property {HTMLParagraphElement} modalSegmentUrl
 * @property {HTMLDivElement} modalContentArea
 * @property {HTMLButtonElement} closeModalBtn
 * @property {HTMLDivElement} globalTooltip
 */

/** @type {Partial<DOM_ELEMENTS>} */
export let dom = {};

export function initializeDom() {
    dom.mainHeader = /** @type {HTMLElement} */ (
        document.getElementById('main-header')
    );
    dom.headerTitleGroup = /** @type {HTMLDivElement} */ (
        document.getElementById('header-title-group')
    );
    dom.headerUrlDisplay = /** @type {HTMLDivElement} */ (
        document.getElementById('header-url-display')
    );
    dom.streamInputs = /** @type {HTMLDivElement} */ (
        document.getElementById('stream-inputs')
    );
    dom.addStreamBtn = /** @type {HTMLButtonElement} */ (
        document.getElementById('add-stream-btn')
    );
    dom.analyzeBtn = /** @type {HTMLButtonElement} */ (
        document.getElementById('analyze-btn')
    );
    dom.toastContainer = /** @type {HTMLDivElement} */ (
        document.getElementById('toast-container')
    );
    dom.results = /** @type {HTMLDivElement} */ (
        document.getElementById('results')
    );
    dom.inputSection = /** @type {HTMLDivElement} */ (
        document.getElementById('input-section')
    );
    dom.newAnalysisBtn = /** @type {HTMLButtonElement} */ (
        document.getElementById('new-analysis-btn')
    );
    dom.shareAnalysisBtn = /** @type {HTMLButtonElement} */ (
        document.getElementById('share-analysis-btn')
    );
    dom.tabs = /** @type {HTMLElement} */ (document.getElementById('tabs'));
    dom.contextSwitcherWrapper = /** @type {HTMLDivElement} */ (
        document.getElementById('context-switcher-wrapper')
    );
    dom.contextSwitcher = /** @type {HTMLSelectElement} */ (
        document.getElementById('context-switcher')
    );
    dom.tabContents = {
        comparison: /** @type {HTMLDivElement} */ (
            document.getElementById('tab-comparison')
        ),
        summary: /** @type {HTMLDivElement} */ (
            document.getElementById('tab-summary')
        ),
        'timeline-visuals': /** @type {HTMLDivElement} */ (
            document.getElementById('tab-timeline-visuals')
        ),
        features: /** @type {HTMLDivElement} */ (
            document.getElementById('tab-features')
        ),
        compliance: /** @type {HTMLDivElement} */ (
            document.getElementById('tab-compliance')
        ),
        explorer: /** @type {HTMLDivElement} */ (
            document.getElementById('tab-explorer')
        ),
        'interactive-segment': /** @type {HTMLDivElement} */ (
            document.getElementById('tab-interactive-segment')
        ),
        'interactive-manifest': /** @type {HTMLDivElement} */ (
            document.getElementById('tab-interactive-manifest')
        ),
        updates: /** @type {HTMLDivElement} */ (
            document.getElementById('tab-updates')
        ),
    };
    dom.segmentModal = /** @type {HTMLDivElement} */ (
        document.getElementById('segment-modal')
    );
    dom.modalTitle = /** @type {HTMLHeadingElement} */ (
        document.getElementById('modal-title')
    );
    dom.modalSegmentUrl = /** @type {HTMLParagraphElement} */ (
        document.getElementById('modal-segment-url')
    );
    dom.modalContentArea = /** @type {HTMLDivElement} */ (
        document.getElementById('modal-content-area')
    );
    dom.closeModalBtn = /** @type {HTMLButtonElement} */ (
        document.getElementById('close-modal-btn')
    );
    dom.globalTooltip = /** @type {HTMLDivElement} */ (
        document.getElementById('global-tooltip')
    );
}