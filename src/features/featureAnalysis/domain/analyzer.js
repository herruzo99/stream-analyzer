import { dashFeatureDefinitions } from '@/infrastructure/parsing/dash/feature-definitions.js';
import { hlsFeatureDefinitions } from '@/infrastructure/parsing/hls/feature-definitions.js';
import { analyzeDashFeatures } from '@/infrastructure/parsing/dash/feature-analyzer.js';
import { analyzeHlsFeatures } from '@/infrastructure/parsing/hls/feature-analyzer.js';

/**
 * Analyzes a manifest for feature usage.
 * @param {import('@/types.ts').Manifest} manifestIR - The manifest IR object.
 * @param {'dash' | 'hls'} protocol
 * @param {object | null} serializedManifest - The serialized DOM object for DASH.
 * @returns {Record<string, import('@/infrastructure/parsing/dash/feature-analyzer.js').FeatureCheckResult>} A map of feature names to their analysis results.
 */
export function generateFeatureAnalysis(
    manifestIR,
    protocol,
    serializedManifest = null
) {
    if (protocol === 'dash') {
        return analyzeDashFeatures(serializedManifest);
    } else {
        return analyzeHlsFeatures(manifestIR); // HLS analyzer operates on the IR
    }
}

/**
 * Creates the view model by merging feature definitions with analysis results.
 * @param {Map<string, import('@/types.ts').FeatureAnalysisResult>} analysisResultsMap
 * @param {'dash' | 'hls'} protocol
 * @param {number} standardVersion - The target standard version to filter features against (for HLS).
 * @returns {object[]} A list of feature objects ready for rendering.
 */
export function createFeatureViewModel(
    analysisResultsMap,
    protocol,
    standardVersion
) {
    let applicableDefinitions;

    if (protocol === 'hls') {
        // HLS features are filtered by the selected HLS version.
        applicableDefinitions = hlsFeatureDefinitions.filter(
            (def) => def.version <= standardVersion
        );
    } else {
        // DASH features are considered generally applicable if present.
        // No version filtering is applied to DASH features here as profiles
        // implicitly define feature sets, and this view is for 'what is used'.
        applicableDefinitions = dashFeatureDefinitions;
    }

    return applicableDefinitions.map((def) => {
        const result = analysisResultsMap.get(def.name) || {
            used: false,
            details: 'Not detected in manifest.',
        };
        return {
            ...def,
            ...result,
        };
    });
}
