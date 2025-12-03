/**
 * @typedef {import('@/types.ts').Manifest} Manifest
 * @typedef {import('@/types.ts').Period} Period
 * @typedef {import('@/types.ts').AdaptationSet} AdaptationSet
 * @typedef {import('@/types.ts').Representation} Representation
 * @typedef {import('@/types.ts').SubRepresentation} SubRepresentation
 * @typedef {import('@/types.ts').Descriptor} Descriptor
 * @typedef {import('@/types.ts').ContentComponent} ContentComponent
 * @typedef {import('@/types.ts').Resync} Resync
 * @typedef {import('@/types.ts').Preselection} Preselection
 * @typedef {import('@/types.ts').FailoverContent} FailoverContent
 * @typedef {import('@/types.ts').OutputProtection} OutputProtection
 * @typedef {import('@/types.ts').ExtendedBandwidth} ExtendedBandwidth
 * @typedef {import('@/types.ts').ServiceDescription} ServiceDescription
 * @typedef {import('@/types.ts').InitializationSet} InitializationSet
 */

import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import { parseScte35 } from '../scte35/parser.js';
import {
    determineSegmentFormat,
    inferMediaInfoFromExtension,
} from '../utils/media-types.js';

import { isCodecSupported } from '../utils/codec-support.js';

const isVideoCodec = (codecString) => {
    if (!codecString) return false;
    const lowerCodec = codecString.toLowerCase();
    const videoPrefixes = [
        'avc1',
        'avc3',
        'hvc1',
        'hev1',
        'mp4v',
        'dvh1',
        'dvhe',
        'av01',
        'vp09',
    ];
    return videoPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
};

const isAudioCodec = (codecString) => {
    if (!codecString) return false;
    const lowerCodec = codecString.toLowerCase();
    const audioPrefixes = ['mp4a', 'ac-3', 'ec-3', 'opus', 'flac'];
    return audioPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
};

// --- Sorter Functions ---
function sortVideoRepresentations(a, b) {
    const heightA = a.height?.value || 0;
    const heightB = b.height?.value || 0;
    if (heightA !== heightB) {
        return heightB - heightA; // Descending height
    }

    const widthA = a.width?.value || 0;
    const widthB = b.width?.value || 0;
    if (widthA !== widthB) {
        return widthB - widthA; // Descending width
    }

    return (b.bandwidth || 0) - (a.bandwidth || 0); // Descending bandwidth
}

function sortAudioRepresentations(a, b) {
    return (b.bandwidth || 0) - (a.bandwidth || 0); // Descending bandwidth
}

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
 * Transforms a parsed HLS manifest object into a protocol-agnostic Intermediate Representation (IR).
 * This version correctly models discontinuities as distinct Periods.
 * @param {object} hlsParsed - The parsed HLS manifest data from the parser.
 * @param {object} [context] - Context for enrichment.
 * @returns {Promise<Manifest>} The manifest IR object.
 */
