export interface PlayerState {
    isLoaded: boolean;
    isAbrEnabled: boolean;
    isAutoResetEnabled: boolean;
    isPictureInPicture: boolean;
    isPipUnmount: boolean;
    isMuted: boolean;
    playbackState: 'PLAYING' | 'PAUSED' | 'BUFFERING' | 'ENDED' | 'IDLE';
    videoTracks: object[];
    audioTracks: object[];
    textTracks: object[];
    activeVideoTrack: object | null;
    activeAudioTrack: object | null;
    activeTextTrack: object | null;
    currentStats: PlayerStats | null;
    eventLog: PlayerEvent[];
    hasUnreadLogs: boolean;
    abrHistory: AbrHistoryEntry[];
    playbackHistory: PlaybackHistoryEntry[];
    activeTab: 'controls' | 'stats' | 'log' | 'graphs';
    retryCount: number;
    seekableRange: { start: number; end: number };
}

export interface SourcedData<T> {
    value: T;
    source: 'manifest' | 'segment' | string;
}

export type ResourceType =
    | 'manifest'
    | 'video'
    | 'audio'
    | 'text'
    | 'init'
    | 'key'
    | 'license'
    | 'other';

export interface TimingBreakdown {
    redirect: number;
    dns: number;
    tcp: number;
    tls: number;
    ttfb: number;
    download: number;
}

export interface NetworkEvent {
    id: string;
    url: string;
    resourceType: ResourceType;
    streamId: number | null;
    segmentDuration?: number;
    request: {
        method: string;
        headers: Record<string, string>;
        body?: string | ArrayBuffer | null;
    };
    response: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        contentLength: number | null;
        contentType: string | null;
        body?: string | ArrayBuffer | null;
    };
    timing: {
        startTime: number;
        endTime: number;
        duration: number;
        breakdown: TimingBreakdown | null;
    };
    auditIssues?: {
        id: string;
        level: 'error' | 'warn';
        message: string;
        header?: string;
    }[];
    auditStatus?: 'error' | 'warn' | 'pass';
    visuals?: any;
    size?: number | null;
    throughput?: number;
    efficiency?: number | null;
}

export interface CodecInfo {
    value: string;
    source: 'manifest' | 'segment' | string;
    supported: boolean;
}

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
    codecs: SourcedData<string | null>;
    mimeType: string | null;
    profiles: string | null;
    width: SourcedData<number | null>;
    height: SourcedData<number | null>;
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
    bandwidth: number;
    manifestBandwidth?: number;
    qualityRanking: number | null;
    dependencyId: string | null;
    associationId: string | null;
    associationType: string | null;
    codecs: CodecInfo[];
    mimeType: string | null;
    profiles: string | null;
    width: SourcedData<number | null>;
    height: SourcedData<number | null>;
    frameRate: string | null;
    sar: string | null;
    audioSamplingRate: string | null;
    scanType: 'progressive' | 'interlaced' | 'unknown' | null;
    startWithSAP: number | null;
    selectionPriority: number;
    mediaStreamStructureId: string | null;
    maximumSAPPeriod: number | null;
    maxPlayoutRate: number | null;
    codingDependency: boolean | null;
    eptDelta: number | null;
    pdDelta: number | null;
    representationIndex: URLType | null;
    failoverContent: FailoverContent | null;
    contentProtection: ContentProtection[];
    audioChannelConfigurations: AudioChannelConfiguration[];
    framePackings: Descriptor[];
    ratings: Descriptor[];
    viewpoints: Descriptor[];
    accessibility: Descriptor[];
    labels: Label[];
    label?: string;
    name?: string;
    format?: string;
    groupLabels: Label[];
    roles: Descriptor[];
    subRepresentations: SubRepresentation[];
    resyncs: Resync[];
    outputProtection: OutputProtection | null;
    extendedBandwidth: ExtendedBandwidth | null;
    videoRange?: string;
    stableVariantId: string | null;
    pathwayId: string | null;
    supplementalCodecs: string | null;
    reqVideoLayout: string | null;
    serializedManifest: any;
    __variantUri?: string;
    tag: string | null;
    segmentProfiles: string | null;
    muxedAudio?: {
        codecs: CodecInfo[];
        channels: string | null;
        lang: string | null;
    };
    lang?: string | null;
    switching?: any[];
    randomAccess?: any[];
}

