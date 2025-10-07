import { findChild, getAttr } from '../recursive-parser.js';

/** @typedef {import('./index.js').Rule} Rule */

/** @type {Rule[]} */
export const profileRules = [
    {
        id: 'PROFILE-ONDEMAND-1',
        text: 'On-Demand profile requires MPD@type="static"',
        isoRef: 'Clause 8.3.2',
        severity: 'fail',
        scope: 'MPD',
        profiles: ['isoff-on-demand:2011'],
        category: 'Profile Conformance',
        check: (mpd) => getAttr(mpd, 'type') === 'static',
        passDetails: 'OK',
        failDetails: (mpd) =>
            `Profile requires 'static', but found '${getAttr(mpd, 'type')}'`,
    },
    {
        id: 'PROFILE-LIVE-1',
        text: 'Live profile requires SegmentTemplate',
        isoRef: 'Clause 8.4.2',
        severity: 'fail',
        scope: 'Representation',
        profiles: ['isoff-live:2011'],
        category: 'Profile Conformance',
        check: (rep, { adaptationSet, period }) =>
            !!(
                findChild(rep, 'SegmentTemplate') ||
                findChild(adaptationSet, 'SegmentTemplate') ||
                findChild(period, 'SegmentTemplate')
            ),
        passDetails: 'OK',
        failDetails: 'SegmentTemplate must be used in this profile.',
    },
    {
        id: 'PROFILE-CMAF-1',
        text: "CMAF profile requires 'cmfc' or 'cmf2' brand",
        isoRef: 'Clause 8.12.4.3',
        severity: 'fail',
        scope: 'AdaptationSet',
        profiles: ['cmaf:2019'],
        category: 'Profile Conformance',
        check: (as) => {
            const mimeType = getAttr(as, 'mimeType');
            if (mimeType !== 'video/mp4' && mimeType !== 'audio/mp4')
                return 'skip';
            const containerProfiles = getAttr(as, 'containerProfiles') || '';
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