export interface Label {
    id: string;
    lang: string | null;
    text: string;
}

export interface Descriptor {
    schemeIdUri: string;
    value: string | null;
    id: string | null;
}

export interface AudioChannelConfiguration {
    schemeIdUri: string;
    value: string | null;
}

export interface URLType {
    sourceURL: string | null;
    range: string | null;
}

export interface FailoverContent {
    valid: boolean;
    fcs: { t: number; d: number }[];
}

export interface SubRepresentation {
    level: number | null;
    dependencyLevel: string | null;
    bandwidth: number | null;
    contentComponent: string[] | null;
    codecs: string;
    mimeType: string | null;
    profiles: string | null;
    width: number | null;
    height: number | null;
    serializedManifest: object;
}

export interface Resync {
    type: number;
    dT: number | null;
    dImax: number | null;
    dImin: number | null;
    marker: boolean;
}

export interface OutputProtection {
    schemeIdUri: string;
    value: string | null;
    robustness: string | null;
}

export interface ModelPair {
    bufferTime: number;
    bandwidth: number;
}

export interface ExtendedBandwidth {
    vbr: boolean;
    modelPairs: ModelPair[];
}

export interface Representation {
    id: string;
    codecs: string;
    bandwidth: number;
    width: number;
    height: number;
    frameRate: string | null;
    sar: string | null;
    mimeType: string | null;
    profiles: string | null;
    qualityRanking: number | null;
    selectionPriority: number;
    codingDependency: boolean | null;
    scanType: 'progressive' | 'interlaced' | 'unknown' | null;
    dependencyId: string | null;
    associationId: string | null;
    associationType: string | null;
    segmentProfiles: string | null;
    mediaStreamStructureId: string | null;
    maximumSAPPeriod: number | null;
    startWithSAP: number | null;
    maxPlayoutRate: number | null;
    tag: string | null;
    eptDelta: number | null;
    pdDelta: number | null;
    representationIndex: URLType | null;
    failoverContent: FailoverContent | null;
    audioChannelConfigurations: AudioChannelConfiguration[];
    framePackings: Descriptor[];
    ratings: Descriptor[];
    viewpoints: Descriptor[];
    accessibility: Descriptor[];
    labels: Label[];
    groupLabels: Label[];
    subRepresentations: SubRepresentation[];
    resyncs: Resync[];
    outputProtection: OutputProtection | null;
    extendedBandwidth: ExtendedBandwidth | null;
    videoRange?: string;
    stableVariantId: string | null;
    pathwayId: string | null;
    supplementalCodecs: string | null;
    reqVideoLayout: string | null;
    serializedManifest: object;
}

export interface ContentProtection {
    schemeIdUri: string;
    system: string;
    defaultKid: string | null;
    robustness: string | null;
}

export interface ContentComponent {
    id: string | null;
    lang: string | null;
    contentType: string | null;
    par: string | null;
    tag: string | null;
    accessibility: Descriptor[];
    roles: Descriptor[];
    ratings: Descriptor[];
    viewpoints: Descriptor[];
    serializedManifest: object;
}

export interface AdaptationSet {
    id: string;
    contentType: string;
    lang: string;
    mimeType: string;
    profiles: string | null;
    group: number | null;
    bitstreamSwitching: boolean | null;
    segmentAlignment: boolean;
    maxWidth: number | null;
    maxHeight: number | null;
    maxFrameRate: string | null;
    representations: Representation[];
    contentProtection: ContentProtection[];
    framePackings: Descriptor[];
    ratings: Descriptor[];
    viewpoints: Descriptor[];
    accessibility: Descriptor[];
    labels: Label[];
    groupLabels: Label[];
    roles: Descriptor[];
    contentComponents: ContentComponent[];
    resyncs: Resync[];
    outputProtection: OutputProtection | null;
    stableRenditionId: string | null;
    bitDepth: number | null;
    sampleRate: number | null;
    channels: string | null;
    assocLanguage: string | null;
    characteristics: string[] | null;
    forced: boolean;
    serializedManifest: object;
}

export interface Event {
    startTime: number;
    duration: number;
    message: string;
    messageData: string | null;
    type: string;
    cue: string | null;
    scte35?: object;
}

export interface EventStream {
    schemeIdUri: string;
    value: string | null;
    timescale: number;
    presentationTimeOffset: number;
    events: Event[];
}

