import { dashFeatureDefinitions } from '@/infrastructure/parsing/dash/feature-definitions';
import { hlsFeatureDefinitions } from '@/infrastructure/parsing/hls/feature-definitions';
import { analyzeDashFeatures } from '@/infrastructure/parsing/dash/feature-analyzer';
import { analyzeHlsFeatures } from '@/infrastructure/parsing/hls/feature-analyzer';

/**
 * Analyzes a manifest for feature usage.
 * @param {import('@/types.ts').Manifest} manifestIR - The manifest IR object.
 * @param {'dash' | 'hls'} protocol
 * @param {object | null} serializedManifest - The serialized DOM object for DASH.
 * @returns {Record<string, import('@/infrastructure/parsing/dash/feature-analyzer').FeatureCheckResult>} A map of feature names to their analysis results.
 */
export function generateFeatureAnalysis(
    manifestIR,
    protocol,
    serializedManifest = null
) {
    if (protocol === 'dash') {
        return analyzeDashFeatures(serializedManifest);
    } else {
        return analyzeHlsFeatures(manifestIR);
    }
}

/**
 * Creates the view model by merging feature definitions with analysis results.
 * Calculates a "Complexity Score" based on weighted features.
 * @param {Map<string, import('@/types.ts').FeatureAnalysisResult>} analysisResultsMap
 * @param {'dash' | 'hls'} protocol
 * @param {number} standardVersion - The target standard version to filter features against (for HLS).
 * @returns {{features: object[], score: number, maxScore: number, scoreLabel: string}}
 */
export function createFeatureViewModel(
    analysisResultsMap,
    protocol,
    standardVersion
) {
    let applicableDefinitions;

    if (protocol === 'hls') {
        applicableDefinitions = hlsFeatureDefinitions.filter(
            (def) => def.version <= standardVersion
        );
    } else {
        applicableDefinitions = dashFeatureDefinitions;
    }

    let totalWeightedScore = 0;
    let maxPossibleScore = 0;

    const features = applicableDefinitions.map((def) => {
        const result = analysisResultsMap.get(def.name) || {
            used: false,
            details: 'Not detected in manifest.',
        };

        // @ts-ignore - dynamic property access on definition
        const weight = def.complexityScore || 1;
        maxPossibleScore += weight;
        if (result.used) {
            totalWeightedScore += weight;
        }

        return {
            ...def,
            ...result,
        };
    });

    const normalizedScore =
        maxPossibleScore > 0
            ? Math.round((totalWeightedScore / maxPossibleScore) * 100)
            : 0;

    let scoreLabel = 'Basic';
    if (normalizedScore > 75) scoreLabel = 'Advanced';
    else if (normalizedScore > 40) scoreLabel = 'Intermediate';

    return {
        features,
        score: normalizedScore,
        maxScore: 100,
        scoreLabel,
    };
}
