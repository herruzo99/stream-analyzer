import { dashFeatureDefinitions } from '../../protocols/manifest/dash/feature-definitions.js';
import { hlsFeatureDefinitions } from '../../protocols/manifest/hls/feature-definitions.js';
import { analyzeDashFeatures } from '../../protocols/manifest/dash/feature-analyzer.js';
import { analyzeHlsFeatures } from '../../protocols/manifest/hls/feature-analyzer.js';

/**
 * Analyzes a manifest for feature usage.
 * @param {import('../../core/types.js').Manifest} manifestIR - The manifest IR object.
 * @param {'dash' | 'hls'} protocol
 * @param {object | null} serializedManifest - The serialized DOM object for DASH.
 * @returns {Record<string, import('../../protocols/manifest/dash/feature-analyzer.js').FeatureCheckResult>} A map of feature names to their analysis results.
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
 * @param {Map<string, import('../../core/types.js').FeatureAnalysisResult>} analysisResultsMap
 * @param {'dash' | 'hls'} protocol
 * @returns {object[]} A list of feature objects ready for rendering.
 */
export function createFeatureViewModel(analysisResultsMap, protocol) {
    const definitions =
        protocol === 'dash' ? dashFeatureDefinitions : hlsFeatureDefinitions;

    return definitions.map((def) => {
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
