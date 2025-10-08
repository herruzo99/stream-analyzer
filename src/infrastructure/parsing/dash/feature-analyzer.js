import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm.js';
import { getAttr, findChildrenRecursive } from './recursive-parser.js';

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
        if (count === 0) {
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
        details: `<code>${getAttr(manifestObj, 'type')}</code>`,
    }),
    'MPD Locations': createCountCheck(
        'Location',
        'location',
        'locations provided'
    ),
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
    'Client Authentication': createCheck(
        'EssentialProperty',
        () => 'Signals requirement for client authentication.',
        ''
    ),
    'Content Authorization': createCheck(
        'SupplementalProperty',
        () => 'Signals requirement for content authorization.',
        ''
    ),
    'Segment Templates': createCheck(
        'SegmentTemplate',
        () => 'Uses templates for segment URL generation.',
        ''
    ),
    'Segment Timeline': createCheck(
        'SegmentTimeline',
        () =>
            'Provides explicit segment timing via <code>&lt;S&gt;</code> elements.',
        ''
    ),
    'Segment List': createCheck(
        'SegmentList',
        () => 'Provides an explicit list of segment URLs.',
        ''
    ),
    'Representation Index': createCountCheck(
        'RepresentationIndex',
        'representation index',
        'representation indices'
    ),
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
    'Associated Representations': (manifestObj) => {
        const reps = findChildrenRecursive(
            manifestObj,
            'Representation'
        ).filter((r) => getAttr(r, 'associationId'));
        if (reps.length > 0)
            return { used: true, details: `${reps.length} associations` };
        return { used: false, details: '' };
    },
    'Trick Modes': (manifestObj) => {
        const subRep = findChildRecursive(manifestObj, 'SubRepresentation');
        const trickRole = findChildrenRecursive(manifestObj, 'Role').some(
            (r) => getAttr(r, 'value') === 'trick'
        );
        if (subRep || trickRole) {
            const details = [];
            if (subRep) details.push('<code>&lt;SubRepresentation&gt;</code>');
            if (trickRole) details.push('<code>Role="trick"</code>');
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
    'Role Descriptors': (manifestObj) => {
        const roles = findChildrenRecursive(manifestObj, 'Role');
        if (roles.length > 0) {
            const roleValues = [
                ...new Set(
                    roles.map(
                        (role) => `<code>${getAttr(role, 'value')}</code>`
                    )
                ),
            ];
            return {
                used: true,
                details: `Roles found: ${roleValues.join(', ')}`,
            };
        }
        return { used: false, details: 'No roles specified.' };
    },
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