export async function adaptHlsToIr(hlsParsed, context) {
    const segmentFormat = determineSegmentFormat(hlsParsed);

    // FIX: HLS manifest durations (EXTINF) are always in seconds.
    // While internal TS packets might use 90kHz, the manifest layer operates on seconds.
    // We force timescale to 1 to avoid confusion and massive integer inflation in the UI.
    const timescale = 1;

    // Total duration is simple sum of EXTINF (which are already seconds)
    const totalDuration = (hlsParsed.segments || []).reduce(
        (sum, seg) => sum + seg.duration,
        0
    );

    const manifestIR = /** @type {Manifest} */ ({
        id: null,
        type: hlsParsed.isLive ? 'dynamic' : 'static',
        profiles: `HLS v${hlsParsed.version}`,
        minBufferTime: hlsParsed.targetDuration || null,
        duration: totalDuration,
        segmentFormat: segmentFormat,
        periods: [],
        events: [],
        adAvails: [],
        serializedManifest: hlsParsed,
        // Other top-level fields
        publishTime: null,
        availabilityStartTime: null,
        timeShiftBufferDepth: null,
        minimumUpdatePeriod: hlsParsed.isLive ? hlsParsed.targetDuration : null,
        maxSegmentDuration: null,
        maxSubsegmentDuration: null,
        programInformations: [],
        metrics: [],
        locations: [],
        patchLocations: [],
        serviceDescriptions: [],
        initializationSets: [],
        summary: null,
        serverControl: hlsParsed.serverControl || null,
        tags: hlsParsed.tags || [],
        isMaster: hlsParsed.isMaster,
        variants: hlsParsed.variants || [],
        segments: hlsParsed.segments || [],
        preloadHints: hlsParsed.preloadHints || [],
        renditionReports: hlsParsed.renditionReports || [],
        partInf: hlsParsed.partInf || null,
        mediaSequence: hlsParsed.mediaSequence,
    });

    // --- NEW: Parse CUE tags into events ---
    let cumulativeTimeForCues = 0;
    for (const seg of hlsParsed.segments || []) {
        if (seg.cue) {
            const event = {
                startTime: cumulativeTimeForCues,
                duration: seg.cue.duration || 0,
                message: `Cue ${seg.cue.type}`,
                messageData: seg.cue,
                type: 'hls-cue',
                cue: seg.cue,
            };
            manifestIR.events.push(event);
        }
        cumulativeTimeForCues += seg.duration;
    }
    // --- END NEW ---

    // Parse Date Ranges into standard Event objects
    const dateRanges = hlsParsed.tags.filter(
        (t) => t.name === 'EXT-X-DATERANGE'
    );
    let cumulativeTime = 0;
    const pdtMap = new Map();
    for (const seg of hlsParsed.segments || []) {
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

    let periodStart = 0;
    let previousPeriodHadEncryption = false;

    // --- CORE REFACTOR: Process Segment Groups into Periods ---
    for (let i = 0; i < (hlsParsed.segmentGroups || []).length; i++) {
        const segmentGroup = hlsParsed.segmentGroups[i];
        if (segmentGroup.length === 0) continue;

        const periodDurationInTsUnits = segmentGroup.reduce(
            (sum, seg) => sum + seg.duration,
            0
        );
        const periodDuration = periodDurationInTsUnits / timescale;

        // --- Ad Period Detection Heuristic ---
        const firstSegment = segmentGroup[0];
        const hasEncryption = !!firstSegment.encryptionInfo;
        const isAdPeriod =
            (i > 0 && hasEncryption !== previousPeriodHadEncryption) ||
            firstSegment.discontinuity;
        previousPeriodHadEncryption = hasEncryption;

        // --- FIX: Create a compliant synthetic AdaptationSet for media playlists ---
        const adaptationSets = [];
        if (!hlsParsed.isMaster) {
            const { contentType, codec } = inferMediaInfoFromExtension(
                segmentGroup[0].uri
            );
            const rep = /** @type {Representation} */ ({
                id: `media-rep-0`,
                codecs: [
                    {
                        value: codec,
                        source: 'manifest',
                        supported: isCodecSupported(codec),
                    },
                ],
                bandwidth: 0,
                width: { value: null, source: 'manifest' },
                height: { value: null, source: 'manifest' },
                roles: [],
                serializedManifest: {},
            });
            const as = /** @type {AdaptationSet} */ ({
                id: `media-as-0`,
                contentType: contentType,
                roles: [],
                representations: [rep],
                lang: null,
                mimeType: null,
                profiles: null,
                group: null,
                bitstreamSwitching: null,
                segmentAlignment: false,
                subsegmentAlignment: false,
                subsegmentStartsWithSAP: null,
                width: null,
                height: null,
                maxWidth: null,
                maxHeight: null,
                maxFrameRate: null,
                sar: null,
                maximumSAPPeriod: null,
                audioSamplingRate: null,
                contentProtection: [],
                audioChannelConfigurations: [],
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
                inbandEventStreams: [],
                serializedManifest: { isSynthetic: true },
            });
            adaptationSets.push(as);
        }
        // --- END FIX ---

        const periodIR = /** @type {Period} */ ({
            id: `hls-period-${i}`,
            start: periodStart,
            duration: periodDuration,
            adaptationSets,
            events: [],
            adAvails: [],
            serializedManifest: hlsParsed,
            bitstreamSwitching: null,
            assetIdentifier: null,
            subsets: [],
            preselections: [],
            serviceDescriptions: [],
            eventStreams: [],
            supplementalProperties: [],
        });

        if (isAdPeriod) {
            const adAvail = {
                id: `ad-break-${i}`,
                startTime: periodStart,
                duration: periodDuration,
                scte35Signal: {
                    error: 'Structurally detected ad break (Discontinuity)',
                },
                adManifestUrl: null,
                creatives: [],
                detectionMethod: /** @type {const} */ (
                    'STRUCTURAL_DISCONTINUITY'
                ),
            };
            periodIR.adAvails.push(adAvail);
            manifestIR.adAvails.push(adAvail);
        }

        manifestIR.periods.push(periodIR);
        periodStart += periodDuration;
    }

    // Adapt master playlist structure if it exists
    if (hlsParsed.isMaster) {
        manifestIR.periods = [
            {
                id: 'hls-period-0',
                start: 0,
                duration: null,
                adaptationSets: [],
                events: [],
                adAvails: [],
                serializedManifest: hlsParsed,
                bitstreamSwitching: null,
                assetIdentifier: null,
                subsets: [],
                preselections: [],
                serviceDescriptions: [],
                eventStreams: [],
                supplementalProperties: [],
            },
        ];
        const period = manifestIR.periods[0];

        const asGroups = new Map();

        (hlsParsed.variants || []).forEach((variant, i) => {
            const codecs = (variant.attributes.CODECS || '').toLowerCase();
            const containsVideo =
                codecs.includes('avc') ||
                codecs.includes('hvc') ||
                codecs.includes('mp4v') ||
                codecs.includes('av01');
            const containsAudio =
                codecs.includes('mp4a') ||
                codecs.includes('ac-3') ||
                codecs.includes('ec-3');

            let contentType = 'video';
            if (!containsVideo && containsAudio) {
                contentType = 'audio';
            }

            const groupId =
                contentType === 'video' ? 'video-main' : 'audio-only-variants';

            if (!asGroups.has(groupId)) {
                asGroups.set(groupId, {
                    id: groupId,
                    contentType: contentType,
                    roles: [],
                    representations: [],
                    serializedManifest: {
                        isSynthetic: true,
                        groupId: groupId,
                        contentType: contentType,
                    },
                });
            }

            let width = null,
                height = null;
            if (typeof variant.attributes.RESOLUTION === 'string') {
                [width, height] =
                    variant.attributes.RESOLUTION.split('x').map(Number);
            }

            const allCodecs = (variant.attributes.CODECS || '')
                .split(',')
                .map((c) => c.trim())
                .filter(Boolean);
            const videoCodecs = allCodecs.filter(isVideoCodec);
            const audioCodecs = allCodecs.filter(isAudioCodec);

            const representation = {
                id: variant.stableId,
                bandwidth: variant.attributes.BANDWIDTH,
                codecs: videoCodecs.map((c) => ({
                    value: c,
                    source: 'manifest',
                    supported: isCodecSupported(c),
                })),
                muxedAudio: {
                    codecs: audioCodecs.map((c) => ({
                        value: c,
                        source: 'manifest',
                        supported: isCodecSupported(c),
                    })),
                    channels: null,
                    lang: 'und',
                },
                frameRate: variant.attributes['FRAME-RATE'],
                videoRange: variant.attributes['VIDEO-RANGE'],
                stableVariantId: variant.attributes['STABLE-VARIANT-ID'],
                pathwayId: variant.attributes['PATHWAY-ID'],
                supplementalCodecs: variant.attributes['SUPPLEMENTAL-CODECS'],
                reqVideoLayout: variant.attributes['REQ-VIDEO-LAYOUT'],
                serializedManifest: variant,
                width: { value: width || null, source: 'manifest' },
                height: { value: height || null, source: 'manifest' },
                __variantUri: variant.resolvedUri,
                roles: [],
            };

            asGroups.get(groupId).representations.push(representation);
        });

        // Process I-Frame streams as trick-play video AdaptationSets
        (hlsParsed.iframeStreams || []).forEach((iframe, i) => {
            const groupId = `iframe-group-${i}`;
            let width = null,
                height = null;
            if (typeof iframe.value.RESOLUTION === 'string') {
                [width, height] =
                    iframe.value.RESOLUTION.split('x').map(Number);
            }

            asGroups.set(groupId, {
                id: groupId,
                contentType: 'video',
                roles: [{ value: 'trick', schemeIdUri: '' }],
                representations: [
                    {
                        id: `iframe-${i}`,
                        bandwidth: iframe.value.BANDWIDTH,
                        width: { value: width || null, source: 'manifest' },
                        height: { value: height || null, source: 'manifest' },
                        codecs: [
                            {
                                value: iframe.value.CODECS,
                                source: 'manifest',
                                supported: isCodecSupported(
                                    iframe.value.CODECS
                                ),
                            },
                        ],
                        frameRate: iframe.value['FRAME-RATE'],
                        videoRange: iframe.value['VIDEO-RANGE'],
                        serializedManifest: iframe,
                        __variantUri: iframe.resolvedUri,
                        roles: [],
                    },
                ],
                serializedManifest: { ...iframe, isSynthetic: true },
            });
        });

        // --- ARCHITECTURAL REFACTOR: Correctly group EXT-X-MEDIA tags ---
        const mediaGroups = (hlsParsed.media || []).reduce((acc, mediaTag) => {
            const groupId = mediaTag.value['GROUP-ID'];
            const type = mediaTag.value.TYPE?.toLowerCase();
            if (!groupId || !type) return acc;

            const key = `${type}-${groupId}`;
            if (!acc[key]) {
                acc[key] = {
                    type,
                    groupId,
                    tags: [],
                };
            }
            acc[key].tags.push(mediaTag);
            return acc;
        }, {});

        Object.values(mediaGroups).forEach((group) => {
            const { type, groupId, tags } = group;

            const representations = tags.map((tag, index) => {
                const associatedVariant = (hlsParsed.variants || []).find(
                    (v) =>
                        v.attributes.AUDIO === groupId ||
                        v.attributes.SUBTITLES === groupId
                );

                let codecs = [
                    { value: 'unknown', source: 'manifest', supported: false },
                ];
                if (associatedVariant && associatedVariant.attributes.CODECS) {
                    const allCodecs = associatedVariant.attributes.CODECS.split(
                        ','
                    ).map((c) => c.trim());
                    const relevantCodecs =
                        type === 'audio'
                            ? allCodecs.filter(isAudioCodec)
                            : allCodecs.filter(
                                  (c) => !isVideoCodec(c) && !isAudioCodec(c)
                              );

                    if (relevantCodecs.length > 0) {
                        codecs = relevantCodecs.map((c) => ({
                            value: c,
                            source: 'manifest',
                            supported: isCodecSupported(c),
                        }));
                    }
                }

                return {
                    id: tag.value.NAME || `${groupId}-rendition-${index}`,
                    lang: tag.value.LANGUAGE,
                    codecs: codecs,
                    bandwidth: 0,
                    serializedManifest: tag,
                    __variantUri: tag.resolvedUri,
                    roles: [],
                };
            });

            const firstTag = tags[0];
            const adaptationSet = {
                id: `${type}-${groupId}`,
                contentType: type,
                lang: firstTag.value.LANGUAGE,
                roles: [],
                forced: tags.some((t) => t.value.FORCED === 'YES'),
                representations: representations,
                serializedManifest: {
                    isSynthetic: true,
                    tags: tags,
                },
            };
            asGroups.set(adaptationSet.id, adaptationSet);
        });
        // --- END REFACTOR ---

        for (const as of asGroups.values()) {
            if (as.contentType === 'video') {
                as.representations.sort(sortVideoRepresentations);
            } else if (as.contentType === 'audio') {
                as.representations.sort(sortAudioRepresentations);
            }
        }

        period.adaptationSets = Array.from(asGroups.values());
        period.adaptationSets.sort(sortAdaptationSets);

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
        manifestIR.contentProtections = contentProtectionIRs;
    }

    return manifestIR;
}
