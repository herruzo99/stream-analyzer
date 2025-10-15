import {
    getInheritedElement,
    getAttr,
    findChildren,
} from '../recursive-parser.js';

/** @typedef {import('./index.js').Rule} Rule */

/** @type {Rule[]} */
export const segmentRules = [
    {
        id: 'SEGMENT-1',
        text: 'Representation has exactly one segment information type',
        isoRef: 'Clause 5.3.9.1',
        severity: 'fail',
        scope: 'Representation',
        profiles: ['common'],
        category: 'Segment & Timing Info',
        check: (rep) => {
            const elements = [
                findChildren(rep, 'SegmentBase')[0],
                findChildren(rep, 'SegmentList')[0],
                findChildren(rep, 'SegmentTemplate')[0],
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
        profiles: ['isoff-live:2011', 'cmaf:2019', 'isoff-on-demand:2011'],
        category: 'Segment & Timing Info',
        check: (rep, { adaptationSet, period }) => {
            const hierarchy = [rep, adaptationSet, period];
            const template = getInheritedElement('SegmentTemplate', hierarchy);
            const mediaAttr = getAttr(template, 'media');

            if (!template || !mediaAttr?.includes('$Number$')) {
                return 'skip';
            }

            const duration = getAttr(template, 'duration');
            return (
                duration !== undefined ||
                !!findChildren(template, 'SegmentTimeline')[0]
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
        profiles: ['isoff-live:2011', 'cmaf:2019'],
        category: 'Segment & Timing Info',
        check: (rep, { adaptationSet, period }) => {
            const hierarchy = [rep, adaptationSet, period];
            const template = getInheritedElement('SegmentTemplate', hierarchy);

            if (!template || !getAttr(template, 'media')?.includes('$Time$')) {
                return 'skip';
            }
            return !!findChildren(template, 'SegmentTimeline')[0];
        },
        passDetails: 'OK',
        failDetails:
            'When using $Time$, a SegmentTimeline must be present within the SegmentTemplate.',
    },
];
