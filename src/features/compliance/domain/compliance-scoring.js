/**
 * @typedef {import('@/types').ComplianceResult} ComplianceResult
 */

const CATEGORY_WEIGHTS = {
    'Manifest Structure': 1.0,
    'Live Stream Properties': 1.0,
    'Low-Latency HLS': 1.2,
    Encryption: 1.0,
    'Segment & Timing Info': 1.0,
    'Profile Conformance': 0.8,
    Interoperability: 0.8,
    'Variables & Steering': 0.9,
    'General Best Practices': 0.5,
};

/**
 * Calculates a compliance score and strict status.
 * @param {ComplianceResult[]} results
 */
export function calculateComplianceScore(results) {
    if (!results || results.length === 0) {
        return {
            totalScore: 100,
            label: 'PASS',
            categories: [],
            summary: { errors: 0, warnings: 0, info: 0 },
        };
    }

    let totalPenalty = 0;
    const categoryStats = {};

    Object.keys(CATEGORY_WEIGHTS).forEach((cat) => {
        categoryStats[cat] = {
            name: cat,
            score: 100,
            issues: 0,
            errors: 0,
            warnings: 0,
            infos: 0,
            penalty: 0,
        };
    });

    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    results.forEach((r) => {
        const cat = r.category || 'Manifest Structure';
        if (!categoryStats[cat]) {
            categoryStats[cat] = {
                name: cat,
                score: 100,
                issues: 0,
                errors: 0,
                warnings: 0,
                infos: 0,
                penalty: 0,
            };
        }

        let penalty = 0;
        if (r.status === 'fail') {
            penalty = 15;
            errorCount++;
            categoryStats[cat].errors++;
        } else if (r.status === 'warn') {
            penalty = 5;
            warningCount++;
            categoryStats[cat].warnings++;
        } else if (r.status === 'info') {
            infoCount++;
            categoryStats[cat].infos++;
        }

        const weight = CATEGORY_WEIGHTS[cat] || 1.0;
        const weightedPenalty = penalty * weight;

        categoryStats[cat].penalty += weightedPenalty;
        categoryStats[cat].issues++;
        totalPenalty += weightedPenalty;
    });

    Object.values(categoryStats).forEach((cat) => {
        cat.score = Math.max(0, 100 - cat.penalty);
    });

    const totalScore = Math.max(0, 100 - totalPenalty);

    // Strict Status Logic
    let label = 'PASS';
    if (errorCount > 0) {
        label = 'FAIL';
    } else if (warningCount > 0) {
        label = 'WARNING';
    }

    const categories = Object.values(categoryStats)
        .filter((c) => c.issues > 0 || c.score < 100)
        .sort((a, b) => a.score - b.score);

    return {
        totalScore: Math.round(totalScore),
        label,
        categories,
        summary: {
            errors: errorCount,
            warnings: warningCount,
            info: infoCount,
        },
    };
}