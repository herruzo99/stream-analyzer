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
 * @param {object} [context={}] - Additional context for the checks, including standardVersion or manifestProfiles.
 * @returns {Array<object>} An array of check result objects, now including location data.
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
                    location: { startLine: 1, endLine: 1 },
                },
            ];
        }

        const standardVersion = context.standardVersion || 13; // Default to latest
        const applicableRules = hlsRules.filter(
            (rule) => rule.version <= standardVersion
        );
        const results = [];
        const isLive = manifestIR.type === 'dynamic';
        const version = manifestIR.hls?.version || 1;
        const targetDuration = manifestIR.hls?.targetDuration || null;
        const hlsContext = {
            isLive,
            version,
            targetDuration,
            hlsParsed: manifestIR, // Pass IR for context
            standardVersion, // Pass the selected standard version
            ...context,
        };

        const runRule = (rule, element, scopeText = '') => {
            const result = rule.check(element, hlsContext);
            if (result !== 'skip') {
                const status = result ? 'pass' : rule.severity;
                const location = {
                    startLine:
                        element.extinfLineNumber || element.lineNumber || 1,
                    endLine: element.uriLineNumber || element.lineNumber || 1,
                };
                results.push({
                    id: rule.id,
                    text: `${rule.text} ${scopeText}`,
                    status,
                    details: result ? rule.passDetails : rule.failDetails,
                    isoRef: rule.isoRef,
                    category: rule.category,
                    location,
                });
            }
        };

        const playlistScopes = ['Playlist'];
        if (manifestIR.isMaster) {
            playlistScopes.push('MasterPlaylist');
        } else {
            playlistScopes.push('MediaPlaylist');
        }
        applicableRules
            .filter((rule) => playlistScopes.includes(rule.scope))
            .forEach((rule) => {
                runRule(
                    /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                        rule
                    ),
                    manifestIR
                );
            });

        if (!manifestIR.isMaster) {
            (manifestIR.segments || []).forEach((segment, index) => {
                applicableRules
                    .filter((rule) => rule.scope === 'Segment')
                    .forEach((rule) => {
                        runRule(
                            /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                rule
                            ),
                            segment,
                            `(Segment ${index + 1})`
                        );
                    });
            });

            (manifestIR.tags || [])
                .filter((t) => t.name === 'EXT-X-KEY')
                .forEach((keyTag, index) => {
                    const key = {
                        ...keyTag.value,
                        lineNumber: keyTag.lineNumber,
                    };
                    applicableRules
                        .filter((rule) => rule.scope === 'Key')
                        .forEach((rule) => {
                            runRule(
                                /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                    rule
                                ),
                                key,
                                `(Key ${index + 1}, Method: ${key.METHOD})`
                            );
                        });
                });
        }

        if (manifestIR.isMaster) {
            (manifestIR.variants || []).forEach((variant, index) => {
                applicableRules
                    .filter((rule) => rule.scope === 'Variant')
                    .forEach((rule) => {
                        runRule(
                            /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                rule
                            ),
                            variant,
                            `(Variant Stream ${
                                index + 1
                            }, BW: ${variant.attributes?.BANDWIDTH || 'N/A'})`
                        );
                    });
            });

            (manifestIR.tags || [])
                .filter((t) => t.name === 'EXT-X-I-FRAME-STREAM-INF')
                .forEach((iframeTag, index) => {
                    const iframeStream = {
                        ...iframeTag.value,
                        lineNumber: iframeTag.lineNumber,
                    };
                    applicableRules
                        .filter((rule) => rule.scope === 'IframeVariant')
                        .forEach((rule) => {
                            runRule(
                                /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                    rule
                                ),
                                iframeStream,
                                `(I-Frame Stream ${index + 1}, BW: ${
                                    iframeStream?.BANDWIDTH || 'N/A'
                                })`
                            );
                        });
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
                mediaGroups[type][groupId].push({
                    ...mediaTag.value,
                    lineNumber: mediaTag.lineNumber,
                });
            });

            Object.values(mediaGroups).forEach((typeGroups) => {
                Object.values(typeGroups).forEach((group, index) => {
                    applicableRules
                        .filter((rule) => rule.scope === 'MediaGroup')
                        .forEach((rule) => {
                            runRule(
                                /** @type {import('../../protocols/manifest/hls/compliance-rules.js').HlsRule} */ (
                                    rule
                                ),
                                group,
                                `(Media Group ${index + 1}, ID: ${
                                    group[0]?.['GROUP-ID'] || 'N/A'
                                }, Type: ${group[0]?.TYPE || 'N/A'})`
                            );
                        });
                });
            });
        }
        return results;
    }

    // DASH logic
    const mpd = /** @type {object} */ (manifest);
    const rootPath = 'MPD[0]';

    if (!mpd || typeof mpd[':@'] !== 'object') {
        const rootCheck = dashRules.find((r) => r.id === 'MPD-1');
        return [
            {
                text: rootCheck.text,
                status: rootCheck.severity,
                details: rootCheck.failDetails,
                isoRef: rootCheck.isoRef,
                category: rootCheck.category,
                location: { path: rootPath },
            },
        ];
    }

    // Extract profiles from the manifest
    const manifestProfilesString = (getAttr(mpd, 'profiles') || '')
        .toLowerCase()
        .replace(/urn:mpeg:dash:profile:/g, '')
        .replace(/:20\d\d/g, ''); // Normalize profile strings
    const manifestProfiles = new Set(
        manifestProfilesString.split(',').map((p) => p.trim()).filter(Boolean)
    );
    if (manifestProfiles.size === 0) {
        manifestProfiles.add('common'); // Fallback to common if no profiles declared
    }

    const results = [];
    const isDynamic = getAttr(mpd, 'type') === 'dynamic';
    const dashContext = { isDynamic, profiles: Array.from(manifestProfiles) }; // Pass manifestProfiles in context as an array

    const getDetails = (detail, element, detailContext) => {
        return typeof detail === 'function'
            ? detail(element, detailContext)
            : detail;
    };

    dashRules
        .filter((rule) => {
            // A rule applies if it's a 'common' rule OR if its profiles array
            // overlaps with the profiles declared in the manifest.
            if (rule.profiles.includes('common')) return true;
            return rule.profiles.some((p) =>
                manifestProfiles.has(
                    p
                        .toLowerCase()
                        .replace(/urn:mpeg:dash:profile:/g, '')
                        .replace(/:20\d\d/g, '')
                )
            );
        })
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
                    location: { path: rootPath },
                });
            }
        });

    findChildren(mpd, 'Period').forEach((period, periodIndex) => {
        const periodPath = `${rootPath}.Period[${periodIndex}]`;
        const allRepIdsInPeriod = new Set(
            findChildrenRecursive(period, 'Representation')
                .map((r) => getAttr(r, 'id'))
                .filter(Boolean)
        );
        const periodContext = { ...dashContext, allRepIdsInPeriod, period };

        dashRules
            .filter((rule) => {
                if (rule.profiles.includes('common')) return true;
                return rule.profiles.some((p) =>
                    manifestProfiles.has(
                        p
                            .toLowerCase()
                            .replace(/urn:mpeg:dash:profile:/g, '')
                            .replace(/:20\d\d/g, '')
                    )
                );
            })
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
                        location: { path: periodPath },
                    });
                }
            });

        findChildren(period, 'AdaptationSet').forEach((as, asIndex) => {
            const asPath = `${periodPath}.AdaptationSet[${asIndex}]`;
            const asContext = { ...periodContext, adaptationSet: as };
            dashRules
                .filter((rule) => {
                    if (rule.profiles.includes('common')) return true;
                    return rule.profiles.some((p) =>
                        manifestProfiles.has(
                            p
                                .toLowerCase()
                                .replace(/urn:mpeg:dash:profile:/g, '')
                                .replace(/:20\d\d/g, '')
                        )
                    );
                })
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
                            location: { path: asPath },
                        });
                    }
                });

            findChildren(as, 'Representation').forEach((rep, repIndex) => {
                const repPath = `${asPath}.Representation[${repIndex}]`;
                const repContext = { ...asContext, representation: rep };
                dashRules
                    .filter((rule) => {
                        if (rule.profiles.includes('common')) return true;
                        return rule.profiles.some((p) =>
                            manifestProfiles.has(
                                p
                                    .toLowerCase()
                                    .replace(/urn:mpeg:dash:profile:/g, '')
                                    .replace(/:20\d\d/g, '')
                            )
                        );
                    })
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
                                location: { path: repPath },
                            });
                        }
                    });
            });
        });
    });

    return results;
}