export interface PsshInfo {
    systemId: string;
    kids: string[];
    data?: string;
    licenseServerUrl?: string | null;
}

export interface ContentProtection {
    schemeIdUri: string;
    system: string;
    defaultKid: string | null;
    robustness: string | null;
    pssh?: PsshInfo[];
    refId?: string;
    ref?: string;
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
    subsegmentAlignment: boolean;
    subsegmentStartsWithSAP: number | null;
    width: number | null;
    height: number | null;
    maxWidth: number | null;
    maxHeight: number | null;
    maxFrameRate: string | null;
    sar: string | null;
    maximumSAPPeriod: number | null;
    audioSamplingRate: number | null;
    representations: Representation[];
    contentProtection: ContentProtection[];
    audioChannelConfigurations: AudioChannelConfiguration[];
    framePackings: Descriptor[];
    ratings: Descriptor[];
    viewpoints: Descriptor[];
    accessibility: Descriptor[];
    labels: Label[];
    label?: string;
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
    inbandEventStreams: Descriptor[];
    switching?: any[];
}

export interface Scte35SpliceTime {
    time_specified: boolean;
    pts_time?: number;
}

export interface Scte35BreakDuration {
    auto_return: boolean;
    duration: number;
}

export interface Scte35SpliceCommand {
    type:
        | 'Splice Insert'
        | 'Time Signal'
        | 'Splice Null'
        | 'Splice Schedule'
        | 'Bandwidth Reservation'
        | 'Private Command'
        | 'Unsupported';
    splice_event_id?: number;
    splice_event_cancel_indicator?: number;
    out_of_network_indicator?: number;
    program_splice_flag?: number;
    duration_flag?: number;
    splice_immediate_flag?: number;
    splice_time?: Scte35SpliceTime;
    break_duration?: Scte35BreakDuration;
    unique_program_id?: number;
    avail_num?: number;
    avails_expected?: number;
}

export interface Scte35SegmentationDescriptor {
    segmentation_event_id: number;
    segmentation_event_cancel_indicator: number;
    program_segmentation_flag?: number;
    segmentation_duration_flag?: number;
    delivery_not_restricted_flag?: number;
    segmentation_duration?: number;
    segmentation_upid_type?: number;
    segmentation_upid?: string;
    segmentation_type_id?: string;
    segment_num?: number;
    segments_expected?: number;
}

export interface Scte35SpliceInfoSection {
    table_id: number;
    protocol_version: number;
    pts_adjustment: number;
    cw_index: number;
    tier: number;
    splice_command_type: string;
    splice_command: Scte35SpliceCommand;
    descriptors: Scte35SegmentationDescriptor[];
    crc_32: number;
    error?: string;
}

export interface Event {
    startTime: number;
    duration: number;
    message: string;
    messageData: string | null;
    type: string;
    cue: string | null;
    scte35?: Scte35SpliceInfoSection | { error: string };
    sourceSegmentId?: string;
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
    duration: number | null;
    bitstreamSwitching: boolean | null;
    assetIdentifier: AssetIdentifier | null;
    adaptationSets: AdaptationSet[];
    subsets: Subset[];
    preselections: Preselection[];
    serviceDescriptions: ServiceDescription[];
    eventStreams: EventStream[];
    events: Event[];
    adAvails?: AdAvail[];
    supplementalProperties?: Descriptor[];
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
    label?: string;
    format?: string;
    profiles: string | null;
    bandwidth: number;
    manifestBandwidth?: number;
    frameRate: string | null;
    resolutions: SourcedData<string>[];
    codecs: CodecInfo[];
    scanType: string | null;
    videoRange: string | null;
    roles: Descriptor[];
    muxedAudio?: {
        codecs: CodecInfo[];
        channels: string | null;
        lang: string | null;
    };
    __variantUri?: string;
}

