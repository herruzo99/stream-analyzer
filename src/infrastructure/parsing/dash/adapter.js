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
 * @typedef {import('@/types.ts').AdAvail} AdAvail
 */

import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import { parseDuration } from '@/shared/utils/time';
import {
    getAttr,
    findChildren,
    findChildrenRecursive,
    mergeElements,
} from './recursive-parser.js';
import { parseScte35 } from '@/infrastructure/parsing/scte35/parser';
import { inferMediaInfoFromExtension } from '../utils/media-types.js';

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
        codecs: { value: getAttr(mergedRepEl, 'codecs'), source: 'manifest' },
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
        ratings: findChildren(mergedEl, 'Rating').map(parseGenericDescriptor),
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
        labels: findChildren(mergedAsEl, 'Label').map(parseLabel),
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
        ratings: findChildren(mergedEl, 'Rating').map(parseGenericDescriptor),
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

function parsePeriod(periodEl, parentMergedEl, previousPeriod = null) {
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

    // --- ARCHITECTURAL REFACTOR: REFINED AD DETECTION HEURISTICS ---
    let isAdPeriod = false;

    // Heuristic 1 (Strongest): AssetIdentifier changes between periods.
    const currentAssetId = assetIdentifierEl
        ? getAttr(assetIdentifierEl, 'value')
        : null;
    const prevAssetId = previousPeriod?.assetIdentifier?.value ?? null;
    if (
        currentAssetId !== null &&
        prevAssetId !== null &&
        currentAssetId !== prevAssetId
    ) {
        isAdPeriod = true;
    }

    // Heuristic 2 (Strong): Period ID matches known SSAI vendor prefixes.
    if (!isAdPeriod && periodId) {
        const upperPeriodId = periodId.toUpperCase();
        if (
            KNOWN_SSAI_PREFIXES.some((prefix) =>
                upperPeriodId.startsWith(prefix)
            )
        ) {
            isAdPeriod = true;
        }
    }

    if (isAdPeriod && periodDuration) {
        // --- FIX: Robustly parse numeric ID from periodId ---
        const idMatch = periodId.match(/\d+/g);
        const numericId = idMatch ? parseInt(idMatch.join(''), 10) : null;
        const spliceEventId = numericId !== null ? numericId : Date.now();
        // --- END FIX ---

        const adManifestUrl = null; // SSAI periods are server-stitched.

        /** @type {import('@/types.ts').Scte35SpliceCommand} */
        const splice_command = {
            type: 'Splice Insert',
            splice_event_id: spliceEventId,
            duration_flag: 1,
            break_duration: {
                auto_return: true,
                duration: periodDuration * 90000,
            },
        };

        /** @type {AdAvail} */
        const adAvail = {
            id: String(spliceEventId),
            startTime: periodStart,
            duration: periodDuration,
            scte35Signal: {
                table_id: 0xfc,
                protocol_version: 0,
                pts_adjustment: 0,
                cw_index: 0,
                tier: 0xfff,
                splice_command_type: 'Splice Insert',
                crc_32: 0,
                splice_command,
                descriptors: [],
            },
            adManifestUrl: adManifestUrl,
            creatives: [],
        };
        adAvails.push(adAvail);
    }
    // --- END REFACTOR ---

    const rawAdaptationSets = findChildren(periodEl, 'AdaptationSet');

    // Group AdaptationSets by content type
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

    // --- ARCHITECTURAL FIX: Process all AdaptationSet types individually ---
    for (const type of ['video', 'audio', 'text', 'application']) {
        if (asGroups[type]) {
            asGroups[type].forEach((asEl) => {
                adaptationSets.push(parseAdaptationSet(asEl, mergedPeriodEl));
            });
        }
    }
    // --- END FIX ---

    adaptationSets.sort(sortAdaptationSets);

    // --- ARCHITECTURAL FIX: Proactive In-band Ad Signal ---
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
            scte35Signal: { type: 'Unconfirmed In-band Signal' },
            adManifestUrl: null,
            creatives: [],
        });
    }
    // --- END FIX ---

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
 * Transforms a serialized DASH manifest object into a protocol-agnostic IR.
 * @param {object} manifestElement The root MPD element, serialized.
 * @param {string} baseUrl The base URL for the manifest.
 * @param {object} [context]
 * @returns {Promise<Manifest>} The manifest IR object.
 */
