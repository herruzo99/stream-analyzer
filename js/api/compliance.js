import { rules } from './rules.js';

/**
 * Runs a set of predefined compliance checks against a parsed MPD.
 * @param {Element} mpd - The root MPD element to check.
 * @returns {Array<object>} An array of check result objects.
 */
export function runChecks(mpd) {
    if (!mpd) {
        // Handle case where MPD parsing failed entirely
        const rootCheck = rules.find((r) => r.id === 'MPD-1');
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
    const isDynamic = mpd.getAttribute('type') === 'dynamic';
    const profiles = (mpd.getAttribute('profiles') || '').toLowerCase();
    const context = { isDynamic, profiles };

    /**
     * Safely gets the detail string, whether it's a raw string or a function that returns a string.
     * @param {string | ((element: Element, context: object) => string)} detail
     * @param {Element} element
     * @param {object} detailContext
     * @returns {string}
     */
    const getDetails = (detail, element, detailContext) => {
        return typeof detail === 'function'
            ? detail(element, detailContext)
            : detail;
    };

    // --- Execute MPD-scoped rules ---
    rules
        .filter((rule) => rule.scope === 'MPD')
        .forEach((rule) => {
            const result = rule.check(mpd, context);
            if (result !== 'skip') {
                const status = result ? 'pass' : rule.severity;
                results.push({
                    text: rule.text,
                    status: status,
                    details: getDetails(
                        result ? rule.passDetails : rule.failDetails,
                        mpd,
                        context
                    ),
                    isoRef: rule.isoRef,
                    category: rule.category,
                });
            }
        });

    // --- Execute Period-scoped rules ---
    mpd.querySelectorAll('Period').forEach((period) => {
        const allRepIdsInPeriod = new Set(
            Array.from(period.querySelectorAll('Representation'))
                .map((r) => r.getAttribute('id'))
                .filter(Boolean)
        );
        const periodContext = { ...context, allRepIdsInPeriod };

        rules
            .filter((rule) => rule.scope === 'Period')
            .forEach((rule) => {
                const result = rule.check(period, periodContext);
                if (result !== 'skip') {
                    const status = result ? 'pass' : rule.severity;
                    results.push({
                        text: `${rule.text} (Period: ${period.getAttribute('id') || 'N/A'})`,
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

        // --- Execute AdaptationSet-scoped rules ---
        period.querySelectorAll('AdaptationSet').forEach((as) => {
            rules
                .filter((rule) => rule.scope === 'AdaptationSet')
                .forEach((rule) => {
                    const result = rule.check(as, periodContext);
                    if (result !== 'skip') {
                        const status = result ? 'pass' : rule.severity;
                        results.push({
                            text: `${rule.text} (AdaptationSet: ${as.getAttribute('id') || 'N/A'})`,
                            status: status,
                            details: getDetails(
                                result ? rule.passDetails : rule.failDetails,
                                as,
                                periodContext
                            ),
                            isoRef: rule.isoRef,
                            category: rule.category,
                        });
                    }
                });

            // --- Execute Representation-scoped rules ---
            as.querySelectorAll('Representation').forEach((rep) => {
                rules
                    .filter((rule) => rule.scope === 'Representation')
                    .forEach((rule) => {
                        const result = rule.check(rep, periodContext);
                        if (result !== 'skip') {
                            const status = result ? 'pass' : rule.severity;
                            results.push({
                                text: `${rule.text} (Representation: ${rep.getAttribute('id') || 'N/A'})`,
                                status: status,
                                details: getDetails(
                                    result
                                        ? rule.passDetails
                                        : rule.failDetails,
                                    rep,
                                    periodContext
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
