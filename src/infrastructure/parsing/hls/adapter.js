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
import { parseDuration } from '@/shared/utils/time';
import {
    getAttr,
    findChildren,
    findChildrenRecursive,
    mergeElements,
} from '../dash/recursive-parser.js';
import { parseScte35 } from '../scte35/parser.js';
import { inferMediaInfoFromExtension } from '../utils/media-types.js';
import { AdAvail } from '@/features/advertising/domain/AdAvail.js';
import { isCodecSupported } from '../utils/codec-support.js';

/**
 * Determines the segment format for an HLS manifest using reliable heuristics.
 * @param {object} hlsParsed - The parsed HLS manifest data from the parser.
 * @returns {'isobmff' | 'ts' | 'unknown'}
 */
function determineSegmentFormat(hlsParsed) {
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

    // 4. Final Fallback: The default for HLS is MPEG-2 Transport Stream.
    return 'ts';
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
 * @constant {string[]}
 * @description A list of known prefixes for Period IDs used by SSAI vendors.
 * This is a heuristic-based fallback for detecting ad insertion periods.
 */
const KNOWN_SSAI_PREFIXES = [
    'DAICONNECT', // Ad Insertion Platform (AIP)
    'MEDIATAILOR', // AWS MediaTailor
    'YOSPACE', // Yospace
    'VMAP', // Common VAST/VMAP-based insertion
];

/**
 * Creates a deep copy of a parsed manifest object.
 * @param {any} obj The object to clone.
 * @returns {any} A deep copy of the object.
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => deepClone(item));
    }
    if (obj instanceof Object) {
        const copy = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                copy[key] = deepClone(obj[key]);
            }
        }
        return copy;
    }
    throw new Error("Unable to copy obj! Its type isn't supported.");
}

/**
 * Parses a generic DescriptorType element into a consistent IR object.
 * @param {object} el The raw parsed element.
 * @returns {Descriptor}
 */
const parseGenericDescriptor = (el) => ({
    schemeIdUri: getAttr(el, 'schemeIdUri'),
    value: getAttr(el, 'value'),
    id: getAttr(el, 'id'),
});

/**
 * Parses a Label or GroupLabel element.
 * @param {object} el The raw parsed element.
 * @returns {import('@/types.ts').Label}
 */
const parseLabel = (el) => ({
    id: getAttr(el, 'id'),
    lang: getAttr(el, 'lang'),
    text: getText(el),
});

/**
 * Parses a Resync element.
 * @param {object} el The raw parsed Resync element.
 * @returns {Resync}
 */
const parseResync = (el) => ({
    type: parseInt(getAttr(el, 'type') || '0', 10),
    dT: getAttr(el, 'dT') ? parseInt(getAttr(el, 'dT'), 10) : null,
    dImax: getAttr(el, 'dImax') ? parseFloat(getAttr(el, 'dImax')) : null,
    dImin: getAttr(el, 'dImin') ? parseFloat(getAttr(el, 'dImin')) : null,
    marker: getAttr(el, 'marker') === 'true',
});

/**
 * Parses an OutputProtection element.
 * @param {object} el The raw parsed element.
 * @returns {OutputProtection | null}
 */
const parseOutputProtection = (el) => {
    const opEl = findChildren(el, 'OutputProtection')[0];
    if (!opEl) return null;
    return {
        schemeIdUri: getAttr(opEl, 'schemeIdUri'),
        value: getAttr(opEl, 'value'),
        robustness: getAttr(opEl, 'robustness'),
    };
};

/**
 * Parses an ExtendedBandwidth element.
 * @param {object} el The raw parsed element.
 * @returns {ExtendedBandwidth | null}
 */
const parseExtendedBandwidth = (el) => {
    const ebEl = findChildren(el, 'ExtendedBandwidth')[0];
    if (!ebEl) return null;
    return {
        vbr: getAttr(ebEl, 'vbr') === 'true',
        modelPairs: findChildren(ebEl, 'ModelPair').map((mpEl) => ({
            bufferTime: parseDuration(getAttr(mpEl, 'bufferTime')),
            bandwidth: parseInt(getAttr(mpEl, 'bandwidth'), 10),
        })),
    };
};

/**
 * Parses a FailoverContent element.
 * @param {object} mergedEl The merged parent element containing SegmentBase info.
 * @returns {FailoverContent | null}
 */
function parseFailoverContent(mergedEl) {
    const segmentBaseEl = findChildren(mergedEl, 'SegmentBase')[0];
    if (!segmentBaseEl) return null;

    const failoverEl = findChildren(segmentBaseEl, 'FailoverContent')[0];
    if (!failoverEl) return null;

    return {
        valid: getAttr(failoverEl, 'valid') !== 'false', // Defaults to true
        fcs: findChildren(failoverEl, 'FCS').map((fcsEl) => ({
            t: parseInt(getAttr(fcsEl, 't'), 10),
            d: getAttr(fcsEl, 'd') ? parseInt(getAttr(fcsEl, 'd'), 10) : null,
        })),
    };
}

/**
 * Parses a SubRepresentation element, inheriting from its parent Representation/AdaptationSet.
 * @param {object} subRepEl The raw parsed SubRepresentation element.
 * @param {object} parentMergedEl The already merged element of the parent Representation.
 * @returns {SubRepresentation}
 */
function parseSubRepresentation(subRepEl, parentMergedEl) {
    const mergedEl = mergeElements(parentMergedEl, subRepEl);

    /** @type {SubRepresentation} */
    const subRepIR = {
        level: getAttr(subRepEl, 'level')
            ? parseInt(getAttr(subRepEl, 'level'), 10)
            : null,
        dependencyLevel: getAttr(subRepEl, 'dependencyLevel'),
        bandwidth: getAttr(subRepEl, 'bandwidth')
            ? parseInt(getAttr(subRepEl, 'bandwidth'), 10)
            : null,
        contentComponent: getAttr(subRepEl, 'contentComponent')?.split(' '),
        codecs: { value: getAttr(mergedEl, 'codecs'), source: 'manifest' },
        mimeType: getAttr(mergedEl, 'mimeType'),
        profiles: getAttr(mergedEl, 'profiles'),
        width: {
            value: getAttr(mergedEl, 'width')
                ? parseInt(getAttr(mergedEl, 'width'), 10)
                : null,
            source: 'manifest',
        },
        height: {
            value: getAttr(mergedEl, 'height')
                ? parseInt(getAttr(mergedEl, 'height'), 10)
                : null,
            source: 'manifest',
        },
        serializedManifest: subRepEl,
    };

    return subRepIR;
}

/**
 * Parses a Representation element, correctly inheriting all common properties
 * from its parent AdaptationSet.
 * @param {object} repEl The raw parsed Representation element.
 * @param {object} parentMergedEl The already merged parent element (from Period or AdaptationSet).
 * @returns {Representation}
 */
function parseRepresentation(repEl, parentMergedEl) {
    const mergedRepEl = mergeElements(parentMergedEl, repEl);
    
    const codecString = getAttr(mergedRepEl, 'codecs') || '';
    const allCodecs = codecString.split(',').map(c => c.trim()).filter(Boolean);

    const videoCodecs = allCodecs.filter(isVideoCodec);
    const audioCodecs = allCodecs.filter(isAudioCodec);

    /** @type {Representation} */
    const repIR = {
        id: getAttr(repEl, 'id'),
        bandwidth: parseInt(getAttr(repEl, 'bandwidth'), 10),
        qualityRanking: getAttr(repEl, 'qualityRanking')
            ? parseInt(getAttr(repEl, 'qualityRanking'), 10)
            : null,
        dependencyId: getAttr(repEl, 'dependencyId'),
        associationId: getAttr(repEl, 'associationId'),
        associationType: getAttr(repEl, 'associationType'),
        codecs: videoCodecs.map(c => ({ value: c, source: 'manifest', supported: isCodecSupported(c) })),
        muxedAudio: {
            codecs: audioCodecs.map(c => ({ value: c, source: 'manifest', supported: isCodecSupported(c) })),
            channels: null,
            lang: getAttr(mergedRepEl, 'lang') || 'und',
        },
        mimeType: getAttr(mergedRepEl, 'mimeType'),
        profiles: getAttr(mergedRepEl, 'profiles'),
        width: {
            value: getAttr(mergedRepEl, 'width')
                ? parseInt(getAttr(mergedRepEl, 'width'), 10)
                : null,
            source: 'manifest',
        },
        height: {
            value: getAttr(mergedRepEl, 'height')
                ? parseInt(getAttr(mergedRepEl, 'height'), 10)
                : null,
            source: 'manifest',
        },
        frameRate: getAttr(mergedRepEl, 'frameRate'),
        sar: getAttr(mergedRepEl, 'sar'),
        audioSamplingRate: getAttr(mergedRepEl, 'audioSamplingRate'),
        scanType: getAttr(mergedRepEl, 'scanType'),
        startWithSAP: getAttr(mergedRepEl, 'startWithSAP')
            ? parseInt(getAttr(mergedRepEl, 'startWithSAP'), 10)
            : null,
        selectionPriority: getAttr(mergedRepEl, 'selectionPriority')
            ? parseInt(getAttr(mergedRepEl, 'selectionPriority'), 10)
            : 0,
        tag: getAttr(mergedRepEl, 'tag'),
        mediaStreamStructureId: getAttr(mergedRepEl, 'mediaStreamStructureId'),
        maximumSAPPeriod: getAttr(mergedRepEl, 'maximumSAPPeriod')
            ? parseFloat(getAttr(mergedRepEl, 'maximumSAPPeriod'))
            : null,
        maxPlayoutRate: getAttr(mergedRepEl, 'maxPlayoutRate')
            ? parseFloat(getAttr(mergedRepEl, 'maxPlayoutRate'))
            : null,
        codingDependency:
            getAttr(mergedRepEl, 'codingDependency') === 'true'
                ? true
                : getAttr(mergedRepEl, 'codingDependency') === 'false'
                  ? false
                  : null,
        eptDelta: null,
        pdDelta: null,
        representationIndex: null,
        failoverContent: parseFailoverContent(mergedRepEl),
        contentProtection: findChildren(mergedRepEl, 'ContentProtection').map(
            (cpEl) => {
                const psshNode = findChildren(cpEl, 'pssh')[0];
                const psshData = psshNode ? getText(psshNode) : null;
                const schemeIdUri = getAttr(cpEl, 'schemeIdUri');
                return {
                    schemeIdUri: schemeIdUri,
                    system: getDrmSystemName(schemeIdUri),
                    defaultKid: getAttr(cpEl, 'default_KID'),
                    robustness: getAttr(cpEl, 'robustness'),
                    refId: getAttr(cpEl, 'refId'),
                    ref: getAttr(cpEl, 'ref'),
                    pssh: psshData
                        ? [
                              {
                                  systemId: schemeIdUri, // Store the raw UUID
                                  kids: [],
                                  data: psshData,
                              },
                          ]
                        : [],
                };
            }
        ),
        audioChannelConfigurations: findChildren(
            mergedRepEl,
            'AudioChannelConfiguration'
        ).map(parseGenericDescriptor),
        framePackings: findChildren(mergedRepEl, 'FramePacking').map(
            parseGenericDescriptor
        ),
        ratings: findChildren(mergedRepEl, 'Rating').map(
            parseGenericDescriptor
        ),
        viewpoints: findChildren(mergedRepEl, 'Viewpoint').map(
            parseGenericDescriptor
        ),
        accessibility: findChildren(mergedRepEl, 'Accessibility').map(
            parseGenericDescriptor
        ),
        labels: findChildren(mergedRepEl, 'Label').map(parseLabel),
        groupLabels: findChildren(mergedRepEl, 'GroupLabel').map(parseLabel),
        subRepresentations: findChildren(repEl, 'SubRepresentation').map(
            (subRepEl) => parseSubRepresentation(subRepEl, mergedRepEl)
        ),
        resyncs: findChildren(mergedRepEl, 'Resync').map(parseResync),
        outputProtection: parseOutputProtection(mergedRepEl),
        extendedBandwidth: parseExtendedBandwidth(mergedRepEl),
        videoRange: undefined,
        stableVariantId: null,
        pathwayId: null,
        supplementalCodecs: null,
        reqVideoLayout: null,
        serializedManifest: repEl,
        segmentProfiles: getAttr(mergedRepEl, 'segmentProfiles'),
    };
    
    if (!repIR.muxedAudio.codecs) {
        repIR.muxedAudio.codecs = [];
    }

    return repIR;
}

/**
 * Parses a ContentComponent element.
 * @param {object} ccEl - The raw parsed ContentComponent element.
 * @param {object} parentEl - The parent AdaptationSet element.
 * @returns {ContentComponent}
 */
function parseContentComponent(ccEl, parentEl) {
    const mergedEl = mergeElements(parentEl, ccEl);
    return {
        id: getAttr(ccEl, 'id'),
        lang: getAttr(mergedEl, 'lang'),
        contentType: getAttr(mergedEl, 'contentType'),
        par: getAttr(mergedEl, 'par'),
        tag: getAttr(mergedEl, 'tag'),
        accessibility: findChildren(mergedEl, 'Accessibility').map(
            parseGenericDescriptor
        ),
        roles: findChildren(mergedEl, 'Role').map(parseGenericDescriptor),
        ratings: findChildren(mergedEl, 'Rating').map(
            parseGenericDescriptor
        ),
        viewpoints: findChildren(mergedEl, 'Viewpoint').map(
            parseGenericDescriptor
        ),
        serializedManifest: ccEl,
    };
}

function parseAdaptationSet(asEl, parentMergedEl) {
    const mergedAsEl = mergeElements(parentMergedEl, asEl);
    const contentComponentEls = findChildren(asEl, 'ContentComponent');

    let contentType =
        getAttr(asEl, 'contentType') ||
        getAttr(asEl, 'mimeType')?.split('/')[0];
    if (!contentType) {
        const firstRep = findChildren(asEl, 'Representation')[0];
        if (firstRep) {
            contentType = getAttr(firstRep, 'mimeType')?.split('/')[0];
        }
    }

    const labels = findChildren(asEl, 'Label').map(parseLabel);
    const attributeLabel = getAttr(asEl, 'label');
    if (labels.length === 0 && attributeLabel) {
        labels.push({ id: null, lang: null, text: attributeLabel });
    }

    let contentComponents;
    if (contentComponentEls.length > 0) {
        contentComponents = contentComponentEls.map((ccEl) =>
            parseContentComponent(ccEl, asEl)
        );
    } else {
        // If no explicit ContentComponent, create one implicitly from the AdaptationSet's attributes
        contentComponents = [
            {
                id: null,
                lang: getAttr(asEl, 'lang'),
                contentType: contentType,
                par: getAttr(asEl, 'par'),
                tag: getAttr(asEl, 'tag'),
                accessibility: findChildren(asEl, 'Accessibility').map(
                    parseGenericDescriptor
                ),
                roles: findChildren(asEl, 'Role').map(parseGenericDescriptor),
                ratings: findChildren(asEl, 'Rating').map(
                    parseGenericDescriptor
                ),
                viewpoints: findChildren(asEl, 'Viewpoint').map(
                    parseGenericDescriptor
                ),
                serializedManifest: asEl,
            },
        ];
    }

    const minW = getAttr(asEl, 'minWidth');
    const maxW = getAttr(asEl, 'maxWidth');
    const minH = getAttr(asEl, 'minHeight');
    const maxH = getAttr(asEl, 'maxHeight');

    const representations = findChildren(asEl, 'Representation').map((repEl) =>
        parseRepresentation(repEl, mergedAsEl)
    );

    if (contentType === 'video') {
        representations.sort(sortVideoRepresentations);
    } else if (contentType === 'audio') {
        representations.sort(sortAudioRepresentations);
    }

    /** @type {AdaptationSet} */
    const asIR = {
        id: getAttr(asEl, 'id'),
        group: getAttr(asEl, 'group')
            ? parseInt(getAttr(asEl, 'group'), 10)
            : null,
        lang: getAttr(asEl, 'lang'),
        contentType: contentType,
        bitstreamSwitching:
            getAttr(asEl, 'bitstreamSwitching') === 'true' ? true : null,
        segmentAlignment: getAttr(mergedAsEl, 'segmentAlignment') === 'true',
        subsegmentAlignment:
            getAttr(mergedAsEl, 'subsegmentAlignment') === 'true',
        subsegmentStartsWithSAP: getAttr(mergedAsEl, 'subsegmentStartsWithSAP')
            ? parseInt(getAttr(mergedAsEl, 'subsegmentStartsWithSAP'), 10)
            : null,
        width: minW && minW === maxW ? parseInt(minW, 10) : null,
        height: minH && minH === maxH ? parseInt(minH, 10) : null,
        maxWidth: maxW ? parseInt(maxW, 10) : null,
        maxHeight: maxH ? parseInt(maxH, 10) : null,
        maxFrameRate: getAttr(asEl, 'maxFrameRate'),
        sar: getAttr(mergedAsEl, 'sar'),
        maximumSAPPeriod: getAttr(mergedAsEl, 'maximumSAPPeriod')
            ? parseFloat(getAttr(mergedAsEl, 'maximumSAPPeriod'))
            : null,
        audioSamplingRate: getAttr(asEl, 'audioSamplingRate')
            ? parseInt(getAttr(asEl, 'audioSamplingRate'), 10)
            : null,
        mimeType: getAttr(mergedAsEl, 'mimeType'),
        profiles: getAttr(mergedAsEl, 'profiles'),
        representations: representations,
        contentProtection: findChildren(mergedAsEl, 'ContentProtection').map(
            (cpEl) => {
                const psshNode = findChildren(cpEl, 'pssh')[0];
                const psshData = psshNode ? getText(psshNode) : null;
                const schemeIdUri = getAttr(cpEl, 'schemeIdUri');
                return {
                    schemeIdUri: schemeIdUri,
                    system: getDrmSystemName(schemeIdUri),
                    defaultKid: getAttr(cpEl, 'default_KID'),
                    robustness: getAttr(cpEl, 'robustness'),
                    refId: getAttr(cpEl, 'refId'),
                    ref: getAttr(cpEl, 'ref'),
                    pssh: psshData
                        ? [
                              {
                                  systemId: schemeIdUri, // Store the raw UUID
                                  kids: [],
                                  data: psshData,
                              },
                          ]
                        : [],
                };
            }
        ),
        inbandEventStreams: findChildren(mergedAsEl, 'InbandEventStream').map(
            parseGenericDescriptor
        ),
        audioChannelConfigurations: findChildren(
            mergedAsEl,
            'AudioChannelConfiguration'
        ).map(parseGenericDescriptor),
        framePackings: findChildren(mergedAsEl, 'FramePacking').map(
            parseGenericDescriptor
        ),
        ratings: findChildren(mergedAsEl, 'Rating').map(
            parseGenericDescriptor
        ),
        viewpoints: findChildren(mergedAsEl, 'Viewpoint').map(
            parseGenericDescriptor
        ),
        accessibility: findChildren(mergedAsEl, 'Accessibility').map(
            parseGenericDescriptor
        ),
        labels: labels, // Use the new labels array
        groupLabels: findChildren(mergedAsEl, 'GroupLabel').map(parseLabel),
        roles: findChildren(mergedAsEl, 'Role').map(parseGenericDescriptor),
        contentComponents: contentComponents,
        resyncs: findChildren(mergedAsEl, 'Resync').map(parseResync),
        outputProtection: parseOutputProtection(mergedAsEl),
        stableRenditionId: null,
        bitDepth: null,
        sampleRate: null,
        channels: null,
        assocLanguage: null,
        characteristics: null,
        forced: false,
        serializedManifest: asEl,
    };

    return asIR;
}

/**
 * Parses a Preselection element.
 * @param {object} preselectionEl The raw parsed Preselection element.
 * @param {object} parentMergedEl The parent Period element.
 * @returns {Preselection}
 */
function parsePreselection(preselectionEl, parentMergedEl) {
    const mergedEl = mergeElements(parentMergedEl, preselectionEl);
    return {
        id: getAttr(preselectionEl, 'id') || '1',
        preselectionComponents:
            getAttr(preselectionEl, 'preselectionComponents')?.split(' ') || [],
        lang: getAttr(preselectionEl, 'lang'),
        order: getAttr(preselectionEl, 'order') || 'undefined',
        accessibility: findChildren(mergedEl, 'Accessibility').map(
            parseGenericDescriptor
        ),
        roles: findChildren(mergedEl, 'Role').map(parseGenericDescriptor),
        ratings: findChildren(mergedEl, 'Rating').map(
            parseGenericDescriptor
        ),
        viewpoints: findChildren(mergedEl, 'Viewpoint').map(
            parseGenericDescriptor
        ),
        serializedManifest: preselectionEl,
    };
}

/**
 * Parses a ServiceDescription element.
 * @param {object} sdEl Raw parsed ServiceDescription element.
 * @returns {ServiceDescription}
 */
const parseServiceDescription = (sdEl) => ({
    id: getAttr(sdEl, 'id'),
    scopes: findChildren(sdEl, 'Scope').map(parseGenericDescriptor),
    latencies: findChildren(sdEl, 'Latency').map((el) => ({
        min: getAttr(el, 'min') ? parseInt(getAttr(el, 'min'), 10) : null,
        max: getAttr(el, 'max') ? parseInt(getAttr(el, 'max'), 10) : null,
        target: getAttr(el, 'target')
            ? parseInt(getAttr(el, 'target'), 10)
            : null,
        referenceId: getAttr(el, 'referenceId')
            ? parseInt(getAttr(el, 'referenceId'), 10)
            : null,
    })),
    playbackRates: findChildren(sdEl, 'PlaybackRate').map((el) => ({
        min: getAttr(el, 'min') ? parseFloat(getAttr(el, 'min')) : null,
        max: getAttr(el, 'max') ? parseFloat(getAttr(el, 'max')) : null,
    })),
    serializedManifest: sdEl,
});

const getText = (el) => el?.['#text'] || null;

function parsePeriod(
    periodEl,
    parentMergedEl,
    previousPeriod = null,
    existingAdAvails = []
) {
    const mergedPeriodEl = mergeElements(parentMergedEl, periodEl);
    const assetIdentifierEl = findChildren(periodEl, 'AssetIdentifier')[0];
    const subsets = findChildren(periodEl, 'Subset');
    const eventStreams = findChildren(periodEl, 'EventStream');
    const periodId = getAttr(periodEl, 'id');

    let periodStart = parseDuration(getAttr(periodEl, 'start'));
    if (periodStart === null) {
        if (previousPeriod && previousPeriod.duration !== null) {
            periodStart = previousPeriod.start + previousPeriod.duration;
        } else {
            periodStart = 0;
        }
    }
    const periodDuration = parseDuration(getAttr(periodEl, 'duration'));

    const allEvents = [];
    const adAvails = [];

    const eventStreamIRs = eventStreams.map((esEl) => {
        const schemeIdUri = getAttr(esEl, 'schemeIdUri');
        const timescale = parseInt(getAttr(esEl, 'timescale') || '1', 10);
        const presentationTimeOffset = parseInt(
            getAttr(esEl, 'presentationTimeOffset') || '0',
            10
        );

        const events = findChildren(esEl, 'Event').map((eEl) => {
            const presentationTime = parseInt(
                getAttr(eEl, 'presentationTime') || '0',
                10
            );
            const duration = parseInt(getAttr(eEl, 'duration') || '0', 10);
            const startTime =
                periodStart +
                (presentationTime - presentationTimeOffset) / timescale;
            const eventDuration = duration / timescale;
            const messageData = getAttr(eEl, 'messageData');

            const event = {
                startTime,
                duration: eventDuration,
                message: getText(eEl) || messageData,
                messageData: messageData,
                type: 'dash-event',
                cue: null,
            };

            if (messageData && schemeIdUri?.toLowerCase().includes('scte35')) {
                try {
                    const binaryData = Uint8Array.from(atob(messageData), (c) =>
                        c.charCodeAt(0)
                    );
                    event.scte35 = parseScte35(binaryData);
                } catch (e) {
                    console.error(
                        'Failed to parse SCTE-35 from DASH Event:',
                        e
                    );
                }
            }

            return event;
        });

        allEvents.push(...events);

        return {
            schemeIdUri: schemeIdUri,
            value: getAttr(esEl, 'value'),
            timescale,
            presentationTimeOffset,
            events: [], // Events are aggregated at the Period level for the IR
        };
    });

    // --- HEURISTIC AD DETECTION (STATEFUL UPDATE LOGIC) ---
    const existingAvail = existingAdAvails.find((a) => a.id === periodId);

    if (existingAvail && existingAvail.duration === null && periodDuration) {
        // This is a retroactive update. Mutate the existing object.
        existingAvail.duration = periodDuration;
    } else if (!existingAvail && previousPeriod) {
        // This is a new period transition. Create a new AdAvail.
        let detectionMethod = 'STRUCTURAL_DISCONTINUITY';

        const isCurrentEncrypted =
            findChildrenRecursive(periodEl, 'ContentProtection').length > 0;
        const isPrevEncrypted =
            findChildrenRecursive(
                previousPeriod.serializedManifest,
                'ContentProtection'
            ).length > 0;
        if (isCurrentEncrypted !== isPrevEncrypted) {
            detectionMethod = 'ENCRYPTION_TRANSITION';
        }

        adAvails.push(
            new AdAvail({
                id: periodId || `ad-break-${periodStart}`,
                startTime: periodStart,
                duration: periodDuration || null,
                scte35Signal: null,
                adManifestUrl: null,
                creatives: [],
                detectionMethod: /** @type {any} */ (detectionMethod),
            })
        );
    }
    // --- END HEURISTIC ---

    const rawAdaptationSets = findChildren(periodEl, 'AdaptationSet');

    const asGroups = rawAdaptationSets.reduce((acc, asEl) => {
        let contentType =
            getAttr(asEl, 'contentType') ||
            getAttr(asEl, 'mimeType')?.split('/')[0];
        if (!contentType) {
            const firstRep = findChildren(asEl, 'Representation')[0];
            if (firstRep) {
                contentType = getAttr(firstRep, 'mimeType')?.split('/')[0];
            }
        }
        if (!acc[contentType]) {
            acc[contentType] = [];
        }
        acc[contentType].push(asEl);
        return acc;
    }, {});

    const adaptationSets = [];

    for (const type of ['video', 'audio', 'text', 'application']) {
        if (asGroups[type]) {
            asGroups[type].forEach((asEl) => {
                adaptationSets.push(parseAdaptationSet(asEl, mergedPeriodEl));
            });
        }
    }

    adaptationSets.sort(sortAdaptationSets);

    if (
        adaptationSets.some((as) =>
            (as.inbandEventStreams || []).some(
                (ies) =>
                    ies.schemeIdUri === 'urn:scte:scte35:2013:bin' ||
                    ies.schemeIdUri === 'urn:scte:scte35:2014:xml+bin'
            )
        )
    ) {
        adAvails.push({
            id: 'unconfirmed-inband-scte35',
            startTime: -1,
            duration: -1,
            scte35Signal: { error: 'Unconfirmed In-band Signal' },
            adManifestUrl: null,
            creatives: [],
            detectionMethod: /** @type {const} */ ('SCTE35_INBAND'),
        });
    }

    /** @type {Period} */
    const periodIR = {
        id: periodId,
        start: periodStart,
        duration: periodDuration,
        bitstreamSwitching: getAttr(periodEl, 'bitstreamSwitching') === 'true',
        assetIdentifier: assetIdentifierEl
            ? {
                  schemeIdUri: getAttr(assetIdentifierEl, 'schemeIdUri'),
                  value: getAttr(assetIdentifierEl, 'value'),
              }
            : null,
        subsets: subsets.map((s) => ({
            contains: (getAttr(s, 'contains') || '').split(' '),
            id: getAttr(s, 'id'),
        })),
        adaptationSets: adaptationSets,
        preselections: findChildren(periodEl, 'Preselection').map((pEl) =>
            parsePreselection(pEl, mergedPeriodEl)
        ),
        serviceDescriptions: findChildren(periodEl, 'ServiceDescription').map(
            parseServiceDescription
        ),
        eventStreams: eventStreamIRs,
        events: allEvents,
        adAvails: adAvails,
        supplementalProperties: findChildren(
            periodEl,
            'SupplementalProperty'
        ).map(parseGenericDescriptor),
        serializedManifest: periodEl,
    };

    return periodIR;
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
    const timescale = hlsParsed.segments[0]?.timescale || 90000;
    const totalDurationInTsUnits = hlsParsed.segments.reduce(
        (sum, seg) => sum + seg.duration,
        0
    );
    const totalDuration = totalDurationInTsUnits / timescale;

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
            const { contentType, codec } = inferMediaInfoFromExtension(segmentGroup[0].uri);
            const rep = /** @type {Representation} */ ({
                id: `media-rep-0`,
                codecs: [{ value: codec, source: 'manifest', supported: isCodecSupported(codec) }],
                bandwidth: 0,
                width: { value: null, source: 'manifest' },
                height: { value: null, source: 'manifest' },
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
                width: null, height: null, maxWidth: null, maxHeight: null, maxFrameRate: null, sar: null, maximumSAPPeriod: null,
                audioSamplingRate: null, contentProtection: [], audioChannelConfigurations: [], framePackings: [], ratings: [], viewpoints: [], accessibility: [],
                labels: [], groupLabels: [], contentComponents: [], resyncs: [], outputProtection: null, stableRenditionId: null, bitDepth: null, sampleRate: null,
                channels: null, assocLanguage: null, characteristics: null, forced: false, inbandEventStreams: [],
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
                [width, height] = variant.attributes.RESOLUTION.split('x').map(
                    Number
                );
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
                codecs: videoCodecs.map(c => ({ value: c, source: 'manifest', supported: isCodecSupported(c) })),
                muxedAudio: {
                    codecs: audioCodecs.map(c => ({ value: c, source: 'manifest', supported: isCodecSupported(c) })),
                    channels: null,
                    lang: 'und'
                },
                frameRate: variant.attributes['FRAME-RATE'],
                videoRange: variant.attributes['VIDEO-RANGE'],
                stableVariantId: variant.attributes['STABLE-VARIANT-ID'],
                pathwayId: variant.attributes['PATHWAY-ID'],
                supplementalCodecs:
                    variant.attributes['SUPPLEMENTAL-CODECS'],
                reqVideoLayout: variant.attributes['REQ-VIDEO-LAYOUT'],
                serializedManifest: variant,
                width: { value: width || null, source: 'manifest' },
                height: { value: height || null, source: 'manifest' },
                __variantUri: variant.resolvedUri,
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
                        codecs: [{
                            value: iframe.value.CODECS,
                            source: 'manifest',
                            supported: isCodecSupported(iframe.value.CODECS),
                        }],
                        frameRate: iframe.value['FRAME-RATE'],
                        videoRange: iframe.value['VIDEO-RANGE'],
                        serializedManifest: iframe,
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