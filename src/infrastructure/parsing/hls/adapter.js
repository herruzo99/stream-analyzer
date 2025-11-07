/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').Period} Period
 * @typedef {import('@/types.ts').AdaptationSet} AdaptationSet
 * @typedef {import('@/types.ts').Representation} Representation
 */

import { parseScte35 } from '@/infrastructure/parsing/scte35/parser';
import { getDrmSystemName } from '../utils/drm.js';
import { inferMediaInfoFromExtension } from '../utils/media-types.js';

// --- Sorter Functions ---
const contentTypeOrder = ['video', 'audio', 'text', 'application'];
function sortAdaptationSets(a, b) {
    const indexA = contentTypeOrder.indexOf(a.contentType);
    const indexB = contentTypeOrder.indexOf(b.contentType);

    if (indexA !== indexB) {
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    }

    if (a.contentType === 'audio' || a.contentType === 'text') {
        const langA = a.lang || '';
        const langB = b.lang || '';
        if (langA.localeCompare(langB) !== 0) {
            return langA.localeCompare(langB);
        }
    }

    // Fallback to ID for stable sort
    const idA = a.id || '';
    const idB = b.id || '';
    return idA.localeCompare(idB);
}
// --- End Sorter Functions ---

/**
 * Determines the segment format for an HLS manifest using reliable heuristics.
 * @param {object} hlsParsed - The parsed HLS manifest data from the parser.
 * @returns {'isobmff' | 'ts' | 'unknown'}
 */
function determineSegmentFormat(hlsParsed) {
    // 1. Definitive check: If EXT-X-MAP is present, it's fMP4 (ISOBMFF).
    if (hlsParsed.map) {
        return 'isobmff';
    }

    // 2. Media Playlist Check: Check segment extensions directly. This is highly reliable.
    if (hlsParsed.segments && hlsParsed.segments.length > 0) {
        for (const segment of hlsParsed.segments) {
            const lowerUri = (segment.uri || '').toLowerCase();
            if (
                lowerUri.endsWith('.m4s') ||
                lowerUri.endsWith('.mp4') ||
                lowerUri.includes('.cmf')
            ) {
                return 'isobmff';
            }
            if (lowerUri.endsWith('.ts')) {
                return 'ts';
            }
        }
    }

    // 3. Master Playlist Heuristic: Check extensions of variant stream URIs.
    if (
        hlsParsed.isMaster &&
        hlsParsed.variants &&
        hlsParsed.variants.length > 0
    ) {
        for (const variant of hlsParsed.variants) {
            const lowerUri = (variant.uri || '').toLowerCase();
            if (lowerUri.includes('.m4s') || lowerUri.includes('.mp4')) {
                return 'isobmff';
            }
            if (lowerUri.includes('.ts')) {
                return 'ts';
            }
        }
    }

    // 4. Final Fallback: If no clues, we cannot be certain. Return 'unknown'.
    return 'unknown';
}

/**
 * Returns the correct MIME type based on content and segment format.
 * @param {'video' | 'audio' | 'text' | 'init' | 'unknown'} contentType
 * @param {'isobmff' | 'ts' | 'unknown'} segmentFormat
 * @returns {string} The corresponding MIME type.
 */
function getMimeType(contentType, segmentFormat) {
    if (contentType === 'text') {
        return 'text/vtt';
    }
    if (contentType === 'init') {
        return 'video/mp4';
    }
    if (segmentFormat === 'isobmff') {
        return `${contentType}/mp4`;
    }
    if (segmentFormat === 'ts') {
        return `${contentType}/mp2t`;
    }
    return 'application/octet-stream'; // Fallback for unknown
}

/**
 * Transforms a parsed HLS manifest object into a protocol-agnostic Intermediate Representation (IR).
 * @param {object} hlsParsed - The parsed HLS manifest data from the parser.
 * @param {object} [context] - Context for enrichment.
 * @returns {Promise<Manifest>} The manifest IR object.
 */