export interface AudioTrackSummary {
    id: string;
    label?: string;
    lang: string | null;
    codecs: CodecInfo[];
    channels: string | null;
    format?: string;
    isDefault: boolean;
    isForced: boolean;
    roles: Descriptor[];
    bandwidth: number;
}

export interface TextTrackSummary {
    id: string;
    label?: string;
    lang: string | null;
    format?: string;
    codecsOrMimeTypes: CodecInfo[];
    isDefault: boolean;
    isForced: boolean;
    roles: Descriptor[];
}

export interface AdaptationSetSummary {
    id: string;
    contentType: string;
    lang: string;
    mimeType: string;
    representationCount: number;
}

export interface PeriodSummary {
    id: string;
    start: number;
    duration: number | null;
    adaptationSets: AdaptationSetSummary[];
}

export interface SecuritySummary {
    isEncrypted: boolean;
    systems: PsshInfo[];
    hlsEncryptionMethod?: 'AES-128' | 'SAMPLE-AES' | 'FairPlay' | null;
    kids?: string[];
    licenseServerUrls?: string[];
}

export interface InitializationSet {
    id: string;
    inAllPeriods: boolean;
    contentType: string | null;
    initialization: string | null;
    codecs: string | null;
    serializedManifest: object;
}

export interface EncryptionInfo {
    method: 'AES-128' | 'SAMPLE-AES' | 'CENC' | 'NONE';
    uri?: string;
    iv?: string | null;
    keyFormat?: string;
    keyFormatVersions?: string;
    systems?: string[];
}

export interface MediaInfoSummary {
    video?: {
        resolution: string;
        frameRate: number | null;
        codec: string;
    };
    audio?: {
        codec: string;
        channels: number;
        sampleRate: number;
        language?: string;
    };
    data?: {
        pid: number;
        streamType: string;
    }[];
}

export interface SidxEntry {
    referencedSize: number;
    subsegmentDuration: number;
    startsWithSap: number;
    sapType: number;
    sapDeltaTime: number;
    referenceType: 'media' | 'sidx' | string;
}

export interface MediaSegment {
    repId: string;
    type: 'Media' | 'Init';
    number: number;
    uniqueId: string;
    resolvedUrl: string;
    template?: string;
    time: number;
    duration: number;
    timescale: number;
    gap: boolean;
    startTimeUTC?: number;
    endTimeUTC?: number;
    flags: string[];
    encryptionInfo?: EncryptionInfo;
    range?: string | null;
    indexRange?: string | null;
    parsedData?: any;
    inbandEvents?: Event[];
    mediaInfo?: MediaInfoSummary | null;
    periodStart?: number;
    sidx?: SidxEntry;
}

export interface HlsSegment extends MediaSegment {
    title: string;
    tags: any[];
    parts: any[];
    bitrate: number | null;
    extinfLineNumber: number;
    uri?: string;
    discontinuity?: boolean;
    dateTime?: string;
    uriLineNumber?: number;
    byteRange?: { length: number; offset: number | null } | null;
    cue?: {
        type: 'in' | 'out' | 'cont';
        duration?: number;
        elapsedTime?: number;
    };
}

export interface CmafValidationResult {
    id: string;
    text: string;
    status: 'pass' | 'fail' | 'warn' | 'info';
    details: string;
}

export interface CmafData {
    status: 'idle' | 'pending' | 'complete' | 'error';
    results: CmafValidationResult[];
}

