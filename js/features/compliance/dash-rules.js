/**
 * @typedef {'error' | 'warn' | 'info' | 'pass' | 'fail'} CheckStatus
 */

/**
 * @typedef {'Manifest Structure' | 'Live Stream Properties' | 'Segment & Timing Info' | 'Profile Conformance' | 'General Best Practices'} RuleCategory
 */

/**
 * @typedef {'MPD' | 'Period' | 'AdaptationSet' | 'Representation'} RuleScope
 */

/**
 * @typedef {object} Rule
 * @property {string} id - A unique identifier for the rule.
 * @property {string} text - The human-readable title of the check.
 * @property {string} isoRef - The reference to the ISO/IEC 23009-1:2022 standard clause.
 * @property {CheckStatus} severity - The status to assign if the check fails ('fail' or 'warn').
 * @property {RuleScope} scope - The MPD element level this rule applies to.
 * @property {RuleCategory} category - The category for grouping in the report.
 * @property {(element: Element, context: object) => boolean | 'skip'} check - The function that performs the validation. Returns `true` for pass, `false` for fail/warn, or `'skip'` if not applicable.
 * @property {string | ((element: Element, context: object) => string)} passDetails - Details for a passing check.
 * @property {string | ((element: Element, context: object) => string)} failDetails - Details for a failing or warning check.
 */

