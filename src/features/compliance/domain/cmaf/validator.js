import { cmafTrackRules } from './rules.js';
import { compareBoxes } from './utils.js';
import { validateCmafProfiles } from './profile-validator.js';

// Configuration for CMAF Switching Set validation based on ISO/IEC 23000-19:2020(E), Table 11.
// The `stsd` check now ignores child sample entries like `avc1` because fields like resolution are allowed to differ.
const SWITCHING_SET_BOX_CHECKS = [
    { box: 'ftyp', ignore: [] },
    { box: 'mvhd', ignore: ['creation_time', 'modification_time'] },
    {
        box: 'tkhd',
        ignore: ['creation_time', 'modification_time', 'width', 'height'],
    },
    { box: 'trex', ignore: [] },
    { box: 'elst', ignore: [] },
    { box: 'mdhd', ignore: ['creation_time', 'modification_time'] },
    { box: 'mehd', ignore: [] },
    { box: 'hdlr', ignore: [] },
    { box: 'vmhd', ignore: [] },
    { box: 'smhd', ignore: [] },
    { box: 'sthd', ignore: [] },
    { box: 'dref', ignore: [] },
    {
        box: 'stsd',
        ignore: ['size'],
        childBoxesToIgnore: ['avc1', 'hvc1', 'hev1'],
    },
    { box: 'pssh', ignore: [] },
    { box: 'sinf', ignore: [] },
    { box: 'tenc', ignore: [] },
];

/**
 * Performs CMAF conformance checks on a single track using pre-fetched segment data.
 * @param {object} initData - The parsed initialization segment data.
 * @param {object} mediaData - The parsed media segment data.
 * @returns {Array<object>} An array of validation results.
 */
export function validateCmafTrack(initData, mediaData) {
    const ftyp = initData?.boxes?.find((b) => b.type === 'ftyp');
    const cmafBrands = ftyp?.details?.cmafBrands?.value?.split(', ') || [];

    if (!cmafBrands.includes('cmfc')) {
        return [
            {
                id: 'CMAF-BRAND',
                text: 'CMAF Brand Presence',
                status: 'fail',
                details:
                    'The structural brand "cmfc" was not found in the initialization segment\'s ftyp box. This is not a CMAF track.',
            },
        ];
    }

    const brandResult = {
        id: 'CMAF-BRAND',
        text: 'CMAF Brand Presence',
        status: 'pass',
        details: `Structural brand "cmfc" found. Detected CMAF brands: ${cmafBrands.join(
            ', '
        )}`,
    };

    const trackRuleResults = cmafTrackRules
        .map((rule) => rule(initData, mediaData))
        .filter(Boolean);
    const profileRuleResults = validateCmafProfiles(cmafBrands, initData);

    return [brandResult, ...trackRuleResults, ...profileRuleResults];
}

const findBoxRecursive = (boxes, type) => {
    if (!boxes) return null;
    for (const box of boxes) {
        if (box.type === type) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, type);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Performs CMAF Switching Set validation on a stream.
 * @param {import('@/types.ts').Stream} stream
 * @param {(url: string, range: string | null) => Promise<object>} segmentFetcher - A function to fetch and parse a segment by URL and optional range.
 * @param {{resolveBaseUrl: Function, findInitSegmentUrl: Function}} parsingUtils - Necessary parsing utilities.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of validation results.
 */
export async function validateCmafSwitchingSets(
    stream,
    segmentFetcher,
    parsingUtils
) {
    const { resolveBaseUrl, findInitSegmentUrl } = parsingUtils;
    const results = [];
    const manifestElement = stream.manifest.serializedManifest;

    for (const [periodIndex, period] of stream.manifest.periods.entries()) {
        for (const [asIndex, as] of period.adaptationSets.entries()) {
            const setId =
                as.id ||
                `${as.contentType || `type_${asIndex}`}-${
                    period.id || `period_${periodIndex}`
                }`;
            if (as.representations.length <= 1) {
                results.push({
                    id: `SS-VALID-${setId}`,
                    text: `Switching Set: ${setId}`,
                    status: 'pass',
                    details: 'OK (Single Representation)',
                });
                continue;
            }

            try {
                const initSegmentInfos = as.representations.map((rep) => {
                    const resolvedBaseUrl = resolveBaseUrl(
                        stream.baseUrl,
                        manifestElement,
                        period.serializedManifest,
                        as.serializedManifest,
                        rep.serializedManifest
                    );
                    return findInitSegmentUrl(rep, as, period, resolvedBaseUrl);
                });

                const parsedInitSegments = await Promise.all(
                    initSegmentInfos.map((info) =>
                        info
                            ? segmentFetcher(info.url, info.range)
                            : Promise.resolve(null)
                    )
                );

                const baseInitData = parsedInitSegments[0];
                if (!baseInitData?.data?.boxes) {
                    throw new Error(
                        'Could not parse initialization segment for baseline representation.'
                    );
                }

                let allSetsMatch = true;
                const differences = [];

                for (let i = 1; i < parsedInitSegments.length; i++) {
                    const currentRepId = as.representations[i].id;
                    const currentInitData = parsedInitSegments[i];
                    if (!currentInitData?.data?.boxes) {
                        allSetsMatch = false;
                        differences.push(
                            `[Rep ${currentRepId}]: Failed to parse initialization segment.`
                        );
                        continue;
                    }

                    for (const check of SWITCHING_SET_BOX_CHECKS) {
                        const boxA = findBoxRecursive(
                            baseInitData.data.boxes,
                            check.box
                        );
                        const boxB = findBoxRecursive(
                            currentInitData.data.boxes,
                            check.box
                        );

                        if (!boxA && !boxB) continue;
                        if (!boxA || !boxB) {
                            allSetsMatch = false;
                            differences.push(
                                `[Rep ${currentRepId}]: Box '${check.box}' presence mismatch.`
                            );
                            continue;
                        }

                        const comparison = compareBoxes(
                            boxA,
                            boxB,
                            check.ignore,
                            check.childBoxesToIgnore
                        );
                        if (!comparison.areEqual) {
                            allSetsMatch = false;
                            differences.push(
                                ...comparison.differences.map(
                                    (d) => `[Rep ${currentRepId}] ${d}`
                                )
                            );
                        }
                    }
                }

                if (allSetsMatch) {
                    results.push({
                        id: `SS-VALID-${setId}`,
                        text: `Switching Set: ${setId}`,
                        status: 'pass',
                        details:
                            'All tracks have compatible headers according to CMAF Table 11.',
                    });
                } else {
                    results.push({
                        id: `SS-VALID-${setId}`,
                        text: `Switching Set: ${setId}`,
                        status: 'fail',
                        details: `Inconsistencies found: ${differences.join(
                            '; '
                        )}`,
                    });
                }
            } catch (e) {
                results.push({
                    id: `SS-VALID-${setId}`,
                    text: `Switching Set: ${setId}`,
                    status: 'fail',
                    details: `Error during validation: ${e.message}`,
                });
            }
        }
    }
    return results;
}
