/**
 * @typedef {import('../../../core/state.js').Manifest} Manifest
 * @typedef {import('../../../core/state.js').Period} Period
 * @typedef {import('../../../core/state.js').AdaptationSet} AdaptationSet
 * @typedef {import('../../../core/state.js').Representation} Representation
 */

import { getDrmSystemName } from '../../../shared/utils/drm.js';
import { parseDuration } from '../../../shared/utils/time.js';
import { generateDashSummary } from '../../../ui/views/summary/dash-summary.js';
import {
    getAttr,
    findChild,
    findChildren,
    findChildrenRecursive,
} from './recursive-parser.js';

const getText = (el) => el?.['#text'] || null;

/**
 * Transforms a serialized DASH manifest object into a protocol-agnostic IR.
 * @param {object} manifestElement The root MPD element, serialized.
 * @param {string} baseUrl The base URL for the manifest.
 * @returns {Manifest} The manifest IR object.
 */
export function adaptDashToIr(manifestElement, baseUrl) {
    const adaptationSets = findChildrenRecursive(
        manifestElement,
        'AdaptationSet'
    );
    const hasTsMimeType = adaptationSets.some(
        (as) => getAttr(as, 'mimeType') === 'video/mp2t'
    );

    let segmentFormat = 'unknown';
    if (hasTsMimeType) {
        segmentFormat = 'ts';
    } else if (
        findChildrenRecursive(manifestElement, 'SegmentTimeline').length > 0 ||
        findChildrenRecursive(manifestElement, 'SegmentTemplate').length > 0 ||
        findChildrenRecursive(manifestElement, 'SegmentList').length > 0
    ) {
        segmentFormat = 'isobmff';
    }

    /** @type {Manifest} */
    const manifestIR = {
        id: getAttr(manifestElement, 'id'),
        type: getAttr(manifestElement, 'type'),
        profiles: getAttr(manifestElement, 'profiles'),
        minBufferTime: parseDuration(getAttr(manifestElement, 'minBufferTime')),
        publishTime: getAttr(manifestElement, 'publishTime')
            ? new Date(getAttr(manifestElement, 'publishTime'))
            : null,
        availabilityStartTime: getAttr(manifestElement, 'availabilityStartTime')
            ? new Date(getAttr(manifestElement, 'availabilityStartTime'))
            : null,
        timeShiftBufferDepth: parseDuration(
            getAttr(manifestElement, 'timeShiftBufferDepth')
        ),
        minimumUpdatePeriod: parseDuration(
            getAttr(manifestElement, 'minimumUpdatePeriod')
        ),
        duration: parseDuration(
            getAttr(manifestElement, 'mediaPresentationDuration')
        ),
        maxSegmentDuration: parseDuration(
            getAttr(manifestElement, 'maxSegmentDuration')
        ),
        maxSubsegmentDuration: parseDuration(
            getAttr(manifestElement, 'maxSubsegmentDuration')
        ),
        programInformations: findChildren(
            manifestElement,
            'ProgramInformation'
        ).map((el) => ({
            title: getText(findChild(el, 'Title')),
            source: getText(findChild(el, 'Source')),
            copyright: getText(findChild(el, 'Copyright')),
            lang: getAttr(el, 'lang'),
            moreInformationURL: getAttr(el, 'moreInformationURL'),
        })),
        locations: findChildren(manifestElement, 'Location').map(getText),
        periods: findChildren(manifestElement, 'Period').map(parsePeriod),
        segmentFormat: /** @type {'isobmff' | 'ts' | 'unknown'} */ (
            segmentFormat
        ),
        rawElement: manifestElement,
        metrics: [],
        events: [],
        summary: null,
        serverControl: null,
    };

    manifestIR.events = manifestIR.periods.flatMap((p) => p.events);
    manifestIR.summary = generateDashSummary(manifestIR, manifestElement);

    return manifestIR;
}

function parsePeriod(periodEl) {
    const assetIdentifierEl = findChild(periodEl, 'AssetIdentifier');
    const subsets = findChildren(periodEl, 'Subset');

    const periodIR = {
        id: getAttr(periodEl, 'id'),
        start: parseDuration(getAttr(periodEl, 'start')),
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
        adaptationSets: [],
        eventStreams: [],
        events: [],
        rawElement: periodEl, // Add raw element for context
    };

    const adaptationSets = findChildren(periodEl, 'AdaptationSet');
    periodIR.adaptationSets = adaptationSets.map((asEl) =>
        parseAdaptationSet(asEl, periodIR)
    );

    return periodIR;
}

function parseAdaptationSet(asEl, periodIR) {
    const asIR = {
        id: getAttr(asEl, 'id'),
        contentType:
            getAttr(asEl, 'contentType') ||
            getAttr(asEl, 'mimeType')?.split('/')[0],
        lang: getAttr(asEl, 'lang'),
        mimeType: getAttr(asEl, 'mimeType'),
        representations: [],
        contentProtection: [],
        roles: findChildren(asEl, 'Role').map((el) => ({
            value: getAttr(el, 'value'),
        })),
        rawElement: asEl, // Add raw element for context
        period: periodIR, // Add reference to parent period
    };

    const representations = findChildren(asEl, 'Representation');
    asIR.representations = representations.map((repEl) =>
        parseRepresentation(repEl, asIR)
    );

    const contentProtections = findChildren(asEl, 'ContentProtection');
    asIR.contentProtection = contentProtections.map((cpEl) => ({
        schemeIdUri: getAttr(cpEl, 'schemeIdUri'),
        system: getDrmSystemName(getAttr(cpEl, 'schemeIdUri')),
        defaultKid: getAttr(cpEl, 'cenc:default_KID'),
    }));

    return asIR;
}

function parseRepresentation(repEl, asIR) {
    return {
        id: getAttr(repEl, 'id'),
        bandwidth: parseInt(getAttr(repEl, 'bandwidth'), 10),
        width: parseInt(getAttr(repEl, 'width') || asIR.maxWidth, 10),
        height: parseInt(getAttr(repEl, 'height') || asIR.maxHeight, 10),
        codecs: getAttr(repEl, 'codecs') || asIR.codecs,
        mimeType: getAttr(repEl, 'mimeType') || asIR.mimeType,
        audioChannelConfigurations: findChildren(
            repEl,
            'AudioChannelConfiguration'
        ).map((el) => ({ value: getAttr(el, 'value') })),
        roles: asIR.roles,
        rawElement: repEl,
    };
}