export interface AssetIdentifier {
    schemeIdUri: string;
    value: string | null;
}

export interface Subset {
    contains: string[];
    id: string | null;
}

export interface Preselection {
    id: string;
    preselectionComponents: string[];
    lang: string | null;
    order: 'undefined' | 'time-ordered' | 'fully-ordered';
    accessibility: Descriptor[];
    roles: Descriptor[];
    ratings: Descriptor[];
    viewpoints: Descriptor[];
    serializedManifest: object;
}

export interface Latency {
    min: number | null;
    max: number | null;
    target: number | null;
    referenceId: number | null;
}

export interface PlaybackRate {
    min: number | null;
    max: number | null;
}

export interface ServiceDescription {
    id: string;
    scopes: Descriptor[];
    latencies: Latency[];
    playbackRates: PlaybackRate[];
    serializedManifest: object;
}

export interface Period {
    id: string;
    start: number;
    duration: number;
    bitstreamSwitching: boolean | null;
    assetIdentifier: AssetIdentifier | null;
    adaptationSets: AdaptationSet[];
    subsets: Subset[];
    preselections: Preselection[];
    serviceDescriptions: ServiceDescription[];
    eventStreams: EventStream[];
    events: Event[];
    serializedManifest: object;
}

export interface ProgramInformation {
    title: string | null;
    source: string | null;
    copyright: string | null;
    lang: string | null;
    moreInformationURL: string | null;
}

export interface Metrics {
    metrics: string;
    ranges: object[];
    reportings: Descriptor[];
}

export interface VideoTrackSummary {
    id: string;
    profiles: string | null;
    bitrateRange: string;
    resolutions: string[];
    codecs: string[];
    scanType: string | null;
    videoRange: string | null;
    roles: string[];
}

export interface AudioTrackSummary {
    id: string;
    lang: string | null;
    codecs: string[];
    channels: string | null;
    isDefault: boolean;
    isForced: boolean;
    roles: string[];
}

export interface TextTrackSummary {
    id: string;
    lang: string | null;
    codecsOrMimeTypes: string[];
    isDefault: boolean;
    isForced: boolean;
    roles: string[];
}

export interface PeriodSummary {
    id: string;
    start: number;
    duration: number | null;
    videoTracks: AdaptationSet[];
    audioTracks: AdaptationSet[];
    textTracks: AdaptationSet[];
}

export interface ManifestSummary {
    general: {
        protocol: 'DASH' | 'HLS';
        streamType: 'Live / Dynamic' | 'VOD / Static';
        streamTypeColor: 'text-red-400' | 'text-blue-400';
        duration: number | null;
        segmentFormat: string;
        title: string | null;
        locations: string[];
        segmenting: string;
    };
    dash: {
        profiles: string;
        minBufferTime: number | null;
        timeShiftBufferDepth: number | null;
        minimumUpdatePeriod: number | null;
        availabilityStartTime: Date | null;
        publishTime: Date | null;
    } | null;
    hls: {
        version: number;
        targetDuration: number | null;
        iFramePlaylists: number;
        mediaPlaylistDetails: {
            segmentCount: number;
            averageSegmentDuration: number | null;
            hasDiscontinuity: boolean;
            isIFrameOnly: boolean;
        } | null;
    } | null;
    lowLatency: {
        isLowLatency: boolean;
        partTargetDuration: number | null;
        partHoldBack: number | null;
        canBlockReload: boolean;
        targetLatency: number | null;
        minLatency: number | null;
        maxLatency: number | null;
    } | null;
    content: {
        totalPeriods: number;
        totalVideoTracks: number;
        totalAudioTracks: number;
        totalTextTracks: number;
        mediaPlaylists: number;
        periods: PeriodSummary[];
    };
    videoTracks: VideoTrackSummary[];
    audioTracks: AudioTrackSummary[];
    textTracks: TextTrackSummary[];
    security: {
        isEncrypted: boolean;
        systems: string[];
        kids: string[];
    } | null;
}

export interface InitializationSet {
    id: string;
    inAllPeriods: boolean;
    contentType: string | null;
    initialization: string | null;
    codecs: string | null;
    serializedManifest: object;
}

