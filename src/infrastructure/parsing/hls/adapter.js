/**
 * @typedef {import('@/types').Manifest} Manifest
 * @typedef {import('@/types').Period} Period
 * @typedef {import('@/types').AdaptationSet} AdaptationSet
 * @typedef {import('@/types').Representation} Representation
 * @typedef {import('@/types').SubRepresentation} SubRepresentation
 * @typedef {import('@/types').Descriptor} Descriptor
 * @typedef {import('@/types').ContentComponent} ContentComponent
 * @typedef {import('@/types').Resync} Resync
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


/**
 * Infers a user-friendly format name for HLS text/subtitle tracks.
 * @param {object} mediaTagValue - The attributes from an EXT-X-MEDIA tag.
 * @returns {string} The format name.
 */
function inferHlsTextFormat(mediaTagValue) {
    if (mediaTagValue.TYPE !== 'SUBTITLES' && mediaTagValue.TYPE !== 'CLOSED-CAPTIONS') {
        return 'Unknown';
    }

    if (mediaTagValue.TYPE === 'CLOSED-CAPTIONS' && mediaTagValue['INSTREAM-ID']) {
        if (mediaTagValue['INSTREAM-ID'].startsWith('CC')) return 'CEA-608';
        if (mediaTagValue['INSTREAM-ID'].startsWith('SERVICE')) return 'CEA-708';
    }

    // For SUBTITLES, the default and most common format is WebVTT.
    // The URI can provide a hint.
    if (mediaTagValue.URI && mediaTagValue.URI.toLowerCase().endsWith('.vtt')) {
        return 'WebVTT';
    }

    // TTML in fMP4 is signaled by codecs, which would be on the variant, not here.
    // But if we see TTML in the URI, it's a strong hint.
    if (mediaTagValue.URI && (mediaTagValue.URI.toLowerCase().endsWith('.ttml') || mediaTagValue.URI.toLowerCase().endsWith('.xml'))) {
        return 'TTML';
    }

    // Default for SUBTITLES is WebVTT
    return 'WebVTT';
}

/**
 * Infers a user-friendly format name for HLS audio tracks.
 * @param {string[]} codecs - Array of codec strings from the associated variant.
 * @returns {string} The format name.
 */
function inferHlsAudioFormat(codecs) {
    if (!codecs || codecs.length === 0) return 'Unknown';
    const primaryCodec = codecs[0].toLowerCase();

    if (primaryCodec.startsWith('mp4a')) return 'AAC';
    if (primaryCodec.startsWith('ac-3')) return 'AC-3';
    if (primaryCodec.startsWith('ec-3')) return 'E-AC-3';

    return primaryCodec.toUpperCase();
}

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
 * @returns {Promise<import('@/types').Manifest>} The manifest IR object.
 */
