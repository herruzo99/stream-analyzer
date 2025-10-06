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
 * @typedef {object} SubRepresentation
 * @property {number | null} level
 * @property {string | null} dependencyLevel
 * @property {number | null} bandwidth
 * @property {string[] | null} contentComponent
 * @property {string} codecs
 * @property {string | null} mimeType
 * @property {string | null} profiles
 * @property {number | null} width
 * @property {number | null} height
 * @property {object} serializedManifest
 */

/**
 * @typedef {object} Representation
 * @property {string} id
 * @property {string} codecs
 * @property {number} bandwidth
 * @property {number} width
 * @property {number} height
 * @property {string | null} frameRate
 * @property {string | null} sar
 * @property {string | null} mimeType
 * @property {string | null} profiles
 * @property {number | null} qualityRanking
 * @property {number} selectionPriority
 * @property {boolean | null} codingDependency
 * @property {'progressive' | 'interlaced' | 'unknown' | null} scanType
 * @property {string | null} dependencyId
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
 * @property {SubRepresentation[]} subRepresentations
 * @property {string | undefined} videoRange
 * @property {string | null} stableVariantId
 * @property {string | null} pathwayId
 * @property {string | null} supplementalCodecs
 * @property {string | null} reqVideoLayout
 * @property {object} serializedManifest
 */

/**
 * @typedef {object} ContentProtection
 * @property {string} schemeIdUri
 * @property {string} system
 * @property {string | null} defaultKid
 */

/**
 * @typedef {object} ContentComponent
 * @property {string | null} id
 * @property {string | null} lang
 * @property {string | null} contentType
 * @property {string | null} par
 * @property {string | null} tag
 * @property {Descriptor[]} accessibility
 * @property {Descriptor[]} roles
 * @property {Descriptor[]} ratings
 * @property {Descriptor[]} viewpoints
 * @property {object} serializedManifest
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
 * @property {ContentComponent[]} contentComponents
 * @property {string | null} stableRenditionId
 * @property {number | null} bitDepth
 * @property {number | null} sampleRate
 * @property {string | null} channels
 * @property {string | null} assocLanguage
 * @property {string[] | null} characteristics
 * @property {boolean} forced
 * @property {object} serializedManifest
 */

/**
 * @typedef {object} Event
 * @property {number} startTime - The start time of the event in seconds.
 * @property {number} duration - The duration of the event in seconds.
 * @property {string} message - A descriptive message for the event.
 * @property {string | null} messageData
 * @property {string} type - A category for the event (e.g., 'dash-event', 'hls-daterange').
 * @property {string | null} cue
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
 * @property {object} serializedManifest
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
 * @property {string | null} channels
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
 * @typedef {object} PeriodSummary
 * @property {string} id
 * @property {number} start
 * @property {number | null} duration
 * @property {AdaptationSet[]} videoTracks
 * @property {AdaptationSet[]} audioTracks
 * @property {AdaptationSet[]} textTracks
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
 *   totalPeriods: number,
 *   totalVideoTracks: number,
 *   totalAudioTracks: number,
 *   totalTextTracks: number,
 *   mediaPlaylists: number,
 *   periods: PeriodSummary[],
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
 * @property {Element | object} serializedManifest - Reference to the original parsed element or object.
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
 * @typedef {object} ComplianceResult
 * @property {string} id
 * @property {string} text
 * @property {'pass' | 'fail' | 'warn' | 'info'} status
 * @property {string} details
 * @property {string} isoRef
 * @property {string} category
 * @property {{startLine?: number, endLine?: number, path?: string}} location
 */

/**
 * @typedef {object} ManifestUpdate
 * @property {string} timestamp
 * @property {string} diffHtml
 * @property {string} rawManifest
 * @property {ComplianceResult[]} complianceResults
 * @property {boolean} hasNewIssues
 * @property {object} serializedManifest - A pristine snapshot of the manifest object for this update.
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
 * @property {object | null} steeringInfo - The parsed EXT-X-CONTENT-STEERING tag.
 * @property {ManifestUpdate[]} manifestUpdates
 * @property {number} activeManifestUpdateIndex
 * @property {Map<string, MediaPlaylist>} mediaPlaylists - A cache of fetched media playlists for HLS.
 * @property {string | null} activeMediaPlaylistUrl - The URL of the currently viewed media playlist.
 * @property {FeatureAnalysisState} featureAnalysis - Aggregated feature analysis results.
 * @property {Map<string, HlsVariantState>} hlsVariantState - State for each HLS variant playlist in the segment explorer.
 * @property {Map<string, DashRepresentationState>} dashRepresentationState
 * @property {Map<string, {value: string, source: string}>=} hlsDefinedVariables
 * @property {Map<string, any>} semanticData
 */

/**
 * @typedef {Omit<Stream, 'mediaPlaylists' | 'featureAnalysis' | 'hlsVariantState' | 'dashRepresentationState' | 'hlsDefinedVariables' | 'semanticData'> & {
 *   mediaPlaylists: [string, MediaPlaylist][],
 *   featureAnalysis: {
 *     results: [string, FeatureAnalysisResult][],
 *     manifestCount: number,
 *   },
 *   hlsVariantState: [string, HlsVariantState][],
 *   dashRepresentationState: [string, DashRepresentationState][],
 *   hlsDefinedVariables: [string, {value: string, source: string}][],
 *   semanticData: [string, any][],
 * }} SerializedStream
 */

export {};