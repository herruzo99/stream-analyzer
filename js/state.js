/**
 * @typedef {object} Stream
 * @property {number} id
 * @property {string} name
 * @property {string} originalUrl
 * @property {string} baseUrl
 * @property {Element} mpd
 * @property {string} rawXml
 */

/**
 * @typedef {object} MpdUpdate
 * @property {string} timestamp
 * @property {string} diffHtml
 */

/**
 * @typedef {object} AnalysisState
 * @property {Stream[]} streams
 * @property {number | null} activeStreamId
 * @property {number | null} segmentFreshnessChecker
 * @property {number} streamIdCounter
 * @property {MpdUpdate[]} mpdUpdates
 * @property {number} activeMpdUpdateIndex
 * @property {boolean} isPollingActive
 * @property {Map<string, {status: number, data: ArrayBuffer | null}>} segmentCache
 */

/** @type {AnalysisState} */
export let analysisState = {
    streams: [],
    activeStreamId: null,
    segmentFreshnessChecker: null,
    streamIdCounter: 0,
    mpdUpdates: [],
    activeMpdUpdateIndex: 0,
    isPollingActive: false,
    segmentCache: new Map(),
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
        'interactive-mpd': /** @type {HTMLDivElement} */ (
            document.getElementById('tab-interactive-mpd')
        ),
        explorer: /** @type {HTMLDivElement} */ (
            document.getElementById('tab-explorer')
        ),
        updates: /** @type {HTMLDivElement} */ (
            document.getElementById('tab-updates')
        ),
    },
    segmentModal: /** @type {HTMLDivElement} */ (
        document.getElementById('segment-modal')
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