export interface ManifestSummary {
    general: {
        protocol: 'DASH' | 'HLS';
        streamType: 'Live / Dynamic' | 'VOD / Static';
        streamTypeColor: 'text-red-400' | 'text-blue-500';
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
        maxSegmentDuration?: number | null;
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
            lastSegmentDuration: number | null;
        } | null;
        dvrWindow: number | null;
        hlsParsed?: any;
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
    security: SecuritySummary | null;
    advanced: {
        variables: any[];
        metrics: any[];
        serviceDescriptions: any[];
        popularityRates: any[];
        viewpoints: any[];
        ratings: any[];
        subsets: any[];
        extendedBandwidths: any[];
        failoverContents: any[];
    } | null;
    cmafData: CmafData;
}

export interface Manifest {
    id: string | null;
    type: 'static' | 'dynamic';
    baseUrl?: string;
    profiles: string;
    minBufferTime: number;
    publishTime: Date | null;
    availabilityStartTime: Date | null;
    availabilityEndTime: Date | null;
    timeShiftBufferDepth: number | null;
    minimumUpdatePeriod: number | null;
    duration: number | null;
    maxSegmentDuration: number | null;
    maxSubsegmentDuration: number | null;
    suggestedPresentationDelay?: number | null;
    programInformations: ProgramInformation[];
    metrics: Metrics[];
    locations: string[];
    patchLocations: string[];
    serviceDescriptions: ServiceDescription[];
    initializationSets: InitializationSet[];
    segmentFormat: 'isobmff' | 'ts' | 'unknown';
    periods: Period[];
    events: Event[];
    adAvails?: AdAvail[];
    contentProtections?: ContentProtection[];
    serializedManifest: Element | object;
    summary: ManifestSummary | null;
    serverControl: object | null;
    hlsDefinedVariables?: Map<string, { value: string; source: string }>;
    tags?: any[];
    isMaster?: boolean;
    variants?: any[];
    segments?: HlsSegment[];
    preloadHints?: any[];
    renditionReports?: any[];
    partInf?: any;
    mediaSequence?: number;
    contentPopularityRates?: any[];
}

export interface CoverageFinding {
    status: 'unparsed' | 'drift';
    pathOrLine: string;
    type: 'element' | 'attribute' | 'tag' | 'property';
    name: string;
    details: string;
    lineNumber?: number;
}

export interface AdCreative {
    id: string | null;
    sequence: number;
    duration: number;
    mediaFileUrl: string | null;
    trackingUrls: Map<string, string[]>;
}

export interface AdAvail {
    id: string;
    startTime: number;
    duration: number;
    scte35Signal: Scte35SpliceInfoSection | { error: string };
    adManifestUrl: string | null;
    creatives: AdCreative[];
    detectionMethod:
        | 'SCTE35_INBAND'
        | 'SCTE35_DATERANGE'
        | 'ASSET_IDENTIFIER'
        | 'ENCRYPTION_TRANSITION'
        | 'STRUCTURAL_DISCONTINUITY'
        | 'UNKNOWN';
}

export interface PlayerStats {
    playheadTime: number;
    manifestTime: number;
    playbackQuality: {
        resolution: string;
        droppedFrames: number;
        corruptedFrames: number;
        totalStalls: number;
        totalStallDuration: number;
        timeToFirstFrame: number;
        decodedFrames: number;
    };
    abr: {
        currentVideoBitrate: number;
        estimatedBandwidth: number;
        switchesUp: number;
        switchesDown: number;
        loadLatency: number;
    };
    buffer: {
        label: 'Buffer Health' | 'Live Latency';
        seconds: number;
        totalGaps: number;
        forwardBuffer: number;
    };
    session: {
        totalPlayTime: number;
        totalBufferingTime: number;
    };
}

export interface PlayerEvent {
    timestamp: string;
    type:
        | 'adaptation'
        | 'buffering'
        | 'seek'
        | 'error'
        | 'stall'
        | 'lifecycle'
        | 'interaction'
        | 'metadata';
    details: string;
}

export interface AbrHistoryEntry {
    time: number;
    bitrate: number;
    width: number;
    height: number;
}

