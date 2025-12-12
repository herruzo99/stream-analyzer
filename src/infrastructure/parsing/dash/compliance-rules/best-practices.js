import { findChildren, getAttr } from '../../utils/recursive-parser.js';

/** @typedef {import('./index.js').Rule} Rule */

/** @type {Rule[]} */
export const bestPracticeRules = [
    {
        id: 'AS-1',
        text: 'AdaptationSet has @contentType or @mimeType',
        isoRef: 'Clause 5.3.3.2, Table 5',
        severity: 'warn',
        scope: 'AdaptationSet',
        profiles: ['common'],
        category: 'General Best Practices',
        check: (as) =>
            getAttr(as, 'contentType') !== undefined ||
            getAttr(as, 'mimeType') !== undefined,
        passDetails: 'OK',
        failDetails: 'Recommended for clear track identification.',
    },
    {
        id: 'AS-2',
        text: 'AdaptationSet with multiple Representations uses Segment Alignment',
        isoRef: 'Clause 5.3.3.2, Table 5',
        severity: 'warn',
        scope: 'AdaptationSet',
        profiles: ['common'],
        category: 'General Best Practices',
        check: (as) =>
            findChildren(as, 'Representation').length > 1
                ? getAttr(as, 'segmentAlignment') === 'true' ||
                  getAttr(as, 'segmentAlignment') === 1
                : 'skip',
        passDetails: 'OK',
        failDetails: 'Recommended for seamless ABR switching.',
    },
    {
        id: 'AS-3',
        text: 'AdaptationSet switching descriptor references valid IDs',
        isoRef: 'Clause 5.3.3.5',
        severity: 'warn',
        scope: 'AdaptationSet',
        profiles: ['common'],
        category: 'General Best Practices',
        check: (as, { period }) => {
            const supplementalProperties = findChildren(
                as,
                'SupplementalProperty'
            );
            const switchingDescriptor = supplementalProperties.find(
                (sp) =>
                    getAttr(sp, 'schemeIdUri') ===
                    'urn:mpeg:dash:adaptation-set-switching:2016'
            );

            if (!switchingDescriptor) return 'skip';

            const allAdaptationSetIdsInPeriod = new Set(
                findChildren(period, 'AdaptationSet')
                    .map((a) => getAttr(a, 'id'))
                    .filter(Boolean)
            );

            const referencedIds = (
                getAttr(switchingDescriptor, 'value') || ''
            ).split(',');
            if (referencedIds.length === 0) return true;

            return referencedIds.every((id) =>
                allAdaptationSetIdsInPeriod.has(id.trim())
            );
        },
        passDetails: 'OK',
        failDetails:
            'One or more AdaptationSet IDs referenced in the switching descriptor do not exist in this Period.',
    },
    {
        id: 'AS-4',
        text: 'Audio AdaptationSet should specify @audioSamplingRate',
        isoRef: 'Clause 5.3.7.2, Table 14',
        severity: 'warn',
        scope: 'AdaptationSet',
        profiles: ['common'],
        category: 'General Best Practices',
        check: (as) => {
            const isAudio =
                getAttr(as, 'contentType') === 'audio' ||
                (getAttr(as, 'mimeType') || '').startsWith('audio/');
            if (!isAudio) return 'skip';

            // Check AS level
            if (getAttr(as, 'audioSamplingRate')) return true;

            // Check ALL representations
            const reps = findChildren(as, 'Representation');
            if (reps.length === 0) return true; // Empty AS

            return reps.every((r) => getAttr(r, 'audioSamplingRate'));
        },
        passDetails: 'OK',
        failDetails:
            'Audio AdaptationSets should declare @audioSamplingRate either at the AdaptationSet level or on every Representation to assist with initial selection.',
    },
];