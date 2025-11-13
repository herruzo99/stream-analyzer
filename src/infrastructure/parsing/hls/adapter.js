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
export function determineSegmentFormat(hlsParsed) {
    // 1. Definitive check: If EXT-X-MAP is present, it's fMP4 (ISOBFF).
    if (hlsParsed.map) {
        return 'isobmff';
    }

    // 2. Media Playlist Check: Check segment extensions directly. This is highly reliable.
    const segments = hlsParsed.segmentGroups.flat();
    if (segments && segments.length > 0) {
        for (const segment of segments) {
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
 * Transforms a parsed HLS manifest object into a protocol-agnostic Intermediate Representation (IR).
 * This version correctly models discontinuities as distinct Periods.
 * @param {object} hlsParsed - The parsed HLS manifest data from the parser.
 * @param {object} [context] - Context for enrichment.
 * @returns {Promise<Manifest>} The manifest IR object.
 */
export async function adaptHlsToIr(hlsParsed, context) {
    const segmentFormat = determineSegmentFormat(hlsParsed);
    const totalDuration = hlsParsed.segments.reduce(
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

    let periodStart = 0;
    let previousPeriodHadEncryption = false;

    // --- CORE REFACTOR: Process Segment Groups into Periods ---
    for (let i = 0; i < hlsParsed.segmentGroups.length; i++) {
        const segmentGroup = hlsParsed.segmentGroups[i];
        if (segmentGroup.length === 0) continue;

        const periodDuration = segmentGroup.reduce(
            (sum, seg) => sum + seg.duration,
            0
        );

        // --- Ad Period Detection Heuristic ---
        const firstSegment = segmentGroup[0];
        const hasEncryption = !!firstSegment.encryptionInfo;
        const isAdPeriod =
            (i > 0 && hasEncryption !== previousPeriodHadEncryption) ||
            firstSegment.discontinuity;
        previousPeriodHadEncryption = hasEncryption;

        const adaptationSets = [];
        // For media playlists, all segments belong to a single "AdaptationSet"
        if (!hlsParsed.isMaster) {
            const { contentType, codec } = inferMediaInfoFromExtension(
                segmentGroup[0].uri
            );
            adaptationSets.push({
                id: `media-${i}`,
                contentType,
                roles: [],
                representations: [
                    {
                        id: `media-${i}-rep-0`,
                        codecs: { value: codec, source: 'manifest' },
                        bandwidth: 0,
                        width: { value: null, source: 'manifest' },
                        height: { value: null, source: 'manifest' },
                    },
                ],
            });
        }

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
                detectionMethod:
                    /** @type {const} */ ('STRUCTURAL_DISCONTINUITY'),
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
                    serializedManifest: { ...variant, isSynthetic: true },
                });
            }

            let width = null,
                height = null;
            if (typeof variant.attributes.RESOLUTION === 'string') {
                [width, height] = variant.attributes.RESOLUTION.split('x').map(
                    Number
                );
            }

            const representation = {
                id: `variant-${i}`,
                bandwidth: variant.attributes.BANDWIDTH,
                codecs: {
                    value: variant.attributes.CODECS,
                    source: 'manifest',
                },
                frameRate: variant.attributes['FRAME-RATE'],
                videoRange: variant.attributes['VIDEO-RANGE'],
                stableVariantId: variant.attributes['STABLE-VARIANT-ID'],
                pathwayId: variant.attributes['PATHWAY-ID'],
                supplementalCodecs:
                    variant.attributes['SUPPLEMENTAL-CODECS'],
                reqVideoLayout: variant.attributes['REQ-VIDEO-LAYOUT'],
                serializedManifest: variant,
                __variantUri: variant.resolvedUri,
                width: { value: width || null, source: 'manifest' },
                height: { value: height || null, source: 'manifest' },
            };

            asGroups.get(groupId).representations.push(representation);
        });

        // Process I-Frame streams as trick-play video AdaptationSets
        (hlsParsed.iframeStreams || []).forEach((iframe, i) => {
            const groupId = `iframe-group-${i}`;
            let width = null,
                height = null;
            if (typeof iframe.value.RESOLUTION === 'string') {
                [width, height] = iframe.value.RESOLUTION.split('x').map(Number);
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
                        codecs: {
                            value: iframe.value.CODECS,
                            source: 'manifest',
                        },
                        frameRate: iframe.value['FRAME-RATE'],
                        videoRange: iframe.value['VIDEO-RANGE'],
                        serializedManifest: iframe,
                    },
                ],
                serializedManifest: { ...iframe, isSynthetic: true },
            });
        });

        // Process Media tags into audio/subtitle AdaptationSets
        (hlsParsed.media || []).forEach((media, i) => {
            const groupId = media.value['GROUP-ID'];
            const type = media.value.TYPE?.toLowerCase() || 'unknown';
            const asKey = `${type}-${groupId}-${i}`; // Create a unique key for each media tag
            
            const adaptationSet = {
                id: asKey,
                contentType: type,
                lang: media.value.LANGUAGE,
                channels: media.value.CHANNELS,
                roles: media.value.CHARACTERISTICS
                    ? media.value.CHARACTERISTICS.split(',').map(r => ({ value: r }))
                    : [],
                representations: [{
                    id: `rendition-${i}`,
                    lang: media.value.LANGUAGE,
                    codecs: { value: 'unknown', source: 'manifest' },
                    bandwidth: 0,
                    serializedManifest: media,
                }],
                serializedManifest: { ...media, isSynthetic: true },
            };
            asGroups.set(asKey, adaptationSet);
        });

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