export interface AdaptationEvent {
    time: number;
    oldWidth: number | undefined;
    oldHeight: number | undefined;
    newWidth: number | undefined;
    newHeight: number | undefined;
    newBandwidth: number | undefined;
}

export interface PlayerActions {
    setLoadedState: (isLoaded: boolean) => void;
    setAbrEnabled: (isAbrEnabled: boolean) => void;
    setPictureInPicture: (isInPiP: boolean) => void;
    setPipUnmountState: (isPipUnmount: boolean) => void;
    setMutedState: (isMuted: boolean) => void;
    updatePlaybackInfo: (
        info: Partial<
            Pick<
                PlayerState,
                | 'playbackState'
                | 'activeVideoTrack'
                | 'activeAudioTrack'
                | 'activeTextTrack'
                | 'videoTracks'
                | 'audioTracks'
                | 'textTracks'
            >
        >
    ) => void;
    updateStats: (stats: PlayerStats) => void;
    logEvent: (event: PlayerEvent) => void;
    logAbrSwitch: (entry: AbrHistoryEntry) => void;
    setActiveTab: (tab: 'controls' | 'stats' | 'log' | 'graphs') => void;
    reset: () => void;
    setInitialTracksFromManifest: (manifest: Manifest) => void;
}

export interface PlayerInstance {
    streamId: number;
    sourceStreamId: number;
    streamName: string;
    manifestUrl: string | null;
    streamType: 'live' | 'vod';
    state:
        | 'idle'
        | 'loading'
        | 'playing'
        | 'paused'
        | 'buffering'
        | 'ended'
        | 'error';
    error: string | null;
    stats: PlayerStats | null;
    playbackHistory: PlaybackHistoryEntry[];
    health: 'healthy' | 'warning' | 'critical';
    selectedForAction: boolean;
    abrOverride: boolean | null;
    maxHeightOverride: number | null;
    maxBandwidthOverride: number | null;
    bufferingGoalOverride: number | null;
    initialState: any;
    variantTracks: any[];
    audioTracks: any[];
    textTracks: any[];
    activeVideoTrack: any;
    seekableRange: { start: number; end: number };
    normalizedPlayheadTime: number;
    retryCount: number;
    isHudVisible: boolean;
    isBasePlayer: boolean;
}

export interface MultiPlayerState {
    players: Map<number, PlayerInstance>;
    isMutedAll: boolean;
    isAutoResetEnabled: boolean;
    eventLog: any[];
    streamIdCounter: number;
    hoveredStreamId: number | null;
    layoutMode: 'grid' | 'focus';
    gridColumns: number | 'auto';
    focusedStreamId: number | null;
    showGlobalHud: boolean;
    globalAbrEnabled: boolean;
    globalMaxHeight: number;
    globalBandwidthCap: number;
    globalBufferingGoal: number;
}

export interface ConditionalPollingState {
    streamId: number | null;
    featureName: string | null;
    status: 'idle' | 'active' | 'found' | 'error';
    targetStreamId: number | null;
    targetFeatureName: string | null;
}

export interface TimedEntity {
    id: string;
    type: 'period' | 'ad' | 'event' | 'segment' | 'abr' | 'gap';
    start: number;
    end: number;
    label: string;
    data: any;
}

export interface ModalState {
    isModalOpen: boolean;
    isModalFullWidth: boolean;
    modalTitle: string;
    modalUrl: string;
    modalContent: { type: string; data: any } | null;
}

export interface InteractiveManifestHoverItem {
    type: 'tag' | 'attribute';
    name: string;
    info: object;
    path: string;
}

