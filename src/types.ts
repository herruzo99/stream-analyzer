export interface SourcedData<T> {
    value: T;
    source: 'manifest' | 'segment';
}

export interface CodecInfo {
    value: string;
    source: 'manifest' | 'segment';
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
    manifestBandwidth?: number; // Store original manifest value
    qualityRanking: number | null;
    dependencyId: string | null;
    associationId: string | null;
    associationType: string | null;
    codecs: SourcedData<string | null>;
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
    __variantUri?: string; // Internal property for HLS enrichment
    // --- ARCHITECTURAL FIX: Add missing properties ---
    tag: string | null;
    segmentProfiles: string | null;
    // --- END FIX ---
}

export interface PsshInfo {
    systemId: string;
    kids: string[];
    data: string; // Base64 encoded PSSH box data
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
}

// --- SCTE-35 Type Definitions ---
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
// --- End SCTE-35 Type Definitions ---

export interface Event {
    startTime: number;
    duration: number;
    message: string;
    messageData: string | null;
    type: string;
    cue: string | null;
    scte35?: Scte35SpliceInfoSection | { error: string };
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
    profiles: string | null;
    bitrateRange: string;
    resolutions: SourcedData<string>[];
    codecs: CodecInfo[];
    scanType: string | null;
    videoRange: string | null;
    roles: string[];
}

export interface AudioTrackSummary {
    id: string;
    lang: string | null;
    codecs: CodecInfo[];
    channels: string | null;
    isDefault: boolean;
    isForced: boolean;
    roles: string[];
}

export interface TextTrackSummary {
    id: string;
    lang: string | null;
    codecsOrMimeTypes: CodecInfo[];
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

export interface SecuritySummary {
    isEncrypted: boolean;
    systems: PsshInfo[];
    hlsEncryptionMethod?: 'AES-128' | 'SAMPLE-AES' | null;
    kids?: string[];
    licenseServerUrls?: string[];
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
    uri?: string; // HLS Key URI
    iv?: string | null;
    keyFormat?: string;
    keyFormatVersions?: string;
    systems?: string[]; // DASH DRM Systems
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
    parsedData?: any; // For local segment analysis
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
    id: string;
    sequenceNumber: number;
    timestamp: string;
    diffHtml: string;
    rawManifest: string;
    complianceResults: ComplianceResult[];
    hasNewIssues: boolean;
    serializedManifest: object;
    changes: {
        additions: number;
        removals: number;
        modifications: number;
    };
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

// This is the TypeScript interface for the JSDoc @typedef in parser.js
export interface Box {
    type: string;
    size: number;
    offset: number;
    contentOffset: number;
    headerSize: number;
    details: Record<string, { value: any; offset: number; length: number }>;
    children: Box[];
    samples?: object[];
    entries?: any[];
    issues?: { type: 'error' | 'warn'; message: string }[];
    isChunk?: boolean;
    color?: object;
    systemId?: string;
    kids?: string[];
    data?: string;
    scte35?: object;
}

export interface SegmentToCompare {
    streamId: number;
    repId: string;
    segmentUniqueId: string;
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
    licenseServerUrl: string;
    serverCertificate: string | File | ArrayBuffer | null;
    headers: KeyValuePair[];
    queryParams: KeyValuePair[];
}

export interface StreamInput {
    id: number;
    url: string;
    name: string;
    file: File | null;
    auth: AuthInfo;
    drmAuth: DrmAuthInfo;
}

export interface Stream {
    id: number;
    name: string;
    originalUrl: string;
    baseUrl: string;
    protocol: 'dash' | 'hls' | 'local' | 'unknown';
    isPolling: boolean;
    wasStoppedByInactivity?: boolean;
    manifest: Manifest | null;
    rawManifest: string;
    steeringInfo: object | null;
    manifestUpdates: ManifestUpdate[];
    activeManifestUpdateId: string | null;
    mediaPlaylists: Map<string, MediaPlaylist>;
    activeMediaPlaylistUrl: string | null;
    featureAnalysis: FeatureAnalysisState;
    hlsVariantState: Map<string, HlsVariantState>;
    dashRepresentationState: Map<string, DashRepresentationState>;
    hlsDefinedVariables?: Map<string, { value: string; source: string }>;
    semanticData: Map<string, any>;
    coverageReport?: CoverageFinding[];
    adAvails?: AdAvail[];
    inbandEvents?: Event[];
    segments?: MediaSegment[]; // For 'local' protocol
    auth: AuthInfo;
    drmAuth: DrmAuthInfo;
    licenseServerUrl: string;
    adaptationEvents: AdaptationEvent[];
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
}

// --- Network Analysis Types ---
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
    ttfb: number; // Time to First Byte
    download: number; // Content Download
}

export interface NetworkEvent {
    id: string;
    url: string;
    resourceType: ResourceType;
    streamId: number;
    segmentDuration?: number; // Duration of the media segment in seconds
    request: {
        method: string;
        headers: Record<string, string>;
    };
    response: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        contentLength: number | null;
        contentType: string | null;
    };
    timing: {
        startTime: number; // performance.now() relative to analysis start
        endTime: number;
        duration: number;
        breakdown: TimingBreakdown;
    };
}

// --- Player Simulation Types ---
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
    };
    abr: {
        currentVideoBitrate: number;
        estimatedBandwidth: number;
        switchesUp: number;
        switchesDown: number;
    };
    buffer: {
        label: 'Buffer Health' | 'Live Latency';
        seconds: number;
        totalGaps: number;
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
    time: number; // Playhead time
    bitrate: number;
    width: number;
    height: number;
}

export interface AdaptationEvent {
    time: number;
    oldWidth: number;
    oldHeight: number;
    newWidth: number;
    newHeight: number;
}

// --- Multi-Player View Types ---
export interface PlayerInstance {
    streamId: number;
    streamName: string;
    manifestUrl: string | null;
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
}

// --- FIX: Moved SerializedStream to after Stream is defined ---
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
