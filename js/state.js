/**
 * @typedef {object} Representation
 * @property {string} id
 * @property {string} codecs
 * @property {number} bandwidth
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {object} ContentProtection
 * @property {string} schemeIdUri
 * @property {string} system
 */

/**
 * @typedef {object} AdaptationSet
 * @property {string} id
 * @property {string} contentType
 * @property {string} lang
 * @property {string} mimeType
 * @property {Representation[]} representations
 * @property {ContentProtection[]} contentProtection
 */

/**
 * @typedef {object} Period
 * @property {string} id
 * @property {number} start
 * @property {number} duration
 * @property {AdaptationSet[]} adaptationSets
 */

/**
 * @typedef {object} Manifest
 * @property {'static' | 'dynamic'} type
 * @property {string} profiles
 * @property {number} minBufferTime
 * @property {Date | null} publishTime
 * @property {Date | null} availabilityStartTime
 * @property {number | null} timeShiftBufferDepth
 * @property {number | null} minimumUpdatePeriod
 * @property {number | null} duration
 * @property {Period[]} periods
 * @property {Element} rawElement - Reference to the original parsed element for features not yet migrated.
 */

/**
 * @typedef {object} Stream
 * @property {number} id
 * @property {string} name
 * @property {string} originalUrl
 * @property {string} baseUrl
 * @property {Manifest} manifest
 * @property {string} rawXml
 */

/**
 * @typedef {object} ManifestUpdate
 * @property {string} timestamp
 * @property {string} diffHtml
 */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {string | null} activeSegmentUrl
 * @property {number | null} segmentFreshnessChecker
 * @property {number} streamIdCounter
 * @property {ManifestUpdate[]} manifestUpdates
 * @property {number} activeManifestUpdateIndex
 * @property {boolean} isPollingActive
 * @property {Map<string, {status: number, data: ArrayBuffer | null, parsedData: object | null}>} segmentCache
 * @property {string[]} segmentsForCompare
 */

/** @type {AnalysisState} */
export let analysisState = {
    streams: [],
    activeStreamId: null,
    activeSegmentUrl: null,
    segmentFreshnessChecker: null,
    streamIdCounter: 0,
    manifestUpdates: [],
    activeManifestUpdateIndex: 0,
    isPollingActive: false,
    segmentCache: new Map(),
    segmentsForCompare: [],
};

/**
 * @typedef {object} DOM_ELEMENTS
 * @property {HTMLDivElement} streamInputs
 * @property {HTMLButtonElement} addStreamBtn
 * @property {HTMLButtonElement} analyzeBtn
 * @property {HTMLDivElement} status
 * @property {HTMLDivElement} results
 * @property {HTMLElement} tabs
 * @property {HTMLDivElement} contextSwitcherContainer
 * @property {HTMLSelectElement} contextSwitcher
 * @property {Record<string, HTMLDivElement>} tabContents
 * @property {HTMLDivElement} segmentModal
 * @property {HTMLHeadingElement} modalTitle
 * @property {HTMLParagraphElement} modalSegmentUrl
 * @property {HTMLDivElement} modalContentArea
 * @property {HTMLButtonElement} closeModalBtn
 * @property {HTMLDivElement} globalTooltip
 */

/** @type {DOM_ELEMENTS} */
export const dom = {
    streamInputs: /** @type {HTMLDivElement} */ (
        document.getElementById('stream-inputs')
    ),
    addStreamBtn: /** @type {HTMLButtonElement} */ (
        document.getElementById('add-stream-btn')
    ),
    analyzeBtn: /** @type {HTMLButtonElement} */ (
        document.getElementById('analyze-btn')
    ),
    status: /** @type {HTMLDivElement} */ (document.getElementById('status')),
    results: /** @type {HTMLDivElement} */ (document.getElementById('results')),
    tabs: /** @type {HTMLElement} */ (document.getElementById('tabs')),
    contextSwitcherContainer: /** @type {HTMLDivElement} */ (
        document.getElementById('context-switcher-container')
    ),
    contextSwitcher: /** @type {HTMLSelectElement} */ (
        document.getElementById('context-switcher')
    ),
    tabContents: {
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
        'interactive-mpd': /** @type {HTMLDivElement} */ (
            document.getElementById('tab-interactive-mpd')
        ),
        updates: /** @type {HTMLDivElement} */ (
            document.getElementById('tab-updates')
        ),
    },
    segmentModal: /** @type {HTMLDivElement} */ (
        document.getElementById('segment-modal')
    ),
    modalTitle: /** @type {HTMLHeadingElement} */ (
        document.getElementById('modal-title')
    ),
    modalSegmentUrl: /** @type {HTMLParagraphElement} */ (
        document.getElementById('modal-segment-url')
    ),
    modalContentArea: /** @type {HTMLDivElement} */ (
        document.getElementById('modal-content-area')
    ),
    closeModalBtn: /** @type {HTMLButtonElement} */ (
        document.getElementById('close-modal-btn')
    ),
    globalTooltip: /** @type {HTMLDivElement} */ (
        document.getElementById('global-tooltip')
    ),
};