export interface Manifest {
    id: string | null;
    type: 'static' | 'dynamic';
    profiles: string;
    minBufferTime: number;
    publishTime: Date | null;
    availabilityStartTime: Date | null;
    timeShiftBufferDepth: number | null;
    minimumUpdatePeriod: number | null;
    duration: number | null;
    maxSegmentDuration: number | null;
    maxSubsegmentDuration: number | null;
    programInformations: ProgramInformation[];
    metrics: Metrics[];
    locations: string[];
    patchLocations: string[];
    serviceDescriptions: ServiceDescription[];
    initializationSets: InitializationSet[];
    segmentFormat: 'isobmff' | 'ts' | 'unknown';
    events: Event[];
    periods: Period[];
    serializedManifest: Element | object;
    summary: ManifestSummary | null;
    serverControl: object | null;
    hlsDefinedVariables?: Map<string, { value: string; source: string }>;
    tags?: any[];
    isMaster?: boolean;
    variants?: any[];
    segments?: any[];
    preloadHints?: any[];
    renditionReports?: any[];
    partInf?: any;
}

export type MediaPlaylist = {
    manifest: Manifest;
    rawManifest: string;
    lastFetched: Date;
};

export interface FeatureAnalysisResult {
    used: boolean;
    details: string;
}

export interface FeatureAnalysisState {
    results: Map<string, FeatureAnalysisResult>;
    manifestCount: number;
}

export interface HlsVariantState {
    segments: object[];
    freshSegmentUrls: Set<string>;
    isLoading: boolean;
    isPolling: boolean;
    isExpanded: boolean;
    displayMode: 'all' | 'last10';
    error: string | null;
}

export interface DashRepresentationState {
    segments: object[];
    freshSegmentUrls: Set<string>;
}

export interface ComplianceResult {
    id: string;
    text: string;
    status: 'pass' | 'fail' | 'warn' | 'info';
    details: string;
    isoRef: string;
    category: string;
    location: { startLine?: number; endLine?: number; path?: string };
}

export interface ManifestUpdate {
    timestamp: string;
    diffHtml: string;
    rawManifest: string;
    complianceResults: ComplianceResult[];
    hasNewIssues: boolean;
    serializedManifest: object;
}

export interface DecodedNalUnit {
    type: string;
    size: number;
}

export interface DecodedH264Sample {
    format: 'H.264';
    frameType: 'key' | 'delta';
    duration: number;
    timestamp: number;
    nalUnits: DecodedNalUnit[];
}

export interface DecodedAacFrame {
    format: 'AAC';
    objectType: string;
    samplingFrequency: number;
    channelCount: number;
    frameLength: number;
}

export type DecodedSample = DecodedH264Sample | DecodedAacFrame;

export interface Stream {
    id: number;
    name: string;
    originalUrl: string;
    baseUrl: string;
    protocol: 'dash' | 'hls' | 'unknown';
    isPolling: boolean;
    manifest: Manifest | null;
    rawManifest: string;
    steeringInfo: object | null;
    manifestUpdates: ManifestUpdate[];
    activeManifestUpdateIndex: number;
    mediaPlaylists: Map<string, MediaPlaylist>;
    activeMediaPlaylistUrl: string | null;
    featureAnalysis: FeatureAnalysisState;
    hlsVariantState: Map<string, HlsVariantState>;
    dashRepresentationState: Map<string, DashRepresentationState>;
    hlsDefinedVariables?: Map<string, { value: string; source: string }>;
    semanticData: Map<string, any>;
    coverageReport?: CoverageFinding[];
}

export type SerializedStream = Omit<
    Stream,
    | 'mediaPlaylists'
    | 'featureAnalysis'
    | 'hlsVariantState'
    | 'dashRepresentationState'
    | 'hlsDefinedVariables'
    | 'semanticData'
> & {
    mediaPlaylists: [string, MediaPlaylist][];
    featureAnalysis: {
        results: [string, FeatureAnalysisResult][];
        manifestCount: number;
    };
    hlsVariantState: [string, HlsVariantState][];
    dashRepresentationState: [string, DashRepresentationState][];
    hlsDefinedVariables: [string, { value: string; source: string }][];
    semanticData: [string, any][];
    coverageReport: CoverageFinding[];
};

export interface CoverageFinding {
    status: 'unparsed' | 'drift';
    pathOrLine: string;
    type: 'element' | 'attribute' | 'tag' | 'property';
    name: string;
    details: string;
    lineNumber?: number;
}