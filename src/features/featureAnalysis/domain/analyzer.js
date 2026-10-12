import { analyzeDashFeatures } from '@/infrastructure/parsing/dash/feature-analyzer';
import { dashFeatureDefinitions } from '@/infrastructure/parsing/dash/feature-definitions';
import { analyzeHlsFeatures } from '@/infrastructure/parsing/hls/feature-analyzer';
import { hlsFeatureDefinitions } from '@/infrastructure/parsing/hls/feature-definitions';

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
    // Hardened: callers pass raw store data. Anything malformed yields
    // an empty (but shaped) model instead of throwing mid-render.
    const results =
        analysisResultsMap instanceof Map ? analysisResultsMap : new Map();
    const version = Number(standardVersion);

    let applicableDefinitions;

    if (protocol === 'hls') {
        const cutoff = Number.isFinite(version) ? version : 0;
        applicableDefinitions = hlsFeatureDefinitions.filter(
            (def) => Number(def.version) <= cutoff
        );
    } else if (protocol === 'dash') {
        applicableDefinitions = dashFeatureDefinitions;
    } else {
        applicableDefinitions = [];
    }

    let totalWeightedScore = 0;
    let maxPossibleScore = 0;

    const features = applicableDefinitions.map((def) => {
        const raw = results.get(def.name);
        const result =
            raw && typeof raw === 'object'
                ? raw
                : { used: false, details: 'Not detected in manifest.' };

        // @ts-ignore - dynamic property access on definition
        const weight = Number(def.complexityScore) || 1;
        maxPossibleScore += weight;
        if (result.used === true) {
            totalWeightedScore += weight;
        }

        return {
            ...def,
            ...result,
            used: result.used === true,
            details:
                typeof result.details === 'string'
                    ? result.details
                    : 'Not detected in manifest.',
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
