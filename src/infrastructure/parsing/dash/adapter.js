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
import { parseDuration } from '@/utils/time';
import { generateDashSummary } from './summary-generator.js';
import {
    getAttr,
    findChild,
    findChildren,
    findChildrenRecursive,
    mergeElements,
} from './recursive-parser.js';
import { parseScte35 } from '@/infrastructure/parsing/scte35/parser';
import { inferMediaInfoFromExtension } from '../utils/media-types.js';

const getText = (el) => el?.['#text'] || null;

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
    const opEl = findChild(el, 'OutputProtection');
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
    const ebEl = findChild(el, 'ExtendedBandwidth');
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
    const segmentBaseEl = findChild(mergedEl, 'SegmentBase');
    if (!segmentBaseEl) return null;

    const failoverEl = findChild(segmentBaseEl, 'FailoverContent');
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
        scanType: getAttr(mergedRepEl, 'scanType'),
        segmentProfiles: getAttr(mergedRepEl, 'segmentProfiles'),
        mediaStreamStructureId: getAttr(mergedRepEl, 'mediaStreamStructureId'),
        maximumSAPPeriod: getAttr(mergedRepEl, 'maximumSAPPeriod')
            ? parseFloat(getAttr(mergedRepEl, 'maximumSAPPeriod'))
            : null,
        startWithSAP: getAttr(mergedRepEl, 'startWithSAP')
            ? parseInt(getAttr(mergedRepEl, 'startWithSAP'), 10)
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
        selectionPriority: getAttr(mergedRepEl, 'selectionPriority')
            ? parseInt(getAttr(mergedRepEl, 'selectionPriority'), 10)
            : 0,
        tag: getAttr(mergedRepEl, 'tag'),
        eptDelta: null,
        pdDelta: null,
        representationIndex: null,
        failoverContent: parseFailoverContent(mergedRepEl),
        audioChannelConfigurations: findChildren(
            mergedRepEl,
            'AudioChannelConfiguration'
        ).map((el) => ({
            schemeIdUri: getAttr(el, 'schemeIdUri'),
            value: getAttr(el, 'value'),
        })),
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
        const firstRep = findChild(asEl, 'Representation');
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
        width: getAttr(mergedAsEl, 'width')
            ? parseInt(getAttr(mergedAsEl, 'width'), 10)
            : null,
        height: getAttr(mergedAsEl, 'height')
            ? parseInt(getAttr(mergedAsEl, 'height'), 10)
            : null,
        maxWidth: getAttr(asEl, 'maxWidth')
            ? parseInt(getAttr(asEl, 'maxWidth'), 10)
            : null,
        maxHeight: getAttr(asEl, 'maxHeight')
            ? parseInt(getAttr(asEl, 'maxHeight'), 10)
            : null,
        maxFrameRate: getAttr(asEl, 'maxFrameRate'),
        mimeType: getAttr(mergedAsEl, 'mimeType'),
        profiles: getAttr(mergedAsEl, 'profiles'),
        representations: findChildren(asEl, 'Representation').map((repEl) =>
            parseRepresentation(repEl, mergedAsEl)
        ),
        contentProtection: findChildren(mergedAsEl, 'ContentProtection').map(
            (cpEl) => {
                const psshNode = findChild(cpEl, 'pssh');
                const psshData = psshNode ? getText(psshNode) : null;
                return {
                    schemeIdUri: getAttr(cpEl, 'schemeIdUri'),
                    system: getDrmSystemName(getAttr(cpEl, 'schemeIdUri')),
                    defaultKid: getAttr(cpEl, 'default_KID'),
                    robustness: getAttr(cpEl, 'robustness'),
                    pssh: psshData
                        ? [
                              {
                                  systemId: getDrmSystemName(
                                      getAttr(cpEl, 'schemeIdUri')
                                  ),
                                  kids: [],
                                  data: psshData,
                              },
                          ]
                        : [],
                };
            }
        ),
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

function parsePeriod(periodEl, parentMergedEl, previousPeriod = null) {
    const mergedPeriodEl = mergeElements(parentMergedEl, periodEl);
    const assetIdentifierEl = findChild(periodEl, 'AssetIdentifier');
    const subsets = findChildren(periodEl, 'Subset');
    const eventStreams = findChildren(periodEl, 'EventStream');

    let periodStart = parseDuration(getAttr(periodEl, 'start'));
    if (periodStart === null) {
        if (previousPeriod && previousPeriod.duration !== null) {
            periodStart = previousPeriod.start + previousPeriod.duration;
        } else {
            periodStart = 0;
        }
    }

    const allEvents = [];
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

    /** @type {Period} */
    const periodIR = {
        id: getAttr(periodEl, 'id'),
        start: periodStart,
        duration: parseDuration(getAttr(periodEl, 'duration')),
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
        adaptationSets: findChildren(periodEl, 'AdaptationSet').map((asEl) =>
            parseAdaptationSet(asEl, mergedPeriodEl)
        ),
        preselections: findChildren(periodEl, 'Preselection').map((pEl) =>
            parsePreselection(pEl, mergedPeriodEl)
        ),
        serviceDescriptions: findChildren(periodEl, 'ServiceDescription').map(
            parseServiceDescription
        ),
        eventStreams: eventStreamIRs,
        events: allEvents,
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

    let segmentFormat = 'isobmff'; // Default to ISOBMFF
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
                    inferMediaInfoFromExtension(mediaUrl).contentType === 'video'
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
            title: getText(findChild(el, 'Title')),
            source: getText(findChild(el, 'Source')),
            copyright: getText(findChild(el, 'Copyright')),
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
        serializedManifest: manifestElement,
        metrics: [],
        events: [],
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
    manifestIR.summary = await generateDashSummary(manifestIR, manifestCopy, {
        ...context,
        manifestUrl: baseUrl,
    });

    return manifestIR;
}