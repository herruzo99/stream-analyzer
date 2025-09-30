import { analysisState } from '../../core/state.js';
import { eventBus } from '../../core/event-bus.js';
import { cmafTrackRules } from './rules.js';
import { compareBoxes } from './utils.js';
import { parseAllSegmentUrls } from '../../protocols/manifest/dash/segment-parser.js';
import { validateCmafProfiles } from './profile-validator.js';
import {
    findChild,
    getAttr,
} from '../../protocols/manifest/dash/recursive-parser.js';

// Configuration for CMAF Switching Set validation based on ISO/IEC 23000-19:2020(E), Table 11.
const SWITCHING_SET_BOX_CHECKS = [
    { box: 'ftyp', ignore: [] }, // Should be identical except for media profile brands, which we'll check separately.
    { box: 'mvhd', ignore: ['creation_time', 'modification_time'] },
    {
        box: 'tkhd',
        ignore: ['creation_time', 'modification_time', 'width', 'height'],
    },
    { box: 'trex', ignore: [] },
    { box: 'elst', ignore: [] }, // Should be identical except for specific video cases not handled here.
    { box: 'mdhd', ignore: ['creation_time', 'modification_time'] },
    { box: 'mehd', ignore: [] },
    { box: 'hdlr', ignore: [] },
    { box: 'vmhd', ignore: [] },
    { box: 'smhd', ignore: [] },
    { box: 'sthd', ignore: [] },
    { box: 'dref', ignore: [] },
    { box: 'stsd', ignore: ['codingname'], childBoxesToIgnore: ['avcC'] }, // Ignore avcC content for now
    { box: 'pssh', ignore: [] },
    { box: 'sinf', ignore: [] },
    { box: 'tenc', ignore: [] }, // Should be identical except IV values, which aren't in the header.
];

/**
 * Robustly retrieves a parsed segment, interacting with the central segment cache and service.
 * @param {string} url The URL of the segment to retrieve.
 * @returns {Promise<object>} A promise that resolves with the parsed segment data.
 */
export function getParsedSegment(url) {
    const cachedEntry = analysisState.segmentCache.get(url);
    if (cachedEntry && cachedEntry.status !== -1 && cachedEntry.parsedData) {
        if (cachedEntry.parsedData.error) {
            return Promise.reject(new Error(cachedEntry.parsedData.error));
        }
        return Promise.resolve(cachedEntry.parsedData);
    }

    return new Promise((resolve, reject) => {
        const onSegmentLoaded = ({ url: loadedUrl, entry }) => {
            if (loadedUrl === url) {
                unsubscribe(); // CRITICAL: prevent memory leaks
                if (entry.status !== 200) {
                    reject(new Error(`HTTP ${entry.status} for ${url}`));
                } else if (entry.parsedData?.error) {
                    reject(new Error(entry.parsedData.error));
                } else {
                    resolve(entry.parsedData);
                }
            }
        };

        const unsubscribe = eventBus.subscribe(
            'segment:loaded',
            onSegmentLoaded
        );

        // Only dispatch a new fetch if one isn't already pending.
        if (!cachedEntry || cachedEntry.status !== -1) {
            eventBus.dispatch('segment:fetch', { url });
        }
    });
}

export function findInitSegmentUrl(
    representation,
    adaptationSet,
    period,
    baseUrl
) {
    const repElement = representation.rawElement;
    if (!repElement) return null;

    const template =
        findChild(repElement, 'SegmentTemplate') ||
        findChild(adaptationSet.rawElement, 'SegmentTemplate') ||
        findChild(period.rawElement, 'SegmentTemplate');

    if (template && getAttr(template, 'initialization')) {
        return new URL(
            getAttr(template, 'initialization').replace(
                /\$RepresentationID\$/g,
                representation.id
            ),
            baseUrl
        ).href;
    }

    const segmentBase = findChild(repElement, 'SegmentBase');
    const initialization = segmentBase
        ? findChild(segmentBase, 'Initialization')
        : null;
    if (initialization && getAttr(initialization, 'sourceURL')) {
        return new URL(getAttr(initialization, 'sourceURL'), baseUrl).href;
    }

    // Fallback for single-file representations
    const baseURL = findChild(repElement, 'BaseURL');
    if (baseURL) {
        return new URL(baseURL.children[0].content, baseUrl).href;
    }

    return null;
}

