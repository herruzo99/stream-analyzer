import { getDrmSystemName } from '../../../shared/utils/drm.js';

/**
 * @typedef {object} FeatureCheckResult
 * @property {boolean} used
 * @property {string} details
 */

// --- UTILITIES FOR TRAVERSING THE SERIALIZED DOM OBJECT ---
const findChildrenRecursive = (elements, tagName) => {
    if (!elements) return [];
    let results = [];
    for (const el of elements) {
        if (el.type !== 'element') continue;
        if (el.tagName === tagName) {
            results.push(el);
        }
        if (el.children?.length > 0) {
            results = results.concat(
                findChildrenRecursive(el.children, tagName)
            );
        }
    }
    return results;
};

const findChildRecursive = (elements, tagName) => {
    if (!elements) return null;
    for (const el of elements) {
        if (el.type !== 'element') continue;
        if (el.tagName === tagName) return el;
        if (el.children?.length > 0) {
            const found = findChildRecursive(el.children, tagName);
            if (found) return found;
        }
    }
    return null;
};

const createCheck = (tagName, usedDetails, notUsedDetails) => {
    return (manifestObj) => {
        const element = findChildRecursive(manifestObj.children, tagName);
        return {
            used: !!element,
            details: element ? usedDetails(element) : notUsedDetails,
        };
    };
};

const createCountCheck = (tagName, singular, plural) => {
    return (manifestObj) => {
        const elements = findChildrenRecursive(manifestObj.children, tagName);
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
        details: `<code>${manifestObj.attributes.type}</code>`,
    }),
    'MPD Locations': createCountCheck(
        'Location',
        'location',
        'locations provided'
    ),
    'Scoped Profiles': (manifestObj) => {
        const adaptationSets = findChildrenRecursive(
            manifestObj.children,
            'AdaptationSet'
        );
        const representations = findChildrenRecursive(
            manifestObj.children,
            'Representation'
        );
        const count =
            adaptationSets.filter((as) => as.attributes.profiles).length +
            representations.filter((r) => r.attributes.profiles).length;

        if (count === 0) return { used: false, details: '' };
        const noun = count === 1 ? 'scoped profile' : 'scoped profiles';
        return { used: true, details: `${count} ${noun}` };
    },
    'Multi-Period': createCountCheck('Period', 'Period', 'Periods'),
    'Content Protection': (manifestObj) => {
        const protection = findChildrenRecursive(
            manifestObj.children,
            'ContentProtection'
        );
        if (protection.length > 0) {
            const schemes = [
                ...new Set(
                    protection.map((cp) =>
                        getDrmSystemName(cp.attributes.schemeIdUri)
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
        if (manifestObj.attributes.type !== 'dynamic') {
            return { used: false, details: 'Not a dynamic (live) manifest.' };
        }
        const hasLatency = !!findChildRecursive(
            manifestObj.children,
            'Latency'
        );
        const allTemplates = findChildrenRecursive(
            manifestObj.children,
            'SegmentTemplate'
        );
        const hasChunkHint = allTemplates.some(
            (t) => t.attributes.availabilityTimeComplete === 'false'
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
        (el) =>
            `Patch location: <code>${el.children[0]?.content.trim()}</code>`,
        'Uses full manifest reloads.'
    ),
    'UTC Timing Source': (manifestObj) => {
        const utcTimings = findChildrenRecursive(
            manifestObj.children,
            'UTCTiming'
        );
        if (utcTimings.length > 0) {
            const schemes = [
                ...new Set(
                    utcTimings.map(
                        (el) =>
                            `<code>${el.attributes.schemeIdUri.split(':').pop()}</code>`
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
            manifestObj.children,
            'Representation'
        ).filter((r) => r.attributes.dependencyId);
        if (reps.length > 0)
            return {
                used: true,
                details: `${reps.length} dependent Representations`,
            };
        return { used: false, details: '' };
    },
    'Associated Representations': (manifestObj) => {
        const reps = findChildrenRecursive(
            manifestObj.children,
            'Representation'
        ).filter((r) => r.attributes.associationId);
        if (reps.length > 0)
            return { used: true, details: `${reps.length} associations` };
        return { used: false, details: '' };
    },
    'Trick Modes': (manifestObj) => {
        const subRep = findChildRecursive(
            manifestObj.children,
            'SubRepresentation'
        );
        const trickRole = findChildrenRecursive(
            manifestObj.children,
            'Role'
        ).some((r) => r.attributes.value === 'trick');
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
            manifestObj.children,
            'AdaptationSet'
        ).filter(
            (as) =>
                as.attributes.contentType === 'text' ||
                as.attributes.mimeType?.startsWith('application')
        );
        if (textTracks.length > 0) {
            const languages = [
                ...new Set(
                    textTracks.map((as) => as.attributes.lang).filter(Boolean)
                ),
            ];
            return {
                used: true,
                details: `Found ${textTracks.length} track(s). ${languages.length > 0 ? `Languages: <b>${languages.join(', ')}</b>` : ''}`,
            };
        }
        return {
            used: false,
            details: 'No text or application AdaptationSets found.',
        };
    },
    'Role Descriptors': (manifestObj) => {
        const roles = findChildrenRecursive(manifestObj.children, 'Role');
        if (roles.length > 0) {
            const roleValues = [
                ...new Set(
                    roles.map((role) => `<code>${role.attributes.value}</code>`)
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