export interface UiState {
    _viewMap: object | null;
    viewState: 'input' | 'results';
    activeTab: string;
    activeSidebar: 'primary' | 'contextual' | null;
    multiPlayerActiveTab: 'event-log' | 'graphs' | 'controls';
    multiPlayerViewMode: 'grid' | 'immersive';
    activeSegmentUrl: string | null;
    activeSegmentHighlightRange: { start: number; end: number } | null;
    activeSegmentIsIFrame: boolean;
    modalState: ModalState;
    isCmafSummaryExpanded: boolean;
    interactiveManifestCurrentPage: number;
    interactiveManifestShowSubstituted: boolean;
    interactiveManifestHoveredItem: object | null;
    interactiveManifestSelectedItem: object | null;
    interactiveSegmentCurrentPage: number;
    interactiveSegmentActiveTab: 'inspector' | 'hex' | 'structure';
    interactiveSegmentSelectedItem: { item: any } | null;
    interactiveSegmentHighlightedItem: { item: any; field: string } | null;
    isByteMapLoading: boolean;
    complianceActiveFilter: 'all' | 'fail' | 'warn';
    complianceStandardVersion: number;
    featureAnalysisStandardVersion: number;
    segmentExplorerActiveRepId: string | null;
    segmentExplorerActiveTab: string;
    segmentExplorerClosedGroups: Set<string>;
    segmentExplorerSortOrder: 'asc' | 'desc';
    segmentExplorerTargetTime: Date | null;
    segmentExplorerScrollToTarget: boolean;
    highlightedCompliancePathId: string | null;
    comparisonHideSameRows: boolean;
    comparisonHideUnusedFeatures: boolean;
    expandedComparisonTables: Set<string>;
    expandedComparisonFlags: Set<string>;
    segmentComparisonActiveTab: 'tabular' | 'structural';
    segmentComparisonSelection: { idA: string | null; idB: string | null };
    playerControlMode: 'standard' | 'advanced';
    streamLibraryActiveTab: 'workspaces' | 'presets' | 'history' | 'examples';
    streamLibrarySearchTerm: string;
    streamInputActiveMobileTab: 'library' | 'workspace' | 'inspector';
    workspaces: any[];
    presets: any[];
    history: any[];
    loadedWorkspaceName: string | null;
    isRestoringSession: boolean;
    segmentAnalysisActiveTab: 'structure' | 'semantic';
    conditionalPolling: ConditionalPollingState;
    inactivityTimeoutOverride: number | null;
    globalPollingIntervalOverride: number | null;
    showAllDrmFields: boolean;
    manifestUpdatesHideDeleted: boolean;
    timelineHoveredItem: TimedEntity | null;
    timelineSelectedItem: TimedEntity | null;
    timelineActiveTab: 'overview' | 'cascade';
    segmentPollingSelectorState: {
        expandedStreamIds: Set<number>;
        tabState: Map<number, string>;
    };
    debugCopySelections: {
        analysisState: boolean;
        uiState: boolean;
        rawManifests: boolean;
        parsedSegments: boolean;
    };
    segmentMatrixClickMode: 'inspect' | 'compare';
    isSignalMonitorOpen: boolean;
    inspectorActiveTab: 'stream';
    presetSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
    playerTelemetrySidebarOpen: boolean;
}

export interface UiActions {
    startConditionalPolling: (streamId: number, featureName: string) => void;
    clearConditionalPolling: () => void;
    setConditionalPollingStatus: (
        status: 'idle' | 'active' | 'found' | 'error'
    ) => void;
    setConditionalPollingTarget: (target: {
        streamId?: number | null;
        featureName?: string | null;
    }) => void;
    setInactivityTimeoutOverride: (durationMs: number | null) => void;
    navigateToInteractiveSegment: (
        segmentUniqueId: string,
        options?: {
            highlightRange?: { start: number; end: number } | null;
            isIFrame?: boolean;
        }
    ) => void;
    toggleManifestUpdatesHideDeleted: () => void;
    toggleComparisonHideUnusedFeatures: () => void;
    setTimelineHoveredItem: (item: TimedEntity | null) => void;
    setTimelineSelectedItem: (item: TimedEntity | null) => void;
    setTimelineActiveTab: (tab: 'overview' | 'cascade') => void;
    setSegmentComparisonSelection: (selection: {
        idA?: string | null;
        idB?: string | null;
    }) => void;
}

