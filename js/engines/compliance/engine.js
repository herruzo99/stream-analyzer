import { rules as dashRules } from '../../protocols/manifest/dash/compliance-rules.js';
import { rules as hlsRules } from '../../protocols/manifest/hls/compliance-rules.js';
import {
    findChildren,
    getAttr,
    findChildrenRecursive,
} from '../../protocols/manifest/dash/recursive-parser.js';

/**
 * Runs a set of predefined compliance checks against a manifest.
 * @param {object} manifest - The raw manifest element (DASH) or the manifest IR (HLS).
 * @param {'dash' | 'hls'} protocol - The protocol of the manifest.
 * @param {object} [context={}] - Additional context for the checks.
 * @returns {Array<object>} An array of check result objects.
 */
export function runChecks(manifest, protocol, context = {}) {
    if (protocol === 'hls') {
        const manifestIR = manifest; // For HLS, we now pass the IR directly.
        if (!manifestIR || typeof manifestIR.isMaster !== 'boolean') {
            return [
                {
                    text: 'HLS Playlist must be a valid object',
                    status: 'fail',
                    details: 'The HLS parser did not return a valid object.',
                    isoRef: 'N/A',
                    category: 'HLS Structure',
                },
            ];
        }

        const results = [];
        const isLive = manifestIR.type === 'dynamic';
        const version = manifestIR.hls?.version || 1;
        const targetDuration = manifestIR.hls?.targetDuration || null;
        const hlsContext = {
            isLive,
            version,
            targetDuration,
            hlsParsed: manifestIR, // Pass IR for context
            ...context,
        };

        /**
         * Helper to run a single rule and add its result.
         * @param {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} rule
         * @param {object} element
         * @param {string} scopeText
         */
        const runRule = (rule, element, scopeText = '') => {
            const result = rule.check(element, hlsContext);
            if (result !== 'skip') {
                const status = result ? 'pass' : rule.severity;
                results.push({
                    id: rule.id,
                    text: `${rule.text} ${scopeText}`,
                    status,
                    details: result ? rule.passDetails : rule.failDetails,
                    isoRef: rule.isoRef,
                    category: rule.category,
                });
            }
        };

        const playlistScopes = ['Playlist'];
        if (manifestIR.isMaster) {
            playlistScopes.push('MasterPlaylist');
        } else {
            playlistScopes.push('MediaPlaylist');
        }
        hlsRules
            .filter((rule) => playlistScopes.includes(rule.scope))
            .forEach((rule) =>
                runRule(
                    /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                        rule
                    ),
                    manifestIR
                )
            );

        if (!manifestIR.isMaster) {
            (manifestIR.segments || []).forEach((segment, index) => {
                hlsRules
                    .filter((rule) => rule.scope === 'Segment')
                    .forEach((rule) =>
                        runRule(
                            /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                rule
                            ),
                            segment,
                            `(Segment ${index + 1})`
                        )
                    );
            });

            (manifestIR.tags || [])
                .filter((t) => t.name === 'EXT-X-KEY')
                .forEach((keyTag, index) => {
                    const key = {
                        METHOD: keyTag.value.METHOD,
                        URI: keyTag.value.URI,
                        IV: keyTag.value.IV,
                        KEYFORMAT: keyTag.value.KEYFORMAT,
                        KEYFORMATVERSIONS: keyTag.value.KEYFORMATVERSIONS,
                    };
                    hlsRules
                        .filter((rule) => rule.scope === 'Key')
                        .forEach((rule) =>
                            runRule(
                                /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                    rule
                                ),
                                key,
                                `(Key ${index + 1}, Method: ${key.METHOD})`
                            )
                        );
                });
        }

        if (manifestIR.isMaster) {
            (manifestIR.variants || []).forEach((variant, index) => {
                hlsRules
                    .filter((rule) => rule.scope === 'Variant')
                    .forEach((rule) =>
                        runRule(
                            /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                rule
                            ),
                            variant,
                            `(Variant Stream ${
                                index + 1
                            }, BW: ${variant.attributes?.BANDWIDTH || 'N/A'})`
                        )
                    );
            });

            (manifestIR.tags || [])
                .filter((t) => t.name === 'EXT-X-I-FRAME-STREAM-INF')
                .forEach((iframeTag, index) => {
                    const iframeStream = iframeTag.value;
                    hlsRules
                        .filter((rule) => rule.scope === 'IframeVariant')
                        .forEach((rule) =>
                            runRule(
                                /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                    rule
                                ),
                                iframeStream,
                                `(I-Frame Stream ${index + 1}, BW: ${
                                    iframeStream?.BANDWIDTH || 'N/A'
                                })`
                            )
                        );
                });

            const mediaGroups = {};
            (
                manifestIR.tags.filter((t) => t.name === 'EXT-X-MEDIA') || []
            ).forEach((mediaTag) => {
                const groupId = mediaTag.value['GROUP-ID'];
                const type = mediaTag.value.TYPE;
                if (!mediaGroups[type]) mediaGroups[type] = {};
                if (!mediaGroups[type][groupId])
                    mediaGroups[type][groupId] = [];
                mediaGroups[type][groupId].push(mediaTag.value);
            });

            Object.values(mediaGroups).forEach((typeGroups) => {
                Object.values(typeGroups).forEach((group, index) => {
                    hlsRules
                        .filter((rule) => rule.scope === 'MediaGroup')
                        .forEach((rule) =>
                            runRule(
                                /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                    rule
                                ),
                                group,
                                `(Media Group ${index + 1}, ID: ${
                                    group[0]?.['GROUP-ID'] || 'N/A'
                                }, Type: ${group[0]?.TYPE || 'N/A'})`
                            )
                        );
                });
            });
        }

        return results;
    }

    const mpd = /** @type {object} */ (manifest);

    if (!mpd || typeof mpd[':@'] !== 'object') {
        const rootCheck = dashRules.find((r) => r.id === 'MPD-1');
        return [
            {
                text: rootCheck.text,
                status: rootCheck.severity,
                details: rootCheck.failDetails,
                isoRef: rootCheck.isoRef,
                category: rootCheck.category,
            },
        ];
    }

    const results = [];
    const isDynamic = getAttr(mpd, 'type') === 'dynamic';
    const profiles = (getAttr(mpd, 'profiles') || '').toLowerCase();
    const dashContext = { isDynamic, profiles };

    const getDetails = (detail, element, detailContext) => {
        return typeof detail === 'function'
            ? detail(element, detailContext)
            : detail;
    };

    dashRules
        .filter((rule) => rule.scope === 'MPD')
        .forEach((rule) => {
            const result = rule.check(mpd, dashContext);
            if (result !== 'skip') {
                const status = result ? 'pass' : rule.severity;
                results.push({
                    id: rule.id,
                    text: rule.text,
                    status: status,
                    details: getDetails(
                        result ? rule.passDetails : rule.failDetails,
                        mpd,
                        dashContext
                    ),
                    isoRef: rule.isoRef,
                    category: rule.category,
                });
            }
        });

    findChildren(mpd, 'Period').forEach((period) => {
        const allRepIdsInPeriod = new Set(
            findChildrenRecursive(period, 'Representation')
                .map((r) => getAttr(r, 'id'))
                .filter(Boolean)
        );
        const periodContext = { ...dashContext, allRepIdsInPeriod, period };

        dashRules
            .filter((rule) => rule.scope === 'Period')
            .forEach((rule) => {
                const result = rule.check(period, periodContext);
                if (result !== 'skip') {
                    const status = result ? 'pass' : rule.severity;
                    results.push({
                        id: rule.id,
                        text: `${rule.text} (Period: ${
                            getAttr(period, 'id') || 'N/A'
                        })`,
                        status: status,
                        details: getDetails(
                            result ? rule.passDetails : rule.failDetails,
                            period,
                            periodContext
                        ),
                        isoRef: rule.isoRef,
                        category: rule.category,
                    });
                }
            });

        findChildren(period, 'AdaptationSet').forEach((as) => {
            const asContext = { ...periodContext, adaptationSet: as };
            dashRules
                .filter((rule) => rule.scope === 'AdaptationSet')
                .forEach((rule) => {
                    const result = rule.check(as, asContext);
                    if (result !== 'skip') {
                        const status = result ? 'pass' : rule.severity;
                        results.push({
                            id: rule.id,
                            text: `${rule.text} (AdaptationSet: ${
                                getAttr(as, 'id') || 'N/A'
                            })`,
                            status: status,
                            details: getDetails(
                                result ? rule.passDetails : rule.failDetails,
                                as,
                                asContext
                            ),
                            isoRef: rule.isoRef,
                            category: rule.category,
                        });
                    }
                });

            findChildren(as, 'Representation').forEach((rep) => {
                const repContext = { ...asContext, representation: rep };
                dashRules
                    .filter((rule) => rule.scope === 'Representation')
                    .forEach((rule) => {
                        const result = rule.check(rep, repContext);
                        if (result !== 'skip') {
                            const status = result ? 'pass' : rule.severity;
                            results.push({
                                id: rule.id,
                                text: `${rule.text} (Representation: ${
                                    getAttr(rep, 'id') || 'N/A'
                                })`,
                                status: status,
                                details: getDetails(
                                    result
                                        ? rule.passDetails
                                        : rule.failDetails,
                                    rep,
                                    repContext
                                ),
                                isoRef: rule.isoRef,
                                category: rule.category,
                            });
                        }
                    });
            });
        });
    });

    return results;
}