export async function adaptHlsToIr(hlsParsed, context) {
    const segmentFormat = determineSegmentFormat(hlsParsed);

    /** @type {Manifest} */
    const manifestIR = {
        id: null,
        type: hlsParsed.isLive ? 'dynamic' : 'static',
        profiles: `HLS v${hlsParsed.version}`,
        minBufferTime: hlsParsed.targetDuration || null,
        publishTime: null,
        availabilityStartTime: null,
        timeShiftBufferDepth: null,
        minimumUpdatePeriod: hlsParsed.isLive ? hlsParsed.targetDuration : null,
        duration: hlsParsed.isMaster
            ? null
            : hlsParsed.segments.reduce((sum, seg) => sum + seg.duration, 0),
        maxSegmentDuration: null,
        maxSubsegmentDuration: null,
        programInformations: [],
        metrics: [],
        locations: [],
        patchLocations: [],
        serviceDescriptions: [],
        initializationSets: [],
        segmentFormat: segmentFormat,
        periods: [],
        events: [],
        serializedManifest: hlsParsed,
        summary: null, // Will be populated after main parsing
        serverControl: hlsParsed.serverControl || null,
        tags: hlsParsed.tags || [], // Copy tags for feature analysis
        isMaster: hlsParsed.isMaster,
        variants: hlsParsed.variants || [],
        segments: hlsParsed.segments || [],
        preloadHints: hlsParsed.preloadHints || [],
        renditionReports: hlsParsed.renditionReports || [],
        partInf: hlsParsed.partInf || null,
        mediaSequence: hlsParsed.mediaSequence,
    };

    // Parse Date Ranges into standard Event objects
    const dateRanges = hlsParsed.tags.filter(
        (t) => t.name === 'EXT-X-DATERANGE'
    );
    let cumulativeTime = 0;
    const pdtMap = new Map();
    for (const seg of hlsParsed.segments) {
        if (seg.dateTime) {
            pdtMap.set(new Date(seg.dateTime).getTime(), cumulativeTime);
        }
        cumulativeTime += seg.duration;
    }

    for (const range of dateRanges) {
        const startDate = new Date(range.value['START-DATE']).getTime();
        const duration = parseFloat(range.value['DURATION']);
        // Find the closest preceding PDT to calculate start time
        const closestPdt = Array.from(pdtMap.keys())
            .filter((t) => t <= startDate)
            .pop();

        if (closestPdt) {
            const timeOffset = (startDate - closestPdt) / 1000;
            const isInterstitial =
                range.value.CLASS === 'com.apple.hls.interstitial';
            const event = {
                startTime: pdtMap.get(closestPdt) + timeOffset,
                duration: duration,
                message: isInterstitial
                    ? `Interstitial: ${range.value['ID'] || 'N/A'}`
                    : `Date Range: ${range.value['ID'] || 'N/A'}`,
                messageData: isInterstitial ? range.value : null,
                type: 'hls-daterange',
                cue: range.value['CUE'] || null,
                scte35: null,
            };

            const scte35Out = range.value['SCTE35-OUT'];
            const scte35In = range.value['SCTE35-IN'];
            const scte35Cmd = range.value['SCTE35-CMD'];
            const scte35Data = scte35Out || scte35In || scte35Cmd;

            if (scte35Data) {
                try {
                    // SCTE-35 data in HLS is typically hex-encoded
                    const hex = String(scte35Data).replace(/^0x/, '');
                    const binaryData = new Uint8Array(
                        hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
                    );
                    event.scte35 = parseScte35(binaryData);
                } catch (e) {
                    console.error('Failed to parse SCTE-35 from DATERANGE:', e);
                }
            }
            manifestIR.events.push(event);
        }
    }

    /** @type {Period} */
    const periodIR = {
        id: 'hls-period-0',
        start: 0,
        duration: manifestIR.duration,
        bitstreamSwitching: null,
        assetIdentifier: null,
        subsets: [],
        adaptationSets: [],
        eventStreams: [],
        events: [], // HLS events are manifest-level
        serializedManifest: hlsParsed,
        serviceDescriptions: [],
        preselections: [],
    };

    // --- Enhanced ContentProtection Processing ---
    const allKeyTags = [
        ...hlsParsed.tags.filter((t) => t.name === 'EXT-X-KEY'),
        ...hlsParsed.tags.filter((t) => t.name === 'EXT-X-SESSION-KEY'),
    ];

    const contentProtectionIRs = allKeyTags
        .filter((tag) => tag.value.METHOD && tag.value.METHOD !== 'NONE')
        .map((tag) => {
            const schemeIdUri = tag.value.KEYFORMAT || 'identity';
            return {
                schemeIdUri: schemeIdUri,
                system: getDrmSystemName(schemeIdUri) || tag.value.METHOD,
                defaultKid: tag.value.KEYID || null,
                robustness: null, // HLS does not define robustness in this context
            };
        });

    if (hlsParsed.isMaster) {
        // Process all alternative renditions defined in EXT-X-MEDIA tags.
        const mediaGroups = hlsParsed.media.reduce((acc, media) => {
            const mediaValue = media.value;
            const groupId = mediaValue['GROUP-ID'];
            const type = mediaValue.TYPE.toLowerCase();
            if (!acc[type]) acc[type] = {};
            if (!acc[type][groupId]) acc[type][groupId] = [];
            acc[type][groupId].push(media);
            return acc;
        }, {});

        Object.entries(mediaGroups).forEach(([type, groups]) => {
            Object.entries(groups).forEach(
                ([groupId, renditions], groupIndex) => {
                    renditions.forEach((media, mediaIndex) => {
                        const mediaValue = media.value;
                        /** @type {'video' | 'audio' | 'text' | 'unknown'} */
                        let contentType = /** @type {any} */ (
                            type === 'subtitles' ? 'text' : type
                        );
                        if (type === 'closed-captions') {
                            contentType = 'text';
                        }

                        /** @type {Representation} */
                        const representation = {
                            id:
                                mediaValue['STABLE-RENDITION-ID'] ||
                                `${type}-rendition-${groupId}-${mediaIndex}-rep`,
                            codecs: { value: null, source: 'manifest' },
                            bandwidth: 0,
                            width: { value: null, source: 'manifest' },
                            height: { value: null, source: 'manifest' },
                            frameRate: null,
                            sar: null,
                            mimeType: null,
                            profiles: null,
                            qualityRanking: null,
                            selectionPriority: 0,
                            codingDependency: null,
                            scanType: null,
                            dependencyId: null,
                            associationId: null,
                            associationType: null,
                            segmentProfiles: null,
                            mediaStreamStructureId: null,
                            maximumSAPPeriod: null,
                            startWithSAP: null,
                            maxPlayoutRate: null,
                            tag: null,
                            eptDelta: null,
                            pdDelta: null,
                            representationIndex: null,
                            failoverContent: null,
                            framePackings: [],
                            ratings: [],
                            viewpoints: [],
                            accessibility: [],
                            labels: [],
                            groupLabels: [],
                            subRepresentations: [],
                            resyncs: [],
                            outputProtection: null,
                            extendedBandwidth: null,
                            stableVariantId: null,
                            pathwayId: null,
                            supplementalCodecs: null,
                            reqVideoLayout: null,
                            contentProtection: [],
                            serializedManifest: {
                                ...mediaValue,
                                resolvedUri: mediaValue.URI
                                    ? new URL(mediaValue.URI, hlsParsed.baseUrl)
                                          .href
                                    : null,
                            },
                            audioSamplingRate: null,
                            audioChannelConfigurations: [],
                        };

                        /** @type {AdaptationSet} */
                        const as = {
                            id:
                                mediaValue['STABLE-RENDITION-ID'] ||
                                `${type}-rendition-${groupId}-${mediaIndex}`,
                            contentType: contentType,
                            lang: mediaValue.LANGUAGE,
                            mimeType: getMimeType(contentType, segmentFormat),
                            segmentAlignment: false,
                            subsegmentAlignment: false,
                            subsegmentStartsWithSAP: null,
                            sar: null,
                            maximumSAPPeriod: null,
                            audioSamplingRate: null,
                            width: null,
                            height: null,
                            representations: [representation],
                            contentProtection: contentProtectionIRs,
                            inbandEventStreams: [],
                            audioChannelConfigurations: [],
                            roles: [],
                            profiles: null,
                            group: null,
                            bitstreamSwitching: null,
                            maxWidth: null,
                            maxHeight: null,
                            maxFrameRate: null,
                            framePackings: [],
                            ratings: [],
                            viewpoints: [],
                            accessibility: [],
                            labels: [],
                            groupLabels: [],
                            contentComponents: [],
                            resyncs: [],
                            outputProtection: null,
                            stableRenditionId:
                                mediaValue['STABLE-RENDITION-ID'] || null,
                            bitDepth: mediaValue['BIT-DEPTH'] || null,
                            sampleRate: mediaValue['SAMPLE-RATE'] || null,
                            channels: String(mediaValue.CHANNELS) || null,
                            assocLanguage: mediaValue['ASSOC-LANGUAGE'] || null,
                            characteristics: mediaValue.CHARACTERISTICS
                                ? String(mediaValue.CHARACTERISTICS).split(',')
                                : null,
                            forced: mediaValue.FORCED === 'YES',
                            serializedManifest: mediaValue,
                        };
                        periodIR.adaptationSets.push(as);
                    });
                }
            );
        });

        const variantsByUri = (hlsParsed.variants || []).reduce(
            (acc, variant) => {
                if (!acc[variant.resolvedUri]) {
                    acc[variant.resolvedUri] = [];
                }
                acc[variant.resolvedUri].push(variant);
                return acc;
            },
            {}
        );

        Object.values(variantsByUri).forEach((variantGroup, groupIndex) => {
            const firstVariant = variantGroup[0];
            const resolution = firstVariant.attributes.RESOLUTION;
            const codecs = (firstVariant.attributes.CODECS || '').toLowerCase();
            const hasVideoCodec =
                codecs.includes('avc1') ||
                codecs.includes('hvc1') ||
                codecs.includes('hev1') ||
                codecs.includes('dvh1');
            const hasAudioCodec =
                codecs.includes('mp4a') ||
                codecs.includes('ac-3') ||
                codecs.includes('ec-3');

            /** @type {'video' | 'audio' | 'unknown'} */
            let contentType = 'video';
            if (!hasVideoCodec && hasAudioCodec) {
                contentType = 'audio';
            }

            /** @type {Representation} */
            const rep = {
                id:
                    firstVariant.attributes['STABLE-VARIANT-ID'] ||
                    `variant-${groupIndex}-rep-0`,
                codecs: {
                    value: firstVariant.attributes.CODECS || null,
                    source: 'manifest',
                },
                bandwidth: firstVariant.attributes.BANDWIDTH,
                width: {
                    value: resolution
                        ? parseInt(String(resolution).split('x')[0], 10)
                        : null,
                    source: 'manifest',
                },
                height: {
                    value: resolution
                        ? parseInt(String(resolution).split('x')[1], 10)
                        : null,
                    source: 'manifest',
                },
                frameRate: firstVariant.attributes['FRAME-RATE'] || null,
                videoRange: firstVariant.attributes['VIDEO-RANGE'] || null,
                supplementalCodecs:
                    firstVariant.attributes['SUPPLEMENTAL-CODECS'] || null,
                reqVideoLayout:
                    firstVariant.attributes['REQ-VIDEO-LAYOUT'] || null,
                pathwayId: firstVariant.attributes['PATHWAY-ID'] || null,
                stableVariantId:
                    firstVariant.attributes['STABLE-VARIANT-ID'] || null,
                sar: null,
                qualityRanking: firstVariant.attributes.SCORE,
                serializedManifest: firstVariant,
                __variantUri: firstVariant.resolvedUri,
                dependencyId: null,
                associationId: null,
                associationType: null,
                mimeType: null,
                profiles: null,
                selectionPriority: 0,
                codingDependency: null,
                scanType: null,
                mediaStreamStructureId: null,
                maximumSAPPeriod: null,
                startWithSAP: null,
                maxPlayoutRate: null,
                tag: null,
                eptDelta: null,
                pdDelta: null,
                representationIndex: null,
                failoverContent: null,
                contentProtection: [],
                audioChannelConfigurations: [],
                framePackings: [],
                ratings: [],
                viewpoints: [],
                accessibility: [],
                labels: [],
                groupLabels: [],
                subRepresentations: [],
                resyncs: [],
                outputProtection: null,
                extendedBandwidth: null,
                audioSamplingRate: null,
                segmentProfiles: null,
            };

            const asIR = {
                id: `variant-group-${groupIndex}`,
                contentType: contentType,
                lang: null,
                mimeType: getMimeType(contentType, segmentFormat),
                representations: [rep],
                contentProtection: contentProtectionIRs,
                serializedManifest: firstVariant,
                segmentAlignment: false,
                subsegmentAlignment: false,
                subsegmentStartsWithSAP: null,
                sar: null,
                maximumSAPPeriod: null,
                audioSamplingRate: null,
                width: rep.width.value,
                height: rep.height.value,
                inbandEventStreams: [],
                audioChannelConfigurations: [],
                roles: [],
                profiles: null,
                group: null,
                bitstreamSwitching: null,
                maxWidth: null,
                maxHeight: null,
                maxFrameRate: null,
                framePackings: [],
                ratings: [],
                viewpoints: [],
                accessibility: [],
                labels: [],
                groupLabels: [],
                contentComponents: [],
                resyncs: [],
                outputProtection: null,
                stableRenditionId: null,
                bitDepth: null,
                sampleRate: null,
                channels: null,
                assocLanguage: null,
                characteristics: null,
                forced: false,
            };
            periodIR.adaptationSets.push(asIR);
        });

        const iFrameTags = hlsParsed.tags.filter(
            (t) => t.name === 'EXT-X-I-FRAME-STREAM-INF'
        );
        if (iFrameTags.length > 0) {
            const iFrameReps = iFrameTags.map((tag) => {
                const resolution = tag.value.RESOLUTION;
                const resolvedUri = new URL(tag.value.URI, hlsParsed.baseUrl)
                    .href;
                /** @type {Representation} */
                const rep = {
                    id: resolvedUri,
                    codecs: {
                        value: tag.value.CODECS || null,
                        source: 'manifest',
                    },
                    bandwidth: tag.value.BANDWIDTH,
                    width: {
                        value: resolution
                            ? parseInt(String(resolution).split('x')[0], 10)
                            : null,
                        source: 'manifest',
                    },
                    height: {
                        value: resolution
                            ? parseInt(String(resolution).split('x')[1], 10)
                            : null,
                        source: 'manifest',
                    },
                    videoRange: tag.value['VIDEO-RANGE'] || null,
                    serializedManifest: { ...tag.value, resolvedUri },
                    __variantUri: resolvedUri,
                    dependencyId: null,
                    associationId: null,
                    associationType: null,
                    mimeType: null,
                    profiles: null,
                    qualityRanking: null,
                    selectionPriority: 0,
                    codingDependency: null,
                    scanType: null,
                    mediaStreamStructureId: null,
                    maximumSAPPeriod: null,
                    startWithSAP: null,
                    maxPlayoutRate: null,
                    tag: null,
                    eptDelta: null,
                    pdDelta: null,
                    representationIndex: null,
                    failoverContent: null,
                    contentProtection: [],
                    audioChannelConfigurations: [],
                    framePackings: [],
                    ratings: [],
                    viewpoints: [],
                    accessibility: [],
                    labels: [],
                    groupLabels: [],
                    subRepresentations: [],
                    resyncs: [],
                    outputProtection: null,
                    extendedBandwidth: null,
                    audioSamplingRate: null,
                    frameRate: null,
                    sar: null,
                    stableVariantId: null,
                    pathwayId: null,
                    supplementalCodecs: null,
                    reqVideoLayout: null,
                    segmentProfiles: null,
                };
                return rep;
            });

            const asIR = {
                id: 'iframe-set-0',
                contentType: 'video',
                roles: [
                    {
                        id: null,
                        schemeIdUri: 'urn:mpeg:dash:role:2011',
                        value: 'trick',
                    },
                ],
                representations: iFrameReps,
                contentProtection: contentProtectionIRs,
                serializedManifest: { attributes: { ID: 'iframe-set-0' } },
                lang: null,
                mimeType: getMimeType('video', segmentFormat),
                segmentAlignment: false,
                subsegmentAlignment: false,
                subsegmentStartsWithSAP: null,
                sar: null,
                maximumSAPPeriod: null,
                audioSamplingRate: null,
                width: null,
                height: null,
                inbandEventStreams: [],
                audioChannelConfigurations: [],
                profiles: null,
                group: null,
                bitstreamSwitching: null,
                maxWidth: null,
                maxHeight: null,
                maxFrameRate: null,
                framePackings: [],
                ratings: [],
                viewpoints: [],
                accessibility: [],
                labels: [],
                groupLabels: [],
                contentComponents: [],
                resyncs: [],
                outputProtection: null,
                stableRenditionId: null,
                bitDepth: null,
                sampleRate: null,
                channels: null,
                assocLanguage: null,
                characteristics: null,
                forced: false,
            };
            periodIR.adaptationSets.push(asIR);
        }
    } else {
        // Handle a simple Media Playlist
        const firstSegmentUri = (
            hlsParsed.segments[0]?.uri || ''
        ).toLowerCase();
        let { contentType, codec } =
            inferMediaInfoFromExtension(firstSegmentUri);

        // If inference returns 'unknown', default to 'video' for getMimeType compatibility.
        if (contentType === 'unknown') {
            contentType = 'video';
        }

        /** @type {AdaptationSet} */
        const asIR = {
            id: 'media-0',
            contentType: contentType,
            lang: null,
            mimeType: getMimeType(contentType, segmentFormat),
            segmentAlignment: false,
            subsegmentAlignment: false,
            subsegmentStartsWithSAP: null,
            sar: null,
            maximumSAPPeriod: null,
            audioSamplingRate: null,
            width: null,
            height: null,
            representations: [
                {
                    id: 'media-0-rep-0',
                    codecs: { value: codec, source: 'manifest' }, // Inferred codec
                    bandwidth: 0,
                    width: { value: null, source: 'manifest' },
                    height: { value: null, source: 'manifest' },
                    mimeType: null,
                    profiles: null,
                    qualityRanking: null,
                    selectionPriority: null,
                    codingDependency: null,
                    scanType: null,
                    associationId: null,
                    associationType: null,
                    segmentProfiles: null,
                    mediaStreamStructureId: null,
                    maximumSAPPeriod: null,
                    startWithSAP: null,
                    maxPlayoutRate: null,
                    tag: null,
                    eptDelta: null,
                    pdDelta: null,
                    representationIndex: null,
                    failoverContent: null,
                    contentProtection: contentProtectionIRs,
                    framePackings: [],
                    ratings: [],
                    viewpoints: [],
                    accessibility: [],
                    labels: [],
                    groupLabels: [],
                    videoRange: undefined,
                    subRepresentations: [],
                    resyncs: [],
                    outputProtection: null,
                    extendedBandwidth: null,
                    dependencyId: null,
                    frameRate: null,
                    sar: null,
                    stableVariantId: null,
                    pathwayId: null,
                    supplementalCodecs: null,
                    reqVideoLayout: null,
                    serializedManifest: hlsParsed,
                    audioSamplingRate: null,
                    audioChannelConfigurations: [],
                },
            ],
            contentProtection: contentProtectionIRs,
            inbandEventStreams: [],
            audioChannelConfigurations: [],
            roles: [],
            profiles: null,
            group: null,
            bitstreamSwitching: null,
            maxWidth: null,
            maxHeight: null,
            maxFrameRate: null,
            framePackings: [],
            ratings: [],
            viewpoints: [],
            accessibility: [],
            labels: [],
            groupLabels: [],
            contentComponents: [],
            resyncs: [],
            outputProtection: null,
            stableRenditionId: null,
            bitDepth: null,
            sampleRate: null,
            channels: null,
            assocLanguage: null,
            characteristics: null,
            forced: false,
            serializedManifest: hlsParsed,
        };
        periodIR.adaptationSets.push(asIR);
    }

    manifestIR.periods.push(periodIR);
    periodIR.adaptationSets.sort(sortAdaptationSets);

    return manifestIR;
}