export async function adaptDashToIr(manifestElement, baseUrl, context) {
    const manifestCopy = deepClone(manifestElement);

    const adaptationSets = findChildrenRecursive(manifestCopy, 'AdaptationSet');
    const hasTsMimeType = adaptationSets.some(
        (as) => getAttr(as, 'mimeType') === 'video/mp2t'
    );

    let segmentFormat = 'isobmff'; // Default to ISOBFF
    if (hasTsMimeType) {
        segmentFormat = 'ts';
    } else {
        const template = findChildrenRecursive(
            manifestCopy,
            'SegmentTemplate'
        )[0];
        if (template) {
            const mediaUrl = getAttr(template, 'media');
            const { contentType } = inferMediaInfoFromExtension(mediaUrl);
            if (contentType === 'video') {
                // Heuristic: if media attribute exists, check its extension
                const extensionBasedFormat =
                    inferMediaInfoFromExtension(mediaUrl).contentType ===
                    'video'
                        ? 'isobmff'
                        : 'ts';
                if (extensionBasedFormat === 'ts') {
                    segmentFormat = 'ts';
                }
            }
        }
    }

    /** @type {Manifest} */
    const manifestIR = {
        id: getAttr(manifestCopy, 'id'),
        type: getAttr(manifestCopy, 'type'),
        profiles: getAttr(manifestCopy, 'profiles'),
        minBufferTime: parseDuration(getAttr(manifestCopy, 'minBufferTime')),
        publishTime: getAttr(manifestCopy, 'publishTime')
            ? new Date(getAttr(manifestCopy, 'publishTime'))
            : null,
        availabilityStartTime: getAttr(manifestCopy, 'availabilityStartTime')
            ? new Date(getAttr(manifestCopy, 'availabilityStartTime'))
            : null,
        timeShiftBufferDepth: parseDuration(
            getAttr(manifestCopy, 'timeShiftBufferDepth')
        ),
        minimumUpdatePeriod: parseDuration(
            getAttr(manifestCopy, 'minimumUpdatePeriod')
        ),
        duration: parseDuration(
            getAttr(manifestCopy, 'mediaPresentationDuration')
        ),
        maxSegmentDuration: parseDuration(
            getAttr(manifestCopy, 'maxSegmentDuration')
        ),
        maxSubsegmentDuration: parseDuration(
            getAttr(manifestCopy, 'maxSubsegmentDuration')
        ),
        programInformations: findChildren(
            manifestCopy,
            'ProgramInformation'
        ).map((el) => ({
            title: getText(findChildren(el, 'Title')[0]),
            source: getText(findChildren(el, 'Source')[0]),
            copyright: getText(findChildren(el, 'Copyright')[0]),
            lang: getAttr(el, 'lang'),
            moreInformationURL: getAttr(el, 'moreInformationURL'),
        })),
        locations: findChildren(manifestCopy, 'Location').map(getText),
        patchLocations: findChildren(manifestCopy, 'PatchLocation').map(
            getText
        ),
        serviceDescriptions: findChildren(
            manifestCopy,
            'ServiceDescription'
        ).map(parseServiceDescription),
        initializationSets: findChildren(manifestCopy, 'InitializationSet').map(
            (el) => ({
                id: getAttr(el, 'id'),
                inAllPeriods: getAttr(el, 'inAllPeriods') !== 'false',
                contentType: getAttr(el, 'contentType'),
                initialization: getAttr(el, 'initialization'),
                codecs: getAttr(el, 'codecs'),
                serializedManifest: el,
            })
        ),
        periods: [], // Populated below
        segmentFormat: /** @type {'isobmff' | 'ts' | 'unknown'} */ (
            segmentFormat
        ),
        contentProtections: findChildren(manifestCopy, 'ContentProtection').map(
            (cpEl) => {
                const psshNode = findChildren(cpEl, 'cenc:pssh')[0];
                const psshData = psshNode ? getText(psshNode) : null;
                const schemeIdUri = getAttr(cpEl, 'schemeIdUri');
                return {
                    schemeIdUri: schemeIdUri,
                    system: getDrmSystemName(schemeIdUri),
                    defaultKid: getAttr(cpEl, 'cenc:default_KID'),
                    robustness: getAttr(cpEl, 'robustness'),
                    refId: getAttr(cpEl, 'refId'),
                    ref: getAttr(cpEl, 'ref'),
                    pssh: psshData
                        ? [
                              {
                                  systemId: schemeIdUri,
                                  kids: [],
                                  data: psshData,
                              },
                          ]
                        : [],
                };
            }
        ),
        serializedManifest: manifestElement,
        metrics: [],
        events: [],
        adAvails: [],
        summary: null,
        serverControl: null,
    };

    let previousPeriod = null;
    manifestIR.periods = findChildren(manifestCopy, 'Period').map((p) => {
        const periodIR = parsePeriod(p, manifestCopy, previousPeriod);
        previousPeriod = periodIR;
        return periodIR;
    });

    manifestIR.events = manifestIR.periods.flatMap((p) => p.events);
    manifestIR.adAvails = manifestIR.periods.flatMap((p) => p.adAvails);

    return manifestIR;
}