export async function adaptHlsToIr(hlsParsed, context) {
    const segmentFormat = determineSegmentFormat(hlsParsed);

    // FIX: HLS manifest durations (EXTINF) are always in seconds.
    const timescale = 1;

    // Total duration is simple sum of EXTINF
    const totalDuration = (hlsParsed.segments || []).reduce(
        (sum, seg) => sum + seg.duration,
        0
    );

    const manifestIR = /** @type {import('@/types').Manifest} */ ({
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
        availabilityEndTime: null,
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
        media: hlsParsed.media || [],
    });

    // --- CUE TAG PROCESSING for AD AVAILS (Unified Logic) ---
    const foundAvails = new Map();
    let cumulativeTimeForCues = 0;
    const baseSequence = hlsParsed.mediaSequence || 0;
    let lastActiveAvail = null;

    hlsParsed.segments?.forEach((seg, index) => {
        // Create an Event entry for visibility in the Event Log
        if (seg.cue) {
            const event = {
                startTime: cumulativeTimeForCues,
                duration: seg.cue.duration || 0,
                message: `Cue ${seg.cue.type}`,
                messageData: JSON.stringify(seg.cue),
                type: 'hls-cue',
                cue: seg.cue,
            };
            manifestIR.events.push(event);

            // EXT-X-CUE-OUT (Start of Break)
            if (seg.cue.type === 'out') {
                const duration = seg.cue.duration || 0;
                const start = cumulativeTimeForCues;
                // Use a stable sequence-based ID for the break
                const availId = `break-${baseSequence + index}`;

                const avail = {
                    id: availId,
                    startTime: start,
                    duration: duration,
                    scte35Signal: { error: 'Signaled via EXT-X-CUE-OUT' },
                    adManifestUrl: null,
                    creatives: [],
                    detectionMethod: 'SCTE35_INBAND'
                };
                foundAvails.set(availId, avail);
                lastActiveAvail = avail;
            }
            // EXT-X-CUE-OUT-CONT (Continuation)
            else if (seg.cue.type === 'cont') {
                // If we are already tracking an active break, assume this segment belongs to it.
                // Do NOT create a new avail block, preventing fragmentation.
                if (!lastActiveAvail) {
                    // Orphan Case: We joined the stream mid-break.
                    // Calculate implied start time to visualize the break correctly.
                    const duration = seg.cue.duration || 0;
                    const elapsedTime = seg.cue.elapsedTime || 0;
                    const start = cumulativeTimeForCues - elapsedTime;

                    // Unique ID for orphan break to avoid collision
                    const availId = `break-orphan-${baseSequence + index}`;

                    // Only add if it's relevant (ends in future or recent past)
                    if (start + duration > -10) {
                        const avail = {
                            id: availId,
                            startTime: start,
                            duration: duration,
                            scte35Signal: { error: 'Signaled via EXT-X-CUE-OUT-CONT' },
                            adManifestUrl: null,
                            creatives: [],
                            detectionMethod: 'SCTE35_INBAND'
                        };
                        foundAvails.set(availId, avail);
                        lastActiveAvail = avail;
                    }
                }
            }
            // EXT-X-CUE-IN (End of Break)
            else if (seg.cue.type === 'in') {
                lastActiveAvail = null;
            }
        }
        cumulativeTimeForCues += seg.duration;
    });

    manifestIR.adAvails.push(...Array.from(foundAvails.values()).sort((a, b) => a.startTime - b.startTime));

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

    // --- Process Segment Groups into Periods ---
    for (let i = 0; i < (hlsParsed.segmentGroups || []).length; i++) {
        const segmentGroup = hlsParsed.segmentGroups[i];
        if (segmentGroup.length === 0) continue;

        const periodDurationInTsUnits = segmentGroup.reduce(
            (sum, seg) => sum + seg.duration,
            0
        );
        const periodDuration = periodDurationInTsUnits / timescale;

        // --- Create a compliant synthetic AdaptationSet for media playlists ---
        const adaptationSets = [];
        if (!hlsParsed.isMaster) {
            const { contentType, codec } = inferMediaInfoFromExtension(
                segmentGroup[0].uri
            );
            const rep = /** @type {import('@/types').Representation} */ ({
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
            const as = /** @type {import('@/types').AdaptationSet} */ ({
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

        const periodIR = /** @type {import('@/types').Period} */ ({
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

            const label = variant.attributes.RESOLUTION ? `${variant.attributes.RESOLUTION.split('x')[1]}p` : `Variant ${i + 1}`;
            const format = videoCodecs.length > 0 ? videoCodecs[0].split('.')[0].toUpperCase() : 'Video';
            const representation = {
                id: variant.stableId,
                label: label,
                format: format,
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

        // Process I-Frame streams
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
                    } else if (type === 'subtitles' && tag.value.URI) {
                        const uri = tag.value.URI.toLowerCase();
                        if (uri.endsWith('.vtt')) {
                            codecs = [{ value: 'wvtt', source: 'manifest', supported: true }];
                        }
                    }
                }

                const name = tag.value.NAME;
                const id = name ? `${type}-${groupId}-${name}` : `${type}-${groupId}-rendition-${index}`;
                let format = 'Unknown';
                if (type === 'audio') {
                    format = inferHlsAudioFormat(codecs.map(c => c.value));
                } else if (type === 'subtitles' || type === 'closed-captions') {
                    format = inferHlsTextFormat(tag.value);
                }

                return {
                    id: id,
                    label: name || tag.value.LANGUAGE || id,
                    lang: tag.value.LANGUAGE,
                    format,
                    codecs: codecs,
                    bandwidth: tag.value.BANDWIDTH ? parseInt(tag.value.BANDWIDTH, 10) : 0,
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
                    robustness: null,
                };
            });
        manifestIR.contentProtections = contentProtectionIRs;
    }

    return manifestIR;
}