/** @type {Rule[]} */
export const rules = [
    // --- MPD Level Rules ---
    {
        id: 'MPD-1',
        text: 'MPD root element must exist',
        isoRef: 'Clause 5.3.1.2',
        severity: 'fail',
        scope: 'MPD',
        category: 'Manifest Structure',
        check: (mpd) => !!mpd,
        passDetails: 'OK',
        failDetails:
            'The document could not be parsed or does not contain an MPD root element.',
    },
    {
        id: 'MPD-2',
        text: 'MPD@profiles is mandatory',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        category: 'Manifest Structure',
        check: (mpd) =>
            mpd.hasAttribute('profiles') && mpd.getAttribute('profiles') !== '',
        passDetails: 'OK',
        failDetails:
            'The @profiles attribute is mandatory and must not be empty.',
    },
    {
        id: 'MPD-3',
        text: 'MPD@minBufferTime is mandatory',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        category: 'Manifest Structure',
        check: (mpd) => mpd.hasAttribute('minBufferTime'),
        passDetails: 'OK',
        failDetails: 'The @minBufferTime attribute is mandatory.',
    },

    // --- Dynamic (Live) MPD Rules ---
    {
        id: 'LIVE-1',
        text: 'Dynamic MPD has @availabilityStartTime',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        category: 'Live Stream Properties',
        check: (mpd, { isDynamic }) =>
            isDynamic ? mpd.hasAttribute('availabilityStartTime') : 'skip',
        passDetails: 'OK',
        failDetails: 'Required for dynamic MPDs.',
    },
    {
        id: 'LIVE-2',
        text: 'Dynamic MPD has @publishTime',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        category: 'Live Stream Properties',
        check: (mpd, { isDynamic }) =>
            isDynamic ? mpd.hasAttribute('publishTime') : 'skip',
        passDetails: 'OK',
        failDetails: 'Required for dynamic MPDs.',
    },
    {
        id: 'LIVE-3',
        text: 'Dynamic MPD has @minimumUpdatePeriod',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'warn',
        scope: 'MPD',
        category: 'Live Stream Properties',
        check: (mpd, { isDynamic }) =>
            isDynamic ? mpd.hasAttribute('minimumUpdatePeriod') : 'skip',
        passDetails: 'OK',
        failDetails: 'Recommended for dynamic MPDs to signal update frequency.',
    },

    // --- Static (VOD) MPD Rules ---
    {
        id: 'STATIC-1',
        text: 'Static MPD has a defined duration',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        category: 'Manifest Structure',
        check: (mpd, { isDynamic }) => {
            if (isDynamic) return 'skip';
            const hasMpdDuration = mpd.hasAttribute(
                'mediaPresentationDuration'
            );
            const lastPeriod = mpd.querySelector('Period:last-of-type');
            const lastPeriodHasDuration = lastPeriod
                ? lastPeriod.hasAttribute('duration')
                : false;
            return hasMpdDuration || lastPeriodHasDuration;
        },
        passDetails: 'OK',
        failDetails:
            'Static MPDs must have @mediaPresentationDuration or the last Period must have a @duration.',
    },
    {
        id: 'STATIC-2',
        text: 'Static MPD does not have @minimumUpdatePeriod',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        category: 'Manifest Structure',
        check: (mpd, { isDynamic }) =>
            isDynamic ? 'skip' : !mpd.hasAttribute('minimumUpdatePeriod'),
        passDetails: 'OK',
        failDetails: 'Should not be present for static MPDs.',
    },
    {
        id: 'STATIC-3',
        text: 'Static MPD does not have @timeShiftBufferDepth',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        category: 'Manifest Structure',
        check: (mpd, { isDynamic }) =>
            isDynamic ? 'skip' : !mpd.hasAttribute('timeShiftBufferDepth'),
        passDetails: 'OK',
        failDetails: 'Should not be present for static MPDs.',
    },

    // --- Period Rules ---
    {
        id: 'PERIOD-1',
        text: 'Dynamic Period has @id',
        isoRef: 'Clause 5.3.2.2, Table 4',
        severity: 'fail',
        scope: 'Period',
        category: 'Live Stream Properties',
        check: (period, { isDynamic }) =>
            isDynamic ? period.hasAttribute('id') : 'skip',
        passDetails: 'OK',
        failDetails: (period) =>
            `Period (start="${period.getAttribute('start')}") requires an @id in dynamic manifests.`,
    },
    {
        id: 'PERIOD-2',
        text: 'Period contains at least one AdaptationSet',
        isoRef: 'Clause 5.3.2.2, Table 4',
        severity: 'warn',
        scope: 'Period',
        category: 'Manifest Structure',
        check: (period) => {
            const duration = period.getAttribute('duration');
            return (
                period.querySelectorAll('AdaptationSet').length > 0 ||
                duration === 'PT0S' ||
                duration === '0'
            );
        },
        passDetails: 'OK',
        failDetails:
            'A Period should contain at least one AdaptationSet unless its duration is 0.',
    },

    // --- AdaptationSet Rules ---
    {
        id: 'AS-1',
        text: 'AdaptationSet has @contentType or @mimeType',
        isoRef: 'Clause 5.3.3.2, Table 5',
        severity: 'warn',
        scope: 'AdaptationSet',
        category: 'General Best Practices',
        check: (as) =>
            as.hasAttribute('contentType') || as.hasAttribute('mimeType'),
        passDetails: 'OK',
        failDetails: 'Recommended for clear track identification.',
    },
    {
        id: 'AS-2',
        text: 'AdaptationSet with multiple Representations uses Segment Alignment',
        isoRef: 'Clause 5.3.3.2, Table 5',
        severity: 'warn',
        scope: 'AdaptationSet',
        category: 'General Best Practices',
        check: (as) =>
            as.querySelectorAll('Representation').length > 1
                ? as.getAttribute('segmentAlignment') === 'true'
                : 'skip',
        passDetails: 'OK',
        failDetails: 'Recommended for seamless ABR switching.',
    },

    // --- Representation Rules ---
    {
        id: 'REP-1',
        text: 'Representation has mandatory @id',
        isoRef: 'Clause 5.3.5.2, Table 9',
        severity: 'fail',
        scope: 'Representation',
        category: 'Manifest Structure',
        check: (rep) => rep.hasAttribute('id'),
        passDetails: 'OK',
        failDetails: 'Representation @id is mandatory.',
    },
    {
        id: 'REP-2',
        text: 'Representation has mandatory @bandwidth',
        isoRef: 'Clause 5.3.5.2, Table 9',
        severity: 'fail',
        scope: 'Representation',
        category: 'Manifest Structure',
        check: (rep) => rep.hasAttribute('bandwidth'),
        passDetails: 'OK',
        failDetails: 'Representation @bandwidth is mandatory.',
    },
    {
        id: 'REP-3',
        text: 'Representation has an effective @mimeType',
        isoRef: 'Clause 5.3.7.2, Table 14',
        severity: 'fail',
        scope: 'Representation',
        category: 'Manifest Structure',
        check: (rep) =>
            rep.hasAttribute('mimeType') ||
            rep.closest('AdaptationSet').hasAttribute('mimeType'),
        passDetails: 'OK',
        failDetails:
            'Representation @mimeType must be present on the Representation or inherited from the AdaptationSet.',
    },
    {
        id: 'REP-4',
        text: 'Representation @dependencyId is valid',
        isoRef: 'Clause 5.3.5.2, Table 9',
        severity: 'warn',
        scope: 'Representation',
        category: 'Manifest Structure',
        check: (rep, { allRepIdsInPeriod }) => {
            const dependencyId = rep.getAttribute('dependencyId');
            if (!dependencyId) return 'skip';
            return dependencyId
                .split(' ')
                .every((id) => allRepIdsInPeriod.has(id));
        },
        passDetails: 'OK',
        failDetails: (rep) =>
            `One or more IDs in @dependencyId="${rep.getAttribute('dependencyId')}" do not exist in this Period.`,
    },

    // --- Segment Info Rules ---
    {
        id: 'SEGMENT-1',
        text: 'Representation has exactly one segment information type',
        isoRef: 'Clause 5.3.9.1',
        severity: 'fail',
        scope: 'Representation',
        category: 'Segment & Timing Info',
        check: (rep) => {
            const elements = [
                rep.querySelector(':scope > SegmentBase'),
                rep.querySelector(':scope > SegmentList'),
                rep.querySelector(':scope > SegmentTemplate'),
            ];
            return elements.filter(Boolean).length <= 1;
        },
        passDetails: 'OK',
        failDetails:
            'A Representation can only contain one of SegmentBase, SegmentList, or SegmentTemplate directly.',
    },
    {
        id: 'SEGMENT-2',
        text: 'SegmentTemplate with $Number$ has duration info',
        isoRef: 'Clause 5.3.9.5.3',
        severity: 'fail',
        scope: 'Representation',
        category: 'Segment & Timing Info',
        check: (rep) => {
            const template =
                rep.querySelector('SegmentTemplate') ||
                rep.closest('AdaptationSet').querySelector('SegmentTemplate') ||
                rep.closest('Period').querySelector('SegmentTemplate');
            if (
                !template ||
                !template.getAttribute('media')?.includes('$Number$')
            )
                return 'skip';
            return (
                template.hasAttribute('duration') ||
                !!template.querySelector('SegmentTimeline')
            );
        },
        passDetails: 'OK',
        failDetails:
            'When using $Number$, either @duration must be specified or a SegmentTimeline must be present.',
    },
    {
        id: 'SEGMENT-3',
        text: 'SegmentTemplate with $Time$ has SegmentTimeline',
        isoRef: 'Clause 5.3.9.4.4, Table 21',
        severity: 'fail',
        scope: 'Representation',
        category: 'Segment & Timing Info',
        check: (rep) => {
            const template =
                rep.querySelector('SegmentTemplate') ||
                rep.closest('AdaptationSet').querySelector('SegmentTemplate') ||
                rep.closest('Period').querySelector('SegmentTemplate');
            if (
                !template ||
                !template.getAttribute('media')?.includes('$Time$')
            )
                return 'skip';
            return !!template.querySelector('SegmentTimeline');
        },
        passDetails: 'OK',
        failDetails: 'When using $Time$, a SegmentTimeline must be present.',
    },

    // --- Profile: ISO BMFF On-Demand ---
    {
        id: 'PROFILE-ONDEMAND-1',
        text: 'On-Demand profile requires MPD@type="static"',
        isoRef: 'Clause 8.3.2',
        severity: 'fail',
        scope: 'MPD',
        category: 'Profile Conformance',
        check: (mpd, { profiles }) => {
            if (
                !profiles.includes('urn:mpeg:dash:profile:isoff-on-demand:2011')
            )
                return 'skip';
            return mpd.getAttribute('type') === 'static';
        },
        passDetails: 'OK',
        failDetails: (mpd) =>
            `Profile requires 'static', but found '${mpd.getAttribute('type')}'`,
    },

    // --- Profile: ISO BMFF Live ---
    {
        id: 'PROFILE-LIVE-1',
        text: 'Live profile requires SegmentTemplate',
        isoRef: 'Clause 8.4.2',
        severity: 'fail',
        scope: 'Representation',
        category: 'Profile Conformance',
        check: (rep, { profiles }) => {
            if (!profiles.includes('urn:mpeg:dash:profile:isoff-live:2011'))
                return 'skip';
            return !!(
                rep.querySelector('SegmentTemplate') ||
                rep.closest('AdaptationSet').querySelector('SegmentTemplate') ||
                rep.closest('Period').querySelector('SegmentTemplate')
            );
        },
        passDetails: 'OK',
        failDetails: 'SegmentTemplate must be used in this profile.',
    },

    // --- Profile: DASH-CMAF ---
    {
        id: 'PROFILE-CMAF-1',
        text: "CMAF profile requires 'cmfc' or 'cmf2' brand",
        isoRef: 'Clause 8.12.4.3',
        severity: 'fail',
        scope: 'AdaptationSet',
        category: 'Profile Conformance',
        check: (as, { profiles }) => {
            if (!profiles.includes('urn:mpeg:dash:profile:cmaf:2019'))
                return 'skip';
            const mimeType = as.getAttribute('mimeType');
            if (mimeType !== 'video/mp4' && mimeType !== 'audio/mp4')
                return 'skip';
            const containerProfiles =
                as.getAttribute('containerProfiles') || '';
            return (
                containerProfiles.includes('cmfc') ||
                containerProfiles.includes('cmf2')
            );
        },
        passDetails: 'OK',
        failDetails:
            'AdaptationSet is missing a CMAF structural brand in @containerProfiles.',
    },
];