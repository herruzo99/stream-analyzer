/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').Period} Period
 * @typedef {import('@/types.ts').AdaptationSet} AdaptationSet
 * @typedef {import('@/types.ts').Representation} Representation
 */

import { generateHlsSummary } from './summary-generator.js';
import { parseScte35 } from '@/infrastructure/parsing/scte35/parser';
import { getDrmSystemName } from '../utils/drm.js';
import { inferMediaInfoFromExtension } from '../utils/media-types.js';

/**
 * Determines the segment format for an HLS manifest using reliable heuristics.
 * @param {object} hlsParsed - The parsed HLS manifest data from the parser.
 * @returns {'isobmff' | 'ts'}
 */
function determineSegmentFormat(hlsParsed) {
    // 1. Definitive check: If EXT-X-MAP is present, it's fMP4 (ISOBMFF).
    if (hlsParsed.map) {
        return 'isobmff';
    }

    // 2. Heuristic for Media Playlists: Check the extension of the first segment.
    const firstSegmentUri = hlsParsed.segments?.[0]?.uri;
    if (firstSegmentUri) {
        const lowerUri = firstSegmentUri.toLowerCase();
        if (lowerUri.endsWith('.ts')) {
            return 'ts';
        }
        if (
            lowerUri.endsWith('.m4s') ||
            lowerUri.endsWith('.mp4') ||
            lowerUri.includes('cmf')
        ) {
            return 'isobmff';
        }
    }
    
    // 3. Fallback: If it's a master playlist with no clear indicators, or a media
    //    playlist with ambiguous segment names, default to 'ts' as it was the
    //    original and is still the most common HLS container format.
    return 'ts';
}


/**
 * Returns the correct MIME type based on content and segment format.
 * @param {'video' | 'audio' | 'text'} contentType
 * @param {'isobmff' | 'ts'} segmentFormat
 * @returns {string} The corresponding MIME type.
 */
function getMimeType(contentType, segmentFormat) {
    if (contentType === 'text') {
        return 'text/vtt';
    }
    if (segmentFormat === 'isobmff') {
        return `${contentType}/mp4`;
    }
    return `${contentType}/mp2t`;
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
            const groupId = media['GROUP-ID'];
            const type = media.TYPE.toLowerCase();
            if (!acc[type]) acc[type] = {};
            if (!acc[type][groupId]) acc[type][groupId] = [];
            acc[type][groupId].push(media);
            return acc;
        }, {});

        Object.entries(mediaGroups).forEach(([type, groups]) => {
            Object.entries(groups).forEach(
                ([groupId, renditions], groupIndex) => {
                    renditions.forEach((media, mediaIndex) => {
                        /** @type {'video' | 'audio' | 'text'} */
                        const contentType = /** @type {any} */ (
                            type === 'subtitles' ? 'text' : type
                        );
                        /** @type {AdaptationSet} */
                        const as = {
                            id:
                                media['STABLE-RENDITION-ID'] ||
                                `${type}-rendition-${groupId}-${mediaIndex}`,
                            contentType: contentType,
                            lang: media.LANGUAGE,
                            mimeType: getMimeType(contentType, segmentFormat),
                            segmentAlignment: false,
                            width: null,
                            height: null,
                            representations: [],
                            contentProtection: contentProtectionIRs,
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
                                media['STABLE-RENDITION-ID'] || null,
                            bitDepth: media['BIT-DEPTH'] || null,
                            sampleRate: media['SAMPLE-RATE'] || null,
                            channels: media.CHANNELS || null,
                            assocLanguage: media['ASSOC-LANGUAGE'] || null,
                            characteristics: media.CHARACTERISTICS
                                ? String(media.CHARACTERISTICS).split(',')
                                : null,
                            forced: media.FORCED === 'YES',
                            serializedManifest: media,
                        };
                        periodIR.adaptationSets.push(as);
                    });
                }
            );
        });

        // Process all variant streams from EXT-X-STREAM-INF tags.
        hlsParsed.variants.forEach((variant, index) => {
            const resolution = variant.attributes.RESOLUTION;
            const codecs = (variant.attributes.CODECS || '').toLowerCase();
            const hasVideoCodec =
                codecs.includes('avc1') ||
                codecs.includes('hvc1') ||
                codecs.includes('hev1');
            const hasAudioCodec = codecs.includes('mp4a');

            let contentType = 'video'; // Default for muxed or video-only
            if (!hasVideoCodec && hasAudioCodec) {
                contentType = 'audio';
            }

            /** @type {Representation} */
            const rep = {
                id:
                    variant.attributes['STABLE-VARIANT-ID'] ||
                    `variant-${index}-rep-0`,
                codecs: {
                    value: variant.attributes.CODECS || null,
                    source: 'manifest',
                },
                bandwidth: variant.attributes.BANDWIDTH,
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
                frameRate: variant.attributes['FRAME-RATE'] || null,
                videoRange: variant.attributes['VIDEO-RANGE'] || null,
                supplementalCodecs:
                    variant.attributes['SUPPLEMENTAL-CODECS'] || null,
                reqVideoLayout: variant.attributes['REQ-VIDEO-LAYOUT'] || null,
                pathwayId: variant.attributes['PATHWAY-ID'] || null,
                stableVariantId:
                    variant.attributes['STABLE-VARIANT-ID'] || null,
                sar: null,
                qualityRanking: variant.attributes.SCORE,
                mimeType: null,
                profiles: null,
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
                dependencyId: null,
                serializedManifest: variant,
                // @ts-ignore - internal property for enrichment
                __variantUri: variant.resolvedUri,
            };

            /** @type {AdaptationSet} */
            const asIR = {
                id: `variant-${index}`,
                contentType: /** @type {'video' | 'audio'} */ (contentType),
                lang: null,
                mimeType: getMimeType(
                    /** @type {'video' | 'audio'} */ (contentType),
                    segmentFormat
                ),
                segmentAlignment: false,
                width: rep.width.value,
                height: rep.height.value,
                representations: [rep],
                contentProtection: contentProtectionIRs,
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
                serializedManifest: variant,
            };
            periodIR.adaptationSets.push(asIR);
        });
    } else {
        // Handle a simple Media Playlist
        const firstSegmentUri = (hlsParsed.segments[0]?.uri || '').toLowerCase();
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
                    audioChannelConfigurations: [],
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
                },
            ],
            contentProtection: contentProtectionIRs,
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
    manifestIR.summary = await generateHlsSummary(manifestIR, context);

    return manifestIR;
}