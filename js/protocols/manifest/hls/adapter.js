/**
 * @typedef {import('../../../core/store.js').Manifest} Manifest
 * @typedef {import('../../../core/store.js').Period} Period
 * @typedef {import('../../../core/store.js').AdaptationSet} AdaptationSet
 * @typedef {import('../../../core/store.js').Representation} Representation
 */

import { generateHlsSummary } from '../../../ui/views/summary/hls-summary.js';

/**
 * Transforms a parsed HLS manifest object into a protocol-agnostic Intermediate Representation (IR).
 * @param {object} hlsParsed - The parsed HLS manifest data from the parser.
 * @returns {Manifest} The manifest IR object.
 */
export function adaptHlsToIr(hlsParsed) {
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
        segmentFormat: hlsParsed.map ? 'isobmff' : 'ts',
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
            manifestIR.events.push({
                startTime: pdtMap.get(closestPdt) + timeOffset,
                duration: duration,
                message: isInterstitial
                    ? `Interstitial: ${range.value['ID'] || 'N/A'}`
                    : `Date Range: ${range.value['ID'] || 'N/A'}`,
                messageData: isInterstitial ? range.value : null,
                type: 'hls-daterange',
            });
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
    };

    if (hlsParsed.isMaster) {
        // First, process all alternative renditions defined in EXT-X-MEDIA tags.
        // This ensures they are created only once.
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
                        const contentType =
                            type === 'subtitles' ? 'text' : type;
                        /** @type {AdaptationSet} */
                        const as = {
                            id:
                                media['STABLE-RENDITION-ID'] ||
                                `${type}-rendition-${groupId}-${mediaIndex}`,
                            contentType: contentType,
                            lang: media.LANGUAGE,
                            mimeType:
                                contentType === 'text'
                                    ? 'text/vtt'
                                    : 'video/mp2t',
                            representations: [], // Representations for these are in their own playlists
                            contentProtection: [],
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
                            serializedManifest: media,
                        };
                        periodIR.adaptationSets.push(as);
                    });
                }
            );
        });

        // Second, process all variant streams from EXT-X-STREAM-INF tags.
        hlsParsed.variants.forEach((variant, index) => {
            const codecs = variant.attributes.CODECS || '';
            const hasVideoCodec =
                codecs.includes('avc1') ||
                codecs.includes('hev1') ||
                codecs.includes('hvc1');
            const hasResolution = !!variant.attributes.RESOLUTION;
            const hasVideo = hasVideoCodec || hasResolution;

            const hasMuxedAudio =
                codecs.includes('mp4a') && !variant.attributes.AUDIO;

            if (hasVideo) {
                const resolution = variant.attributes.RESOLUTION;
                /** @type {Representation} */
                const rep = {
                    id:
                        variant.attributes['STABLE-VARIANT-ID'] ||
                        `video-variant-${index}-rep-0`,
                    codecs,
                    bandwidth: variant.attributes.BANDWIDTH,
                    width: resolution
                        ? parseInt(String(resolution).split('x')[0], 10)
                        : null,
                    height: resolution
                        ? parseInt(String(resolution).split('x')[1], 10)
                        : null,
                    frameRate: variant.attributes['FRAME-RATE'] || null,
                    sar: null,
                    qualityRanking: variant.attributes.SCORE,
                    videoRange: variant.attributes['VIDEO-RANGE'],
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
                    dependencyId: null,
                    serializedManifest: variant,
                };

                /** @type {AdaptationSet} */
                const asIR = {
                    id: `video-variant-${index}`,
                    contentType: 'video',
                    lang: null,
                    mimeType: 'video/mp2t',
                    representations: [rep],
                    contentProtection: [],
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
                    serializedManifest: variant,
                };
                periodIR.adaptationSets.push(asIR);
            }

            // Create an AdaptationSet for muxed audio if present and not externally grouped.
            if (hasMuxedAudio) {
                /** @type {AdaptationSet} */
                const asIR = {
                    id: `audio-muxed-${index}`,
                    contentType: 'audio',
                    lang: null,
                    mimeType: 'audio/mp4',
                    representations: [
                        {
                            id: `audio-muxed-${index}-rep-0`,
                            codecs: codecs
                                .split(',')
                                .find((c) => c.startsWith('mp4a')),
                            bandwidth: variant.attributes.BANDWIDTH,
                            width: null,
                            height: null,
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
                            dependencyId: null,
                            frameRate: null,
                            sar: null,
                            serializedManifest: variant,
                        },
                    ],
                    contentProtection: [],
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
                    serializedManifest: variant,
                };
                periodIR.adaptationSets.push(asIR);
            }
        });
    } else {
        // Handle a simple Media Playlist
        /** @type {AdaptationSet} */
        const asIR = {
            id: 'media-0',
            contentType: 'video', // Assume video/muxed if not master
            lang: null,
            mimeType: hlsParsed.map ? 'video/mp4' : 'video/mp2t',
            representations: [
                {
                    id: 'media-0-rep-0',
                    codecs: null,
                    bandwidth: 0,
                    width: null,
                    height: null,
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
                    dependencyId: null,
                    frameRate: null,
                    sar: null,
                    serializedManifest: hlsParsed,
                },
            ],
            contentProtection: [],
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
            serializedManifest: hlsParsed,
        };
        const keyTag = hlsParsed.segments.find((s) => s.key)?.key;
        if (keyTag && keyTag.METHOD !== 'NONE') {
            asIR.contentProtection.push({
                schemeIdUri: keyTag.KEYFORMAT || 'identity',
                system: keyTag.METHOD,
                defaultKid: null,
            });
        }
        periodIR.adaptationSets.push(asIR);
    }

    manifestIR.periods.push(periodIR);
    manifestIR.summary = generateHlsSummary(manifestIR);

    return manifestIR;
}
