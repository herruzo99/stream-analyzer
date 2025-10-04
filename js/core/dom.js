/** @typedef {import('./types.js').Label} Label */
/** @typedef {import('./types.js').Descriptor} Descriptor */
/** @typedef {import('./types.js').AudioChannelConfiguration} AudioChannelConfiguration */
/** @typedef {import('./types.js').URLType} URLType */
/** @typedef {import('./types.js').FailoverContent} FailoverContent */
/** @typedef {import('./types.js').SubRepresentation} SubRepresentation */
/** @typedef {import('./types.js').Representation} Representation */
/** @typedef {import('./types.js').ContentProtection} ContentProtection */
/** @typedef {import('./types.js').AdaptationSet} AdaptationSet */
/** @typedef {import('./types.js').Event} Event */
/** @typedef {import('./types.js').EventStream} EventStream */
/** @typedef {import('./types.js').AssetIdentifier} AssetIdentifier */
/** @typedef {import('./types.js').Subset} Subset */
/** @typedef {import('./types.js').Period} Period */
/** @typedef {import('./types.js').ProgramInformation} ProgramInformation */
/** @typedef {import('./types.js').Metrics} Metrics */
/** @typedef {import('./types.js').VideoTrackSummary} VideoTrackSummary */
/** @typedef {import('./types.js').AudioTrackSummary} AudioTrackSummary */
/** @typedef {import('./types.js').TextTrackSummary} TextTrackSummary */
/** @typedef {import('./types.js').PeriodSummary} PeriodSummary */
/** @typedef {import('./types.js').ManifestSummary} ManifestSummary */
/** @typedef {import('./types.js').Manifest} Manifest */
/** @typedef {import('./types.js').MediaPlaylist} MediaPlaylist */
/** @typedef {import('./types.js').FeatureAnalysisResult} FeatureAnalysisResult */
/** @typedef {import('./types.js').FeatureAnalysisState} FeatureAnalysisState */
/** @typedef {import('./types.js').HlsVariantState} HlsVariantState */
/** @typedef {import('./types.js').DashRepresentationState} DashRepresentationState */
/** @typedef {import('./types.js').ComplianceResult} ComplianceResult */
/** @typedef {import('./types.js').ManifestUpdate} ManifestUpdate */
/** @typedef {import('./types.js').DecodedNalUnit} DecodedNalUnit */
/** @typedef {import('./types.js').DecodedH264Sample} DecodedH264Sample */
/** @typedef {import('./types.js').DecodedAacFrame} DecodedAacFrame */
/** @typedef {import('./types.js').DecodedSample} DecodedSample */
/** @typedef {import('./types.js').Stream} Stream */

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
 * @property {HTMLButtonElement} copyDebugBtn
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
    dom.copyDebugBtn = /** @type {HTMLButtonElement} */ (
        document.getElementById('copy-debug-btn')
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
