import { findChild, findChildren, getAttr } from '../recursive-parser.js';

/** @typedef {import('./index.js').Rule} Rule */

/** @type {Rule[]} */
export const liveRules = [
    {
        id: 'MPDPATCH-1',
        text: 'PatchLocation requires MPD@id and @publishTime',
        isoRef: 'Clause 5.15.2',
        severity: 'fail',
        scope: 'MPD',
        profiles: ['isoff-live:2011', 'cmaf:2019'],
        category: 'Live Stream Properties',
        check: (mpd) => {
            if (!findChild(mpd, 'PatchLocation')) return 'skip';
            return (
                getAttr(mpd, 'id') !== undefined &&
                getAttr(mpd, 'publishTime') !== undefined
            );
        },
        passDetails: 'OK',
        failDetails:
            'When <PatchLocation> is present, the <MPD> element must have both an @id and a @publishTime attribute.',
    },
    {
        id: 'LIVE-1',
        text: 'Dynamic MPD has @availabilityStartTime',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        profiles: ['isoff-live:2011', 'cmaf:2019', 'mp2t-main:2011'],
        category: 'Live Stream Properties',
        check: (mpd, { isDynamic }) =>
            isDynamic
                ? getAttr(mpd, 'availabilityStartTime') !== undefined
                : 'skip',
        passDetails: 'OK',
        failDetails: 'Required for dynamic MPDs.',
    },
    {
        id: 'LIVE-2',
        text: 'Dynamic MPD has @publishTime',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'fail',
        scope: 'MPD',
        profiles: ['isoff-live:2011', 'cmaf:2019', 'mp2t-main:2011'],
        category: 'Live Stream Properties',
        check: (mpd, { isDynamic }) =>
            isDynamic ? getAttr(mpd, 'publishTime') !== undefined : 'skip',
        passDetails: 'OK',
        failDetails: 'Required for dynamic MPDs.',
    },
    {
        id: 'LIVE-3',
        text: 'Dynamic MPD has @minimumUpdatePeriod',
        isoRef: 'Clause 5.3.1.2, Table 3',
        severity: 'warn',
        scope: 'MPD',
        profiles: ['isoff-live:2011', 'cmaf:2019', 'mp2t-main:2011'],
        category: 'Live Stream Properties',
        check: (mpd, { isDynamic }) =>
            isDynamic
                ? getAttr(mpd, 'minimumUpdatePeriod') !== undefined
                : 'skip',
        passDetails: 'OK',
        failDetails: 'Recommended for dynamic MPDs to signal update frequency.',
    },
    {
        id: 'LIVE-4',
        text: 'Dynamic MPD should contain a UTCTiming element',
        isoRef: 'Clause 5.8.4.11',
        severity: 'warn',
        scope: 'MPD',
        profiles: ['common'],
        category: 'Live Stream Properties',
        check: (mpd, { isDynamic }) => {
            if (!isDynamic) return 'skip';
            return findChildren(mpd, 'UTCTiming').length > 0;
        },
        passDetails: 'OK',
        failDetails:
            'Recommended for dynamic MPDs to provide a clock synchronization source for clients.',
    },
    {
        id: 'PERIOD-1',
        text: 'Dynamic Period has @id',
        isoRef: 'Clause 5.3.2.2, Table 4',
        severity: 'fail',
        scope: 'Period',
        profiles: ['isoff-live:2011', 'cmaf:2019', 'mp2t-main:2011'],
        category: 'Live Stream Properties',
        check: (period, { isDynamic }) =>
            isDynamic ? getAttr(period, 'id') !== undefined : 'skip',
        passDetails: 'OK',
        failDetails: (period) =>
            `Period (start="${getAttr(period, 'start')}") requires an @id in dynamic manifests.`,
    },
    {
        id: 'LL-1',
        text: 'Latency element requires target attribute',
        isoRef: 'Annex K.3.2.2',
        severity: 'fail',
        scope: 'AdaptationSet',
        profiles: ['isoff-live:2011', 'cmaf:2019'],
        category: 'Live Stream Properties',
        check: (as) => {
            const serviceDescription = findChild(as, 'ServiceDescription');
            if (!serviceDescription) return 'skip';
            const latency = findChild(serviceDescription, 'Latency');
            if (!latency) return 'skip';
            return getAttr(latency, 'target') !== undefined;
        },
        passDetails: 'OK',
        failDetails: 'The <Latency> element must have a @target attribute.',
    },
    {
        id: 'LL-2',
        text: 'Latency values should be logically consistent',
        isoRef: 'Annex K.3.2.2',
        severity: 'warn',
        scope: 'MPD', // Can also be on Period, but MPD level covers all cases
        profiles: ['isoff-live:2011', 'cmaf:2019'],
        category: 'Live Stream Properties',
        check: (mpd) => {
            const serviceDescriptions = findChildren(mpd, 'ServiceDescription');
            if (serviceDescriptions.length === 0) return 'skip';

            for (const sd of serviceDescriptions) {
                const latency = findChild(sd, 'Latency');
                if (latency) {
                    const min = getAttr(latency, 'min');
                    const max = getAttr(latency, 'max');
                    const target = getAttr(latency, 'target');

                    if (min !== undefined && target !== undefined && min > target)
                        return false;
                    if (target !== undefined && max !== undefined && target > max)
                        return false;
                    if (min !== undefined && max !== undefined && min > max)
                        return false;
                }
            }
            return true;
        },
        passDetails: 'OK',
        failDetails:
            'Inconsistent latency values found. The logical order is @min <= @target <= @max.',
    },
];