import { findChildren, getAttr } from '../../utils/recursive-parser.js';

/** @typedef {import('./index.js').Rule} Rule */

/** @type {Rule[]} */
export const structureRules = [
    {
        id: 'MPD-1',
        text: 'MPD root element must exist',
        isoRef: 'Clause 5.3.1.2',
        severity: 'fail',
        scope: 'MPD',
        profiles: ['common'],
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
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (mpd) =>
            getAttr(mpd, 'profiles') !== undefined &&
            getAttr(mpd, 'profiles') !== '',
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
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (mpd) => getAttr(mpd, 'minBufferTime') !== undefined,
        passDetails: 'OK',
        failDetails: 'The @minBufferTime attribute is mandatory.',
    },
    {
        id: 'MPD-4',
        text: 'MPD@type is mandatory',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (mpd) =>
            getAttr(mpd, 'type') === 'static' ||
            getAttr(mpd, 'type') === 'dynamic',
        passDetails: 'OK',
        failDetails:
            'The @type attribute is mandatory and must be either "static" or "dynamic".',
    },
    {
        id: 'MPD-5',
        text: 'Multiple BaseURLs require @serviceLocation',
        isoRef: 'Clause 5.6.4',
        severity: 'warn',
        scope: 'MPD',
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (mpd) => {
            const baseUrls = findChildren(mpd, 'BaseURL');
            if (baseUrls.length <= 1) return true;
            return baseUrls.every((b) => getAttr(b, 'serviceLocation'));
        },
        passDetails: 'OK',
        failDetails:
            'When multiple BaseURL elements are present, they should use @serviceLocation for deduplication and failover logic.',
    },
    {
        id: 'STATIC-1',
        text: 'Static MPD has a defined duration',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        profiles: ['isoff-on-demand:2011', 'common'],
        category: 'Manifest Structure',
        check: (mpd, { isDynamic }) => {
            if (isDynamic) return 'skip';
            const hasMpdDuration =
                getAttr(mpd, 'mediaPresentationDuration') !== undefined;
            const periods = findChildren(mpd, 'Period');
            const lastPeriod = periods[periods.length - 1];
            const lastPeriodHasDuration = lastPeriod
                ? getAttr(lastPeriod, 'duration') !== undefined
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
        profiles: ['isoff-on-demand:2011', 'common'],
        category: 'Manifest Structure',
        check: (mpd, { isDynamic }) =>
            isDynamic
                ? 'skip'
                : getAttr(mpd, 'minimumUpdatePeriod') === undefined,
        passDetails: 'OK',
        failDetails: 'Should not be present for static MPDs.',
    },
    {
        id: 'STATIC-3',
        text: 'Static MPD does not have @timeShiftBufferDepth',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        profiles: ['isoff-on-demand:2011', 'common'],
        category: 'Manifest Structure',
        check: (mpd, { isDynamic }) =>
            isDynamic
                ? 'skip'
                : getAttr(mpd, 'timeShiftBufferDepth') === undefined,
        passDetails: 'OK',
        failDetails: 'Should not be present for static MPDs.',
    },
    {
        id: 'PERIOD-2',
        text: 'Period contains at least one AdaptationSet',
        isoRef: 'Clause 5.3.2.2, Table 4',
        severity: 'warn',
        scope: 'Period',
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (period) => {
            const duration = getAttr(period, 'duration');
            return (
                findChildren(period, 'AdaptationSet').length > 0 ||
                duration === 'PT0S' ||
                duration === '0'
            );
        },
        passDetails: 'OK',
        failDetails:
            'A Period should contain at least one AdaptationSet unless its duration is 0.',
    },
    {
        id: 'PERIOD-3',
        text: 'EventStream requires @schemeIdUri',
        isoRef: 'Clause 5.10.2, Table 24',
        severity: 'fail',
        scope: 'Period',
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (period) => {
            const eventStreams = findChildren(period, 'EventStream');
            if (eventStreams.length === 0) return 'skip';
            return eventStreams.every((es) => getAttr(es, 'schemeIdUri'));
        },
        passDetails: 'OK',
        failDetails:
            'All EventStream elements must have a schemeIdUri attribute.',
    },
    {
        id: 'REP-1',
        text: 'Representation has mandatory @id',
        isoRef: 'Clause 5.3.5.2, Table 9',
        severity: 'fail',
        scope: 'Representation',
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (rep) => getAttr(rep, 'id') !== undefined,
        passDetails: 'OK',
        failDetails: 'Representation @id is mandatory.',
    },
    {
        id: 'REP-2',
        text: 'Representation has mandatory @bandwidth',
        isoRef: 'Clause 5.3.5.2, Table 9',
        severity: 'fail',
        scope: 'Representation',
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (rep) => getAttr(rep, 'bandwidth') !== undefined,
        passDetails: 'OK',
        failDetails: 'Representation @bandwidth is mandatory.',
    },
    {
        id: 'REP-3',
        text: 'Representation has an effective @mimeType',
        isoRef: 'Clause 5.3.7.2, Table 14',
        severity: 'fail',
        scope: 'Representation',
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (rep, { adaptationSet }) =>
            getAttr(rep, 'mimeType') !== undefined ||
            getAttr(adaptationSet, 'mimeType') !== undefined,
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
        profiles: ['common'],
        category: 'Manifest Structure',
        check: (rep, { allRepIdsInPeriod }) => {
            const dependencyId = getAttr(rep, 'dependencyId');
            if (!dependencyId) return 'skip';
            return dependencyId
                .split(' ')
                .every((id) => allRepIdsInPeriod.has(id));
        },
        passDetails: 'OK',
        failDetails: (rep) =>
            `One or more IDs in @dependencyId="${getAttr(rep, 'dependencyId')}" do not exist in this Period.`,
    },
];