export interface PlaybackHistoryEntry {
    time: number;
    bufferHealth: number;
    bandwidth: number;
    bitrate: number;
}

export interface PlayerState {
    isLoaded: boolean;
    isAbrEnabled: boolean;
    isPictureInPicture: boolean;
    isPipUnmount: boolean;
    isMuted: boolean;
    playbackState: 'PLAYING' | 'PAUSED' | 'BUFFERING' | 'ENDED' | 'IDLE';
    videoTracks: object[];
    audioTracks: object[];
    textTracks: object[];
    activeVideoTrack: object | null;
    activeAudioTrack: object | null;
    activeTextTrack: object | null;
    currentStats: PlayerStats | null;
    eventLog: PlayerEvent[];
    hasUnreadLogs: boolean;
    abrHistory: AbrHistoryEntry[];
    playbackHistory: PlaybackHistoryEntry[];
    activeTab: 'controls' | 'stats' | 'log' | 'graphs';
}

export interface PlayerActions {
    setLoadedState: (isLoaded: boolean) => void;
    setAbrEnabled: (isAbrEnabled: boolean) => void;
    setPictureInPicture: (isInPiP: boolean) => void;
    setPipUnmountState: (isPipUnmount: boolean) => void;
    setMutedState: (isMuted: boolean) => void;
    updatePlaybackInfo: (
        info: Partial<
            Pick<
                PlayerState,
                | 'playbackState'
                | 'activeVideoTrack'
                | 'activeAudioTrack'
                | 'activeTextTrack'
                | 'videoTracks'
                | 'audioTracks'
                | 'textTracks'
            >
        >
    ) => void;
    updateStats: (stats: PlayerStats) => void;
    logEvent: (event: PlayerEvent) => void;
    logAbrSwitch: (entry: AbrHistoryEntry) => void;
    setActiveTab: (tab: 'controls' | 'stats' | 'log' | 'graphs') => void;
    reset: () => void;
    setInitialTracksFromManifest: (manifest: Manifest) => void;
}

export interface TtmlCue {
    id: string | null;
    startTime: number;
    endTime: number;
    payload: string;
}

export interface TtmlPayload {
    cues: TtmlCue[];
    errors: string[];
}