export async function validateCmafTrack(stream) {
    if (stream.protocol !== 'dash') {
        return [
            {
                id: 'CMAF-META',
                text: 'CMAF Conformance',
                status: 'info',
                details:
                    'CMAF validation is currently only supported for DASH manifests.',
            },
        ];
    }

    const period = stream.manifest?.periods[0];
    const adaptationSet = period?.adaptationSets[0];
    const representation = adaptationSet?.representations[0];

    if (!representation || !adaptationSet || !period) {
        return [
            {
                id: 'CMAF-META',
                text: 'CMAF Conformance',
                status: 'fail',
                details: 'No representations found to validate.',
            },
        ];
    }

    const segmentsByRep = parseAllSegmentUrls(
        stream.manifest.rawElement,
        stream.baseUrl
    );
    const repSegments = segmentsByRep[representation.id];

    const initSegmentUrl = findInitSegmentUrl(
        representation,
        adaptationSet,
        period,
        stream.baseUrl
    );
    const firstMediaSegment = repSegments?.find((s) => s.type === 'Media');

    if (!initSegmentUrl || !firstMediaSegment?.resolvedUrl) {
        return [
            {
                id: 'CMAF-META',
                text: 'CMAF Conformance',
                status: 'fail',
                details:
                    'Could not determine initialization or media segment URL for validation.',
            },
        ];
    }

    try {
        const [initData, mediaData] = await Promise.all([
            getParsedSegment(initSegmentUrl),
            getParsedSegment(firstMediaSegment.resolvedUrl),
        ]);

        const ftyp = initData?.data?.boxes?.find((b) => b.type === 'ftyp');
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
        const trackRuleResults = cmafTrackRules.map((rule) =>
            rule(initData.data, mediaData.data)
        );
        const profileRuleResults = validateCmafProfiles(
            cmafBrands,
            initData.data
        );

        return [brandResult, ...trackRuleResults, ...profileRuleResults].filter(
            Boolean
        );
    } catch (e) {
        return [
            {
                id: 'CMAF-META',
                text: 'CMAF Conformance',
                status: 'fail',
                details: `Failed to fetch or parse segments for validation: ${e.message}`,
            },
        ];
    }
}

const findBoxRecursive = (boxes, type) => {
    for (const box of boxes) {
        if (box.type === type) return box;
        if (box.children?.length > 0) {
            const found = findBoxRecursive(box.children, type);
            if (found) return found;
        }
    }
    return null;
};

export async function validateCmafSwitchingSets(stream) {
    const results = [];
    if (stream.protocol !== 'dash') {
        return results;
    }

    for (const period of stream.manifest.periods) {
        for (const as of period.adaptationSets) {
            const setId = as.id || `${as.contentType}-${period.id}`;
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
                const initSegmentUrls = as.representations.map((rep) =>
                    findInitSegmentUrl(rep, as, period, stream.baseUrl)
                );
                const parsedInitSegments = await Promise.all(
                    initSegmentUrls.map((url) =>
                        url ? getParsedSegment(url) : Promise.resolve(null)
                    )
                );

                const baseInitData = parsedInitSegments[0]?.data;
                if (!baseInitData) {
                    results.push({
                        id: `SS-VALID-${setId}`,
                        text: `Switching Set: ${setId}`,
                        status: 'fail',
                        details:
                            'Could not parse initialization segment for baseline representation.',
                    });
                    continue;
                }

                let allSetsMatch = true;
                const differences = [];

                for (let i = 1; i < parsedInitSegments.length; i++) {
                    const currentRepId = as.representations[i].id;
                    const currentInitData = parsedInitSegments[i]?.data;
                    if (!currentInitData) {
                        allSetsMatch = false;
                        differences.push(
                            `[Rep ${currentRepId}]: Failed to parse initialization segment.`
                        );
                        continue;
                    }

                    for (const check of SWITCHING_SET_BOX_CHECKS) {
                        const boxA = findBoxRecursive(
                            baseInitData.boxes,
                            check.box
                        );
                        const boxB = findBoxRecursive(
                            currentInitData.boxes,
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
                // Separate check for avcC boxes, which are expected to differ.
                const baseAvcC = findBoxRecursive(baseInitData.boxes, 'avcC');
                let avcCDiffers = false;
                for (let i = 1; i < parsedInitSegments.length; i++) {
                    const currentInitData = parsedInitSegments[i]?.data;
                    if (!currentInitData) continue;
                    const currentAvcC = findBoxRecursive(
                        currentInitData.boxes,
                        'avcC'
                    );
                    if (baseAvcC && currentAvcC) {
                        const avcCComparison = compareBoxes(
                            baseAvcC,
                            currentAvcC
                        );
                        if (!avcCComparison.areEqual) {
                            avcCDiffers = true;
                            break;
                        }
                    } else if (baseAvcC || currentAvcC) {
                        avcCDiffers = true; // Presence mismatch
                        break;
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
                        details: `Inconsistencies found: ${differences.join('; ')}`,
                    });
                }

                if (avcCDiffers) {
                    results.push({
                        id: `SS-AVCC-${setId}`,
                        text: `Switching Set: ${setId} (avcC)`,
                        status: 'warn',
                        details:
                            'AVC Configuration (`avcC`) boxes differ across Representations. This is common due to resolution-specific SPS/PPS data but is a deviation from strict CMAF switching set rules.',
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
