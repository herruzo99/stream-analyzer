import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import { findChildrenRecursive, getAttr } from '../utils/recursive-parser.js';

/**
 * @typedef {object} FeatureCheckResult
 * @property {boolean} used
 * @property {string} details
 */

// Local helper to get the first result from the recursive search.
const findChildRecursive = (element, tagName) =>
    findChildrenRecursive(element, tagName)[0];

const createCheck = (tagName, usedDetails, notUsedDetails) => {
    return (manifestObj) => {
        const element = findChildRecursive(manifestObj, tagName);
        return {
            used: !!element,
            details: element ? usedDetails(element) : notUsedDetails,
        };
    };
};

const createCountCheck = (tagName, singular, plural) => {
    return (manifestObj) => {
        const elements = findChildrenRecursive(manifestObj, tagName);
        const count = elements.length;
        if (count <= 1) {
            return { used: false, details: '' };
        }
        const noun = count === 1 ? singular : plural;
        return {
            used: true,
            details: `${count} ${noun} found.`,
        };
    };
};

const featureChecks = {
    'Presentation Type': (manifestObj) => ({
        used: true,
        details: `<code>${getAttr(manifestObj, 'type') || 'static (inferred)'}</code>`,
    }),
    'MPD Location Signaling': createCountCheck(
        'Location',
        'location',
        'locations'
    ),
    'CDN Redundancy': (manifestObj) => {
        const baseUrls = findChildrenRecursive(manifestObj, 'BaseURL');
        // A simple check: if there are multiple BaseURLs at the same level, redundancy is likely.
        // Or just total BaseURLs > 1 implies some form of alternative source.
        // We'll refine to check if they are siblings, but simple count is a good heuristic.
        const count = baseUrls.length;
        return {
            used: count > 1,
            details:
                count > 1 ? `${count} BaseURLs detected.` : 'Single BaseURL.',
        };
    },
    'Scoped Profiles': (manifestObj) => {
        const adaptationSets = findChildrenRecursive(
            manifestObj,
            'AdaptationSet'
        );
        const representations = findChildrenRecursive(
            manifestObj,
            'Representation'
        );
        const count =
            adaptationSets.filter((as) => getAttr(as, 'profiles')).length +
            representations.filter((r) => getAttr(r, 'profiles')).length;

        if (count === 0) return { used: false, details: '' };
        const noun = count === 1 ? 'scoped profile' : 'scoped profiles';
        return { used: true, details: `${count} ${noun}` };
    },
    'Multi-Period': createCountCheck('Period', 'Period', 'Periods'),
    'Content Protection': (manifestObj) => {
        const protection = findChildrenRecursive(
            manifestObj,
            'ContentProtection'
        );
        if (protection.length > 0) {
            const schemes = [
                ...new Set(
                    protection.map((cp) =>
                        getDrmSystemName(getAttr(cp, 'schemeIdUri'))
                    )
                ),
            ];
            return {
                used: true,
                details: `Systems: <b>${schemes.join(', ')}</b>`,
            };
        }
        return { used: false, details: 'No encryption descriptors found.' };
    },
    'Segment Templates': createCheck(
        'SegmentTemplate',
        () => 'Uses templates for segment URL generation.',
        ''
    ),
    'Segment Timeline': (manifestObj) => {
        const timelines = findChildrenRecursive(manifestObj, 'SegmentTimeline');
        // It's only "used" if it actually contains S elements.
        const used = timelines.some((tl) => findChildRecursive(tl, 'S'));
        return {
            used,
            details: used
                ? 'Timeline with <code>&lt;S&gt;</code> elements found.'
                : '',
        };
    },
    'Segment List': createCheck(
        'SegmentList',
        () => 'Provides an explicit list of segment URLs.',
        ''
    ),
    'Representation Index': (manifestObj) => {
        const repIndex = findChildRecursive(manifestObj, 'RepresentationIndex');
        if (repIndex)
            return {
                used: true,
                details: '<RepresentationIndex> element found.',
            };

        // Also check for indexRange attribute on SegmentBase (On-Demand Profile style)
        const segBase = findChildrenRecursive(manifestObj, 'SegmentBase');
        const hasIndexRange = segBase.some((sb) => getAttr(sb, 'indexRange'));

        if (hasIndexRange)
            return {
                used: true,
                details:
                    '<code>indexRange</code> attribute found on SegmentBase.',
            };

        return { used: false, details: '' };
    },
    'Low Latency Streaming': (manifestObj) => {
        if (getAttr(manifestObj, 'type') !== 'dynamic') {
            return { used: false, details: 'Not a dynamic (live) manifest.' };
        }
        const hasLatency = !!findChildRecursive(manifestObj, 'Latency');
        const allTemplates = findChildrenRecursive(
            manifestObj,
            'SegmentTemplate'
        );
        const hasChunkHint = allTemplates.some(
            (t) => getAttr(t, 'availabilityTimeComplete') === 'false'
        );

        if (hasLatency || hasChunkHint) {
            const details = [];
            if (hasLatency)
                details.push('<code>&lt;Latency&gt;</code> target defined.');
            if (hasChunkHint) details.push('Chunked transfer hint present.');
            return { used: true, details: details.join(' ') };
        }
        return {
            used: false,
            details: 'No specific low-latency signals found.',
        };
    },
    'Manifest Patch Updates': createCheck(
        'PatchLocation',
        (el) => `Patch location: <code>${el['#text']?.trim()}</code>`,
        'Uses full manifest reloads.'
    ),
    'Content Steering': createCheck(
        'ContentSteering',
        (el) =>
            `Steering ID: <code>${getAttr(el, 'defaultServiceLocation')}</code>`,
        'No content steering found.'
    ),
    Preselections: createCountCheck(
        'Preselection',
        'Preselection',
        'Preselections'
    ),
    'Failover Content': createCheck(
        'FailoverContent',
        () => 'Signals available failover content.',
        ''
    ),
    'UTC Timing Source': (manifestObj) => {
        const utcTimings = findChildrenRecursive(manifestObj, 'UTCTiming');
        if (utcTimings.length > 0) {
            const schemes = [
                ...new Set(
                    utcTimings.map(
                        (el) =>
                            `<code>${getAttr(el, 'schemeIdUri')
                                .split(':')
                                .pop()}</code>`
                    )
                ),
            ];
            return { used: true, details: `Schemes: ${schemes.join(', ')}` };
        }
        return {
            used: false,
            details: 'No clock synchronization source provided.',
        };
    },
    'Dependent Representations': (manifestObj) => {
        const reps = findChildrenRecursive(
            manifestObj,
            'Representation'
        ).filter((r) => getAttr(r, 'dependencyId'));
        if (reps.length > 0)
            return {
                used: true,
                details: `${reps.length} dependent Representations`,
            };
        return { used: false, details: '' };
    },
    'Trick Modes': (manifestObj) => {
        const subRep = findChildRecursive(manifestObj, 'SubRepresentation');
        const trickRole = findChildrenRecursive(manifestObj, 'Role').some(
            (r) => getAttr(r, 'value') === 'trick'
        );
        const essentialTrick = findChildrenRecursive(
            manifestObj,
            'EssentialProperty'
        ).some(
            (ep) =>
                getAttr(ep, 'schemeIdUri') ===
                'http://dashif.org/guidelines/trickmode'
        );

        if (subRep || trickRole || essentialTrick) {
            const details = [];
            if (subRep) details.push('<code>&lt;SubRepresentation&gt;</code>');
            if (trickRole) details.push('<code>Role="trick"</code>');
            if (essentialTrick) details.push('DASH-IF Trick Mode Descriptor');
            return {
                used: true,
                details: `Detected via: ${details.join(', ')}`,
            };
        }
        return {
            used: false,
            details: 'No explicit trick mode signals found.',
        };
    },
    'Subtitles & Captions': (manifestObj) => {
        const textTracks = findChildrenRecursive(
            manifestObj,
            'AdaptationSet'
        ).filter(
            (as) =>
                getAttr(as, 'contentType') === 'text' ||
                getAttr(as, 'mimeType')?.startsWith('application')
        );
        if (textTracks.length > 0) {
            const languages = [
                ...new Set(
                    textTracks.map((as) => getAttr(as, 'lang')).filter(Boolean)
                ),
            ];
            return {
                used: true,
                details: `Found ${textTracks.length} track(s). ${
                    languages.length > 0
                        ? `Languages: <b>${languages.join(', ')}</b>`
                        : ''
                }`,
            };
        }
        return {
            used: false,
            details: 'No text or application AdaptationSets found.',
        };
    },
    'Service Description': createCheck(
        'ServiceDescription',
        () => 'Service description parameters found.',
        ''
    ),
    'Resync Points': createCheck(
        'Resync',
        () => 'Resync elements present.',
        ''
    ),
    'Bitstream Switching': (manifestObj) => {
        const period = findChildRecursive(manifestObj, 'Period');
        if (getAttr(period, 'bitstreamSwitching') === 'true') {
            return { used: true, details: 'Enabled on Period.' };
        }
        const as = findChildRecursive(manifestObj, 'AdaptationSet');
        if (getAttr(as, 'bitstreamSwitching') === 'true') {
            return { used: true, details: 'Enabled on AdaptationSet.' };
        }
        return { used: false, details: '' };
    },
    'Asset Identifier': createCheck(
        'AssetIdentifier',
        (el) => `Scheme: ${getAttr(el, 'schemeIdUri')}`,
        ''
    ),
    'Accessibility Descriptors': createCheck(
        'Accessibility',
        () => 'Accessibility descriptors present.',
        ''
    ),
    'MPD Events': createCheck(
        'EventStream',
        () => 'Uses <EventStream> for out-of-band event signaling.',
        ''
    ),
    'Inband Events': createCheck(
        'InbandEventStream',
        () => 'Uses <InbandEventStream> to signal events within segments.',
        ''
    ),
    'Essential Descriptors': createCountCheck(
        'EssentialProperty',
        'Essential Property',
        'Essential Properties'
    ),
    'Supplemental Descriptors': createCountCheck(
        'SupplementalProperty',
        'Supplemental Property',
        'Supplemental Properties'
    ),
};

/**
 * Runs a series of DASH-specific checks against a serialized manifest object.
 * @param {object} manifestObject - The serialized manifest object.
 * @returns {Record<string, FeatureCheckResult>} A map of feature names to their analysis results.
 */
export function analyzeDashFeatures(manifestObject) {
    /** @type {Record<string, FeatureCheckResult>} */
    const results = {};

    if (!manifestObject) {
        return {
            Error: {
                used: true,
                details:
                    'Serialized XML object was not found for feature analysis.',
            },
        };
    }

    for (const [name, checkFn] of Object.entries(featureChecks)) {
        try {
            results[name] = checkFn(manifestObject);
        } catch (error) {
            console.error(`Error analyzing feature "${name}":`, error);
            results[name] = { used: false, details: 'Analysis failed.' };
        }
    }

    return results;
}
