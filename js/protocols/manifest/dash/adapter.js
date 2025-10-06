/**
 * @typedef {import('../../../core/types.js').Manifest} Manifest
 * @typedef {import('../../../core/types.js').Period} Period
 * @typedef {import('../../../core/types.js').AdaptationSet} AdaptationSet
 * @typedef {import('../../../core/types.js').Representation} Representation
 * @typedef {import('../../../core/types.js').SubRepresentation} SubRepresentation
 * @typedef {import('../../../core/types.js').Descriptor} Descriptor
 * @typedef {import('../../../core/types.js').ContentComponent} ContentComponent
 */

import { getDrmSystemName } from '../../../shared/utils/drm.js';
import { parseDuration } from '../../../shared/utils/time.js';
import { generateDashSummary } from './summary-generator.js';
import {
    getAttr,
    findChild,
    findChildren,
    findChildrenRecursive,
    mergeElements,
} from './recursive-parser.js';

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
        codecs: getAttr(mergedEl, 'codecs'),
        mimeType: getAttr(mergedEl, 'mimeType'),
        profiles: getAttr(mergedEl, 'profiles'),
        width: getAttr(mergedEl, 'width')
            ? parseInt(getAttr(mergedEl, 'width'), 10)
            : null,
        height: getAttr(mergedEl, 'height')
            ? parseInt(getAttr(mergedEl, 'height'), 10)
            : null,
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
        codecs: getAttr(mergedRepEl, 'codecs'),
        mimeType: getAttr(mergedRepEl, 'mimeType'),
        profiles: getAttr(mergedRepEl, 'profiles'),
        width: getAttr(mergedRepEl, 'width')
            ? parseInt(getAttr(mergedRepEl, 'width'), 10)
            : null,
        height: getAttr(mergedRepEl, 'height')
            ? parseInt(getAttr(mergedRepEl, 'height'), 10)
            : null,
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
        failoverContent: null,
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
        labels: findChildren(mergedRepEl, 'Label').map((el) => ({
            id: getAttr(el, 'id'),
            lang: getAttr(el, 'lang'),
            text: getText(el),
        })),
        groupLabels: findChildren(mergedRepEl, 'GroupLabel').map((el) => ({
            id: getAttr(el, 'id'),
            lang: getAttr(el, 'lang'),
            text: getText(el),
        })),
        subRepresentations: findChildren(repEl, 'SubRepresentation').map(
            (subRepEl) => parseSubRepresentation(subRepEl, mergedRepEl)
        ),
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
                contentType:
                    getAttr(asEl, 'contentType') ||
                    getAttr(asEl, 'mimeType')?.split('/')[0],
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
        contentType:
            getAttr(asEl, 'contentType') ||
            getAttr(asEl, 'mimeType')?.split('/')[0],
        bitstreamSwitching:
            getAttr(asEl, 'bitstreamSwitching') === 'true' ? true : null,
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
            (cpEl) => ({
                schemeIdUri: getAttr(cpEl, 'schemeIdUri'),
                system: getDrmSystemName(getAttr(cpEl, 'schemeIdUri')),
                defaultKid: getAttr(cpEl, 'cenc:default_KID'),
            })
        ),
        framePackings: findChildren(mergedAsEl, 'FramePacking').map(
            parseGenericDescriptor
        ),
        ratings: findChildren(mergedAsEl, 'Rating').map(parseGenericDescriptor),
        viewpoints: findChildren(mergedAsEl, 'Viewpoint').map(
            parseGenericDescriptor
        ),
        accessibility: findChildren(mergedAsEl, 'Accessibility').map(
            parseGenericDescriptor
        ),
        labels: findChildren(mergedAsEl, 'Label').map((el) => ({
            id: getAttr(el, 'id'),
            lang: getAttr(el, 'lang'),
            text: getText(el),
        })),
        groupLabels: findChildren(mergedAsEl, 'GroupLabel').map((el) => ({
            id: getAttr(el, 'id'),
            lang: getAttr(el, 'lang'),
            text: getText(el),
        })),
        roles: findChildren(mergedAsEl, 'Role').map(parseGenericDescriptor),
        contentComponents: contentComponents,
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

function parsePeriod(periodEl, parentMergedEl) {
    const mergedPeriodEl = mergeElements(parentMergedEl, periodEl);
    const assetIdentifierEl = findChild(periodEl, 'AssetIdentifier');
    const subsets = findChildren(periodEl, 'Subset');
    const eventStreams = findChildren(periodEl, 'EventStream');
    const periodStart = parseDuration(getAttr(periodEl, 'start')) || 0;

    const allEvents = [];
    const eventStreamIRs = eventStreams.map((esEl) => {
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
                periodStart + (presentationTime - presentationTimeOffset) / timescale;
            const eventDuration = duration / timescale;

            return {
                startTime,
                duration: eventDuration,
                message: getText(eEl) || getAttr(eEl, 'messageData'),
                messageData: getAttr(eEl, 'messageData'),
                type: 'dash-event',
            };
        });

        allEvents.push(...events);

        return {
            schemeIdUri: getAttr(esEl, 'schemeIdUri'),
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
 * @returns {Manifest} The manifest IR object.
 */
export function adaptDashToIr(manifestElement, baseUrl) {
    const manifestCopy = deepClone(manifestElement);

    const adaptationSets = findChildrenRecursive(manifestCopy, 'AdaptationSet');
    const hasTsMimeType = adaptationSets.some(
        (as) => getAttr(as, 'mimeType') === 'video/mp2t'
    );

    let segmentFormat = 'unknown';
    if (hasTsMimeType) {
        segmentFormat = 'ts';
    } else if (
        findChildrenRecursive(manifestCopy, 'SegmentTimeline').length > 0 ||
        findChildrenRecursive(manifestCopy, 'SegmentTemplate').length > 0 ||
        findChildrenRecursive(manifestCopy, 'SegmentList').length > 0
    ) {
        segmentFormat = 'isobmff';
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
        periods: findChildren(manifestCopy, 'Period').map((p) =>
            parsePeriod(p, manifestCopy)
        ),
        segmentFormat: /** @type {'isobmff' | 'ts' | 'unknown'} */ (
            segmentFormat
        ),
        serializedManifest: manifestElement,
        metrics: [],
        events: [],
        summary: null,
        serverControl: null,
    };

    manifestIR.events = manifestIR.periods.flatMap((p) => p.events);
    manifestIR.summary = generateDashSummary(manifestIR, manifestCopy);

    return manifestIR;
}