export interface Box {
    type: string;
    size: number;
    offset: number;
    contentOffset: number;
    headerSize: number;
    details: Record<
        string,
        { value: any; offset: number; length: number; internal?: boolean }
    >;
    children: Box[];
    samples?: Sample[];
    entries?: any[];
    issues?: { type: 'error' | 'warn'; message: string }[];
    isChunk?: boolean;
    color?: object;
    systemId?: string;
    kids?: string[];
    data?: string;
    scte35?: object;
    spsList?: any[];
    ppsList?: any[];
    nal_unit_arrays?: any[];
    nal_arrays?: any[]; // Fixed: Added for VVC/EVC parsers
    messagePayloadType?: 'xml' | 'scte35' | 'id3' | 'binary';
    messagePayload?: any;
    dataView?: DataView;
    chunkInfo?: {
        index: number;
        totalSize: number;
        baseTime: number;
        sampleCount: number;
    };
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

export interface DiffWordPart {
    type: 'added' | 'removed' | 'common';
    value: string;
}

export interface DiffLine {
    type: 'added' | 'removed' | 'common' | 'modified';
    indentation: string;
    content: string;
    parts?: DiffWordPart[];
}

export interface ManifestUpdate {
    id: string;
    sequenceNumber: number;
    endSequenceNumber?: number;
    timestamp: string;
    endTimestamp?: string;
    diffModel: DiffLine[];
    rawManifest: string;
    complianceResults: ComplianceResult[];
    hasNewIssues: boolean;
    serializedManifest: object;
    changes: { additions: number; removals: number; modifications: number };
}

export type MediaPlaylist = {
    manifest: Manifest;
    rawManifest: string;
    lastFetched: Date;
    updates: ManifestUpdate[];
    activeUpdateId: string | null;
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
    uri: string;
    historicalUris: string[];
    segments: HlsSegment[];
    currentSegmentUrls: Set<string>;
    newlyAddedSegmentUrls: Set<string>;
    isLoading: boolean;
    isPolling: boolean;
    isExpanded: boolean;
    displayMode: 'all' | 'last10';
    error: string | null;
}

export interface DashRepresentationState {
    segments: MediaSegment[];
    currentSegmentUrls: Set<string>;
    newlyAddedSegmentUrls: Set<string>;
    diagnostics: object;
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

export interface Sample {
    duration?: number;
    size?: number;
    sampleFlags?: object;
    compositionTimeOffset?: number;
    isSample?: boolean;
    index?: number;
    offset?: number;
    trunOffset?: number;
    color?: { bgClass: string };
    baseMediaDecodeTime?: number;
    trackId?: number;
    dependsOn?: string;
    degradationPriority?: number;
    sampleGroup?: number;
    encryption?: any;
    has_emsg?: boolean;
    emsg_ref?: Box;
    ttmlPayload?: TtmlPayload | { error: string };
}

export interface KeyValuePair {
    id: number;
    key: string;
    value: string;
}

export interface AuthInfo {
    headers: KeyValuePair[];
    queryParams: KeyValuePair[];
}

export interface DrmAuthInfo {
    licenseServerUrl: string | { [key: string]: string };
    serverCertificate:
        | string
        | File
        | ArrayBuffer
        | { [keySystem: string]: string | File | ArrayBuffer }
        | null;
    headers: KeyValuePair[];
    queryParams: KeyValuePair[];
}

export interface Tier0Metadata {
    status: number; // HTTP status code
    protocol: 'HLS' | 'DASH' | 'Unknown';
    type: 'LIVE' | 'VOD' | 'Unknown';
    isEncrypted: boolean;
    detectedDrm: string[];
    isLowLatency: boolean;
    server?: string;
    duration?: number;
}

export interface StreamInput {
    id: number;
    url: string;
    name: string;
    file: File | null;
    auth: AuthInfo;
    drmAuth: DrmAuthInfo;
    detectedDrm: string[] | null;
    isDrmInfoLoading: boolean;
    tier0: Tier0Metadata | null;
    isTier0AnalysisLoading: boolean;
}

export interface Stream {
    id: number;
    name: string;
    originalUrl: string | null;
    resolvedUrl?: string | null;
    baseUrl: string;
    protocol: 'dash' | 'hls' | 'local' | 'unknown';
    isPolling: boolean;
    wasStoppedByInactivity?: boolean;
    pollingIntervalOverride?: number | null;
    initialTimeOffset?: number;
    manifest: Manifest | null;
    rawManifest: string;
    patchedRawManifest?: string;
    patchedManifestUrl?: string | null;
    originalSerializedManifest?: object;
    patchRules?: any[];
    steeringInfo: object | null;
    manifestUpdates: ManifestUpdate[];
    activeManifestUpdateId: string | null;
    mediaPlaylists: Map<string, MediaPlaylist>;
    activeMediaPlaylistUrl: string | null;
    activeMediaPlaylistId?: string | null;
    featureAnalysis: FeatureAnalysisState;
    hlsVariantState: Map<string, HlsVariantState>;
    dashRepresentationState: Map<string, DashRepresentationState>;
    hlsDefinedVariables?: Map<string, { value: string; source: string }>;
    semanticData: Map<string, any>;
    coverageReport?: CoverageFinding[];
    adAvails?: AdAvail[];
    inbandEvents?: Event[];
    segments?: MediaSegment[];
    auth: AuthInfo;
    drmAuth: DrmAuthInfo;
    licenseServerUrl: string;
    adaptationEvents: AdaptationEvent[];
    segmentPollingReps: Set<string>;
}

export interface SegmentToCompare {
    streamId: number;
    repId: string;
    segmentUniqueId: string;
}
