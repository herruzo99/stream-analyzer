import { getDrmSystemName } from '../../shared/utils/drm.js';

/**
 * @typedef {object} FeatureCheckResult
 * @property {boolean} used
 * @property {string} details
 */

/**
 * Runs a series of DASH-specific checks against a manifest element.
 * @param {Element} manifest - The raw <MPD> element.
 * @returns {Record<string, FeatureCheckResult>} A map of feature names to their analysis results.
 */
export function analyzeDashFeatures(manifest) {
    /** @type {Record<string, FeatureCheckResult>} */
    const results = {};

    results['Presentation Type'] = {
        used: true,
        details: `<code>${manifest.getAttribute('type')}</code>`,
    };

    const periods = manifest.querySelectorAll('Period');
    results['Multi-Period (DASH) / Discontinuity (HLS)'] = {
        used: periods.length > 1,
        details:
            periods.length > 1
                ? `${periods.length} Periods found.`
                : 'Single Period manifest.',
    };

    const protection = Array.from(
        manifest.querySelectorAll('ContentProtection')
    );
    if (protection.length > 0) {
        const schemes = [
            ...new Set(
                protection.map((cp) =>
                    getDrmSystemName(cp.getAttribute('schemeIdUri'))
                )
            ),
        ];
        results['Content Protection'] = {
            used: true,
            details: `Systems: <b>${schemes.join(', ')}</b>`,
        };
    } else {
        results['Content Protection'] = {
            used: false,
            details: 'No encryption descriptors found.',
        };
    }

    results['Segment Templates (DASH)'] = {
        used: !!manifest.querySelector('SegmentTemplate'),
        details: 'Uses templates for segment URL generation.',
    };
    results['Segment Timeline (DASH)'] = {
        used: !!manifest.querySelector('SegmentTimeline'),
        details:
            'Provides explicit segment timing via <code>&lt;S&gt;</code> elements.',
    };
    results['Segment List (DASH)'] = {
        used: !!manifest.querySelector('SegmentList'),
        details: 'Provides an explicit list of segment URLs.',
    };

    if (manifest.getAttribute('type') === 'dynamic') {
        const hasLatency = !!manifest.querySelector(
            'ServiceDescription Latency'
        );
        const hasChunkHint = !!manifest.querySelector(
            'SegmentTemplate[availabilityTimeComplete="false"]'
        );
        if (hasLatency || hasChunkHint) {
            const details = [];
            if (hasLatency)
                details.push('<code>&lt;Latency&gt;</code> target defined.');
            if (hasChunkHint) details.push('Chunked transfer hint present.');
            results['Low Latency Streaming'] = {
                used: true,
                details: details.join(' '),
            };
        } else {
            results['Low Latency Streaming'] = {
                used: false,
                details: 'No specific low-latency signals found.',
            };
        }
    } else {
        results['Low Latency Streaming'] = {
            used: false,
            details: 'Not a dynamic (live) manifest.',
        };
    }

    const patchLocation = manifest.querySelector('PatchLocation');
    results['Manifest Patch Updates (DASH)'] = {
        used: !!patchLocation,
        details: patchLocation
            ? `Patch location: <code>${patchLocation.textContent.trim()}</code>`
            : 'Uses full manifest reloads.',
    };

    const utcTimings = Array.from(manifest.querySelectorAll('UTCTiming'));
    if (utcTimings.length > 0) {
        const schemes = [
            ...new Set(
                utcTimings.map(
                    (el) =>
                        `<code>${el.getAttribute('schemeIdUri').split(':').pop()}</code>`
                )
            ),
        ];
        results['UTC Timing Source (DASH)'] = {
            used: true,
            details: `Schemes: ${schemes.join(', ')}`,
        };
    } else {
        results['UTC Timing Source (DASH)'] = {
            used: false,
            details: 'No clock synchronization source provided.',
        };
    }

    const dependentReps = manifest.querySelectorAll(
        'Representation[dependencyId]'
    );
    results['Dependent Representations (DASH)'] = {
        used: dependentReps.length > 0,
        details:
            dependentReps.length > 0
                ? `${dependentReps.length} dependent Representation(s) found.`
                : 'All Representations are self-contained.',
    };

    const subRep = manifest.querySelector('SubRepresentation[maxPlayoutRate]');
    const trickRole = manifest.querySelector('AdaptationSet Role[value="trick"]');
    if (subRep || trickRole) {
        const details = [];
        if (subRep)
            details.push(
                '<code>&lt;SubRepresentation&gt;</code> with <code>@maxPlayoutRate</code>'
            );
        if (trickRole) details.push('<code>Role="trick"</code>');
        results['I-Frame Playlists / Trick Modes'] = {
            used: true,
            details: `Detected via: ${details.join(', ')}`,
        };
    } else {
        results['I-Frame Playlists / Trick Modes'] = {
            used: false,
            details: 'No explicit trick mode signals found.',
        };
    }

    const textTracks = Array.from(
        manifest.querySelectorAll(
            'AdaptationSet[contentType="text"], AdaptationSet[mimeType^="application"]'
        )
    );
    if (textTracks.length > 0) {
        const languages = [
            ...new Set(
                textTracks.map((as) => as.getAttribute('lang')).filter(Boolean)
            ),
        ];
        results['Subtitles & Captions'] = {
            used: true,
            details: `Found ${textTracks.length} track(s). ${
                languages.length > 0
                    ? `Languages: <b>${languages.join(', ')}</b>`
                    : ''
            }`,
        };
    } else {
        results['Subtitles & Captions'] = {
            used: false,
            details: 'No text or application AdaptationSets found.',
        };
    }

    const roles = Array.from(manifest.querySelectorAll('Role'));
    if (roles.length > 0) {
        const roleValues = [
            ...new Set(
                roles.map((role) => `<code>${role.getAttribute('value')}</code>`)
            ),
        ];
        results['Alternative Renditions / Roles'] = {
            used: true,
            details: `Roles found: ${roleValues.join(', ')}`,
        };
    } else {
        results['Alternative Renditions / Roles'] = {
            used: false,
            details: 'No roles specified.',
        };
    }

    // --- NEW CHECKS ---
    results['MPD Events (DASH)'] = {
        used: !!manifest.querySelector('Period > EventStream'),
        details: 'Uses <EventStream> for out-of-band event signaling.',
    };
    results['Inband Events (DASH)'] = {
        used: !!manifest.querySelector('InbandEventStream'),
        details: 'Uses <InbandEventStream> to signal events within segments.',
    };
    const chaining = manifest.querySelector(
        'SupplementalProperty[schemeIdUri="urn:mpeg:dash:mpd-chaining:2016"]'
    );
    results['MPD Chaining (DASH)'] = {
        used: !!chaining,
        details: chaining
            ? `Chains to another MPD: <code>${chaining.getAttribute('value')}</code>`
            : 'Standard presentation end.',
    };
    results['Producer Reference Time (DASH)'] = {
        used: !!manifest.querySelector('ProducerReferenceTime'),
        details: 'Provides wall-clock production time for latency control.',
    };
    results['Service Description (DASH)'] = {
        used: !!manifest.querySelector('ServiceDescription'),
        details: 'Provides client playback guidance (latency, etc.).',